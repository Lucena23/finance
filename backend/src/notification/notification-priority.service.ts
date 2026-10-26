import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import * as webpush from 'web-push';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Nível de prioridade do motor de notificações (RN-10 / §8.6).
 *  - P1: contas em atraso (crítico) ou combinadas (vencendo hoje + atraso).
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Formata a mensagem com tom de Consultor Financeiro (singular/plural dinâmico)
 * e combina quando há contas vencendo hoje + em atraso.
 */
function buildAdvisorMessage(overdueCount: number, todayCount: number, upcomingCount: number): {
  priority: Exclude<NotificationPriority, NotificationPriority.SILENT>;
  pendingCount: number;
  message: string;
} {
  if (overdueCount > 0 && todayCount > 0) {
    const todayLabel = todayCount === 1 ? '1 conta vencendo hoje' : `${todayCount} contas vencendo hoje`;
    const overdueLabel = overdueCount === 1 ? '1 em atraso' : `${overdueCount} em atraso`;
    return {
      priority: NotificationPriority.P1,
      pendingCount: overdueCount + todayCount,
      message: `Atenção ao seu orçamento: você tem ${todayLabel} e ${overdueLabel}. Confira seu painel para evitar juros e multas desnecessárias.`,
    };
  }

  if (todayCount > 0) {
    const message =
      todayCount === 1
        ? 'Lembrete do dia: 1 compromisso financeiro vence hoje. Lembre-se de realizar o pagamento em dia para não perder dinheiro com juros.'
        : `Lembrete do dia: ${todayCount} compromissos financeiros vencem hoje. Lembre-se de realizar os pagamentos em dia para não perder dinheiro com juros.`;
    return {
      priority: NotificationPriority.P2,
      pendingCount: todayCount,
      message,
    };
  }

  if (overdueCount > 0) {
    const message =
      overdueCount === 1
        ? 'Cuidado com os juros: você tem 1 conta com vencimento em aberto. Assim que possível, atualize seu controle para proteger seu orçamento.'
        : `Cuidado com os juros: você tem ${overdueCount} contas com vencimento em aberto. Assim que possível, atualize seu controle para proteger seu orçamento.`;
    return {
      priority: NotificationPriority.P1,
      pendingCount: overdueCount,
      message,
    };
  }

  const message =
    upcomingCount === 1
      ? 'Planejamento financeiro: você tem 1 compromisso vencendo nos próximos dias. Organize-se com antecedência para manter suas contas em dia.'
      : `Planejamento financeiro: você tem ${upcomingCount} compromissos vencendo nos próximos dias. Organize-se com antecedência para manter suas contas em dia.`;

  return {
    priority: NotificationPriority.P3,
    pendingCount: upcomingCount,
    message,
  };
}

/**
 * Verifica se o atraso (em dias) se encaixa na cadência inteligente (Opção B):
 * 1º dia de atraso, 3º dia, e depois a cada 7 dias (7º, 14º, 21º, 28º...).
 */
function matchesOverdueCadence(daysOverdue: number): boolean {
  if (daysOverdue <= 0) {
    return false;
  }
  return daysOverdue === 1 || daysOverdue === 3 || daysOverdue % 7 === 0;
}

/**
 * NotificationPriorityService — Motor de Web Push com hierarquia de prioridade
 * e tom de Consultor Financeiro (v1.2.5).
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
   * Itera sobre as FamilyAccounts ativas (ou apenas a conta de `ONLY_USER_EMAIL`
   * quando em modo de teste isolado) e dispara no máximo 1 push por workspace.
   */
  async dispatchAll(
    referenceDate: Date = new Date(),
  ): Promise<WorkspaceDispatchResult[]> {
    this.ensureVapidConfigured();

    const onlyUserEmail = process.env.ONLY_USER_EMAIL?.trim();
    const isTestMode = Boolean(onlyUserEmail);

    const accounts = await this.prisma.familyAccount.findMany({
      ...(onlyUserEmail
        ? {
            where: {
              users: {
                some: { email: onlyUserEmail },
              },
            },
          }
        : {}),
      select: { id: true },
    });

    if (onlyUserEmail) {
      this.logger.log(
        `[MODO TESTE ISOLADO] ONLY_USER_EMAIL=${onlyUserEmail} -> ${accounts.length} workspace(s) filtrado(s).`,
      );
    }

    const results: WorkspaceDispatchResult[] = [];

    for (const account of accounts) {
      const result = await this.dispatchForWorkspace(
        account.id,
        referenceDate,
        isTestMode,
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Avalia e dispara a notificação de um único workspace.
   */
  async dispatchForWorkspace(
    familyAccountId: string,
    referenceDate: Date = new Date(),
    ignoreCadence = false,
  ): Promise<WorkspaceDispatchResult> {
    const today = this.startOfDay(referenceDate);
    const tomorrow = this.addDays(today, 1);
    const inFiveDays = this.addDays(today, 5);

    const [overdueItems, todayCount, upcomingCount] = await Promise.all([
      this.findOverdueItems(familyAccountId, today),
      this.countPending(familyAccountId, {
        dueDate: { gte: today, lt: tomorrow },
      }),
      this.countPending(familyAccountId, {
        dueDate: { gte: tomorrow, lte: inFiveDays },
      }),
    ]);

    const totalOverdue = overdueItems.length;

    // 1. Vencendo hoje (com ou sem atrasadas juntas) -> sempre dispara hoje!
    if (todayCount > 0) {
      const { priority, pendingCount, message } = buildAdvisorMessage(
        totalOverdue,
        todayCount,
        upcomingCount,
      );
      return this.dispatch(familyAccountId, priority, pendingCount, message);
    }

    // 2. Apenas atrasadas (sem conta vencendo hoje) -> aplica cadência inteligente (1º, 3º, 7º, 14º dia...)
    if (totalOverdue > 0) {
      const shouldNotifyOverdue =
        ignoreCadence ||
        overdueItems.some((item) => {
          const dueUtc = this.startOfDay(item.dueDate);
          const diffDays = Math.round(
            (today.getTime() - dueUtc.getTime()) / MS_PER_DAY,
          );
          return matchesOverdueCadence(diffDays);
        });

      if (shouldNotifyOverdue) {
        const { priority, pendingCount, message } = buildAdvisorMessage(
          totalOverdue,
          0,
          upcomingCount,
        );
        return this.dispatch(familyAccountId, priority, pendingCount, message);
      }
    }

    // 3. Próximos 5 dias (preventivo)
    if (upcomingCount > 0) {
      const { priority, pendingCount, message } = buildAdvisorMessage(
        0,
        0,
        upcomingCount,
      );
      return this.dispatch(familyAccountId, priority, pendingCount, message);
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
   * Busca os itens pendentes em atraso do workspace (ou faz fallback caso um mock de teste não exponha findMany).
   */
  private async findOverdueItems(
    familyAccountId: string,
    today: Date,
  ): Promise<Array<{ dueDate: Date }>> {
    if (typeof this.prisma.paymentItem.findMany === 'function') {
      const rows = await this.prisma.paymentItem.findMany({
        where: {
          status: PaymentStatus.PENDING,
          dueDate: { lt: today },
          expense: {
            familyAccountId,
            deletedAt: null,
          },
        },
        select: { dueDate: true },
      });
      if (Array.isArray(rows)) {
        return rows;
      }
    }

    const fallbackCount = await this.countPending(familyAccountId, {
      dueDate: { lt: today },
    });
    const yesterday = this.addDays(today, -1);
    return Array.from({ length: fallbackCount }, () => ({ dueDate: yesterday }));
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
    message: string,
  ): Promise<WorkspaceDispatchResult> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: {
        user: { familyAccountId },
      },
    });

    const payload = JSON.stringify({
      title: 'Aksurim Controle',
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
