import { Injectable } from '@nestjs/common';
import { PushSubscription } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';

/**
 * NotificationService — registro e remoção de subscriptions de Web Push.
 * ARCHITECTURE §3.2 — MÓDULO NOTIFICATIONS — TAREFA 31.
 *
 * As chaves VAPID são lidas do .env pelo motor de disparo (TAREFA 32);
 * este service apenas persiste as subscriptions do navegador.
 *
 * Isolamento (RN-01 / §8.3): toda operação é restrita ao `userId` derivado
 * exclusivamente do JWT — nunca aceito como parâmetro de query/body.
 */
@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra (ou atualiza) a subscription de Web Push do usuário autenticado.
   *
   * Idempotente: o `endpoint` é único por navegador. Uma nova chamada com o
   * mesmo endpoint atualiza as chaves (p256dh/auth) em vez de duplicar o
   * registro — subscription duplicada NÃO gera erro (TAREFA 31).
   */
  async subscribe(
    userId: string,
    dto: SubscribePushDto,
  ): Promise<PushSubscription> {
    const existing = await this.prisma.pushSubscription.findFirst({
      where: { userId, endpoint: dto.endpoint },
    });

    if (existing) {
      return this.prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
        },
      });
    }

    return this.prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
    });
  }

  /**
   * Remove a subscription de Web Push do usuário autenticado pelo endpoint.
   *
   * A remoção é restrita ao `userId` do token: um usuário não pode remover
   * subscriptions de terceiros (RN-01 / §8.3). Operação idempotente — se o
   * endpoint não existir, nada é removido e nenhum erro é lançado.
   */
  async unsubscribe(userId: string, dto: UnsubscribePushDto): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint: dto.endpoint },
    });
  }
}
