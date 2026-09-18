import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import * as webpush from 'web-push';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Nível de prioridade do motor de notificações (RN-10 / §8.6).
 *  - P1: contas em atraso (crítico).
 *  - P2: contas vencendo hoje (do dia).
 *  - P3: contas vencendo nos próximos 5 dias (preventivo).
 *  - SILENT: nenhuma pendência qualificada — sem disparo.
 */
export enum NotificationPriority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  SILENT = 'SILENT',
}

/**
 * Resultado da avaliação de um workspace em uma execução do motor.
 */
export interface WorkspaceDispatchResult {
  familyAccountId: string;
  priority: NotificationPriority;
  /** Quantidade de pendências que qualificaram o disparo. */
  pendingCount: number;
  /** Quantidade de subscriptions efetivamente notificadas. */
  notifiedSubscriptions: number;
  /** Mensagem enviada (null em caso de silêncio). */
  message: string | null;
}

/**
 * Mensagens oficiais do motor de push — REGRAS §8.6 (texto exato).
 */
const PRIORITY_MESSAGES: Record<
  Exclude<NotificationPriority, NotificationPriority.SILENT>,
  string
> = {
  [NotificationPriority.P1]:
    'Você possui conta(s) pendente(s) já vencida(s). Acesse para regularizar e evitar juros.',
  [NotificationPriority.P2]:
    'Você tem conta(s) com vencimento marcado para hoje. Acesse para conferir e quitar.',
  [NotificationPriority.P3]:
    'Você tem conta(s) com vencimento nos próximos dias. Acesse para planejar seus pagamentos.',
};

/**
 * NotificationPriorityService — Motor de Web Push com hierarquia de prioridade.
 * REGRAS §8.6 / RN-10 — TAREFA 32.
 *
 * Para CADA FamilyAccount avalia as pendências na ordem P1 > P2 > P3 > Silêncio
 * e dispara NO MÁXIMO 1 notificação por workspace por execução.
 *
 * O push é enviado para TODAS as PushSubscriptions de TODOS os Users vinculados
 * à FamilyAccount (todos os membros recebem).
 *
 * Isolamento (RN-01 / §8.3): cada avaliação é estritamente escopada por
 * `familyAccountId`; nenhuma query cruza workspaces.
 */
@Injectable()
export class NotificationPriorityService {
  private readonly logger = new Logger(NotificationPriorityService.name);
  private vapidConfigured = false;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Itera sobre TODAS as FamilyAccounts ativas e dispara no máximo 1 push por
   * workspace, seguindo a hierarquia P1 → P2 → P3 → Silêncio (RN-10 / §8.6).
   *
   * @param referenceDate Data de referência (default: agora). Injetável para
   *   testes determinísticos.
   * @returns Resultado do disparo por workspace.
   */
  async dispatchAll(
    referenceDate: Date = new Date(),
  ): Promise<WorkspaceDispatchResult[]> {
    this.ensureVapidConfigured();

    const accounts = await this.prisma.familyAccount.findMany({
      select: { id: true },
    });

    const results: WorkspaceDispatchResult[] = [];

    for (const account of accounts) {
      const result = await this.dispatchForWorkspace(
        account.id,
        referenceDate,
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Avalia e dispara a notificação de um único workspace.
   * Exposto para testes unitários (TAREFA 52).
   */
  async dispatchForWorkspace(
    familyAccountId: string,
    referenceDate: Date = new Date(),
  ): Promise<WorkspaceDispatchResult> {
    const today = this.startOfDay(referenceDate);
    const tomorrow = this.addDays(today, 1);
    const inFiveDays = this.addDays(today, 5);

    // P1 — Atrasadas: dueDate < hoje.
    const overdueCount = await this.countPending(familyAccountId, {
      dueDate: { lt: today },
    });

    if (overdueCount > 0) {
      return this.dispatch(
        familyAccountId,
        NotificationPriority.P1,
        overdueCount,
      );
    }

    // P2 — Vencendo hoje: dueDate = hoje.
    const todayCount = await this.countPending(familyAccountId, {
      dueDate: { gte: today, lt: tomorrow },
    });

    if (todayCount > 0) {
      return this.dispatch(
        familyAccountId,
        NotificationPriority.P2,
        todayCount,
      );
    }

    // P3 — Próximos 5 dias: hoje+1 <= dueDate <= hoje+5.
    const upcomingCount = await this.countPending(familyAccountId, {
      dueDate: { gte: tomorrow, lte: inFiveDays },
    });

    if (upcomingCount > 0) {
      return this.dispatch(
        familyAccountId,
        NotificationPriority.P3,
        upcomingCount,
      );
    }

    // Silêncio — nenhuma condição atendida: NÃO dispara push.
    return {
      familyAccountId,
      priority: NotificationPriority.SILENT,
      pendingCount: 0,
      notifiedSubscriptions: 0,
      message: null,
    };
  }

  /**
   * Conta PaymentItems PENDING do workspace que satisfazem o filtro de dueDate.
   * PaymentItems de despesas soft-deleted são ignorados (RN-11 / §8.7).
   */
  private countPending(
    familyAccountId: string,
    dueDateFilter: { dueDate: { lt?: Date; gte?: Date; lte?: Date } },
  ): Promise<number> {
    return this.prisma.paymentItem.count({
      where: {
        status: PaymentStatus.PENDING,
        ...dueDateFilter,
        expense: {
          familyAccountId,
          deletedAt: null,
        },
      },
    });
  }

  /**
   * Envia a notificação de uma prioridade qualificada para todas as
   * subscriptions de todos os membros do workspace.
   */
  private async dispatch(
    familyAccountId: string,
    priority: Exclude<NotificationPriority, NotificationPriority.SILENT>,
    pendingCount: number,
  ): Promise<WorkspaceDispatchResult> {
    const message = PRIORITY_MESSAGES[priority];

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: {
        user: { familyAccountId },
      },
    });

    const payload = JSON.stringify({
      title: 'Finanças Aksurim',
      body: message,
      priority,
      pendingCount,
    });

    let notified = 0;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );
        notified += 1;
      } catch (error) {
        // Subscription expirada/inválida (404/410) → remove e segue.
        if (this.isGoneError(error)) {
          await this.prisma.pushSubscription.delete({
            where: { id: subscription.id },
          });
          this.logger.warn(
            `Subscription expirada removida (workspace=${familyAccountId}).`,
          );
        } else {
          this.logger.error(
            `Falha ao enviar push (workspace=${familyAccountId}): ${this.describeError(error)}`,
          );
        }
      }
    }

    this.logger.log(
      `Push disparado [${priority}] workspace=${familyAccountId} pendências=${pendingCount} subscriptions=${notified}`,
    );

    return {
      familyAccountId,
      priority,
      pendingCount,
      notifiedSubscriptions: notified,
      message,
    };
  }

  /**
   * Configura as chaves VAPID a partir do .env (uma única vez por processo).
   */
  private ensureVapidConfigured(): void {
    if (this.vapidConfigured) {
      return;
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      throw new Error(
        'Chaves VAPID ausentes. Defina VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT no .env.',
      );
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.vapidConfigured = true;
  }

  /**
   * Identifica erros de subscription expirada/inválida (HTTP 404/410).
   */
  private isGoneError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      return statusCode === 404 || statusCode === 410;
    }
    return false;
  }

  /**
   * Extrai uma mensagem legível de um erro desconhecido (sem `any`).
   */
  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Normaliza uma data para meia-noite UTC (alinhada ao tipo @db.Date).
   */
  private startOfDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  /**
   * Soma dias a uma data UTC.
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }
}
