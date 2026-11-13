import { randomUUID } from 'node:crypto';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';

import { PrismaService } from '../prisma/prisma.service';

export interface SystemAnnouncement {
  id: string;
  title: string;
  body: string;
  version: string | null;
  pushSentCount: number;
  createdAt: Date;
}

export interface NotificationPreferences {
  systemUpdates: boolean;
}

export interface PublishAnnouncementResult {
  announcement: SystemAnnouncement;
  pushSentCount: number;
  pushFailedCount: number;
}

/**
 * AnnouncementService — Comunicados oficiais de atualização do sistema (v1.3.1).
 *
 * - Persiste comunicados em `system_announcements` (exibidos uma vez no app).
 * - Persiste a preferência "Novidades do Sistema" em `notification_preferences`
 *   (ligada por padrão: ausência de registro = recebe).
 * - Dispara Web Push apenas para usuários que não desativaram a preferência.
 *
 * Tabelas criadas de forma ADITIVA e idempotente (`CREATE TABLE IF NOT EXISTS`),
 * sem alterar nenhuma tabela existente.
 */
@Injectable()
export class AnnouncementService implements OnModuleInit {
  private readonly logger = new Logger(AnnouncementService.name);
  private tablesEnsured = false;
  private vapidConfigured = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureTables();
  }

  async ensureTables(): Promise<void> {
    if (this.tablesEnsured) return;
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`system_announcements\` (
          \`id\` VARCHAR(36) NOT NULL,
          \`title\` VARCHAR(120) NOT NULL,
          \`body\` TEXT NOT NULL,
          \`version\` VARCHAR(20) NULL,
          \`pushSentCount\` INT NOT NULL DEFAULT 0,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          INDEX \`idx_sys_ann_created\` (\`createdAt\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`notification_preferences\` (
          \`userId\` VARCHAR(36) NOT NULL,
          \`systemUpdates\` TINYINT(1) NOT NULL DEFAULT 1,
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`userId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      this.tablesEnsured = true;
    } catch (err) {
      this.logger.warn(
        `Aviso ao verificar tabelas de comunicados: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // ─── Preferências do usuário ─────────────────────────────────────────

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    await this.ensureTables();
    const rows = await this.prisma.$queryRaw<Array<{ systemUpdates: number }>>`
      SELECT systemUpdates FROM notification_preferences WHERE userId = ${userId} LIMIT 1
    `;
    const row = rows[0];
    return { systemUpdates: row ? Number(row.systemUpdates) === 1 : true };
  }

  async updatePreferences(
    userId: string,
    prefs: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    await this.ensureTables();
    const value = prefs.systemUpdates ? 1 : 0;
    await this.prisma.$executeRaw`
      INSERT INTO notification_preferences (userId, systemUpdates, updatedAt)
      VALUES (${userId}, ${value}, NOW(3))
      ON DUPLICATE KEY UPDATE systemUpdates = ${value}, updatedAt = NOW(3)
    `;
    return { systemUpdates: prefs.systemUpdates };
  }

  // ─── Comunicados ─────────────────────────────────────────────────────

  async getLatest(): Promise<SystemAnnouncement | null> {
    await this.ensureTables();
    const rows = await this.prisma.$queryRaw<SystemAnnouncement[]>`
      SELECT id, title, body, version, pushSentCount, createdAt
      FROM system_announcements
      ORDER BY createdAt DESC
      LIMIT 1
    `;
    return rows[0] ? this.normalize(rows[0]) : null;
  }

  async list(limit = 30): Promise<SystemAnnouncement[]> {
    await this.ensureTables();
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const rows = await this.prisma.$queryRaw<SystemAnnouncement[]>`
      SELECT id, title, body, version, pushSentCount, createdAt
      FROM system_announcements
      ORDER BY createdAt DESC
      LIMIT ${safeLimit}
    `;
    return rows.map((r) => this.normalize(r));
  }

  /**
   * Publica um comunicado e (opcionalmente) dispara Web Push para todos os
   * usuários com a preferência "Novidades do Sistema" ativa.
   */
  async publish(input: {
    title: string;
    body: string;
    version?: string;
    sendPush: boolean;
  }): Promise<PublishAnnouncementResult> {
    await this.ensureTables();
    const id = randomUUID();
    const version = input.version?.trim() || null;

    await this.prisma.$executeRaw`
      INSERT INTO system_announcements (id, title, body, version, pushSentCount, createdAt)
      VALUES (${id}, ${input.title}, ${input.body}, ${version}, 0, NOW(3))
    `;

    let sent = 0;
    let failed = 0;
    if (input.sendPush) {
      const result = await this.broadcastPush(input.title, input.body);
      sent = result.sent;
      failed = result.failed;
      await this.prisma.$executeRaw`
        UPDATE system_announcements SET pushSentCount = ${sent} WHERE id = ${id}
      `;
    }

    this.logger.log(
      `Comunicado publicado (id=${id}, push enviados=${sent}, falhas=${failed}).`,
    );

    const announcement = await this.getById(id);
    return {
      announcement: announcement ?? {
        id,
        title: input.title,
        body: input.body,
        version,
        pushSentCount: sent,
        createdAt: new Date(),
      },
      pushSentCount: sent,
      pushFailedCount: failed,
    };
  }

  private async broadcastPush(
    title: string,
    body: string,
  ): Promise<{ sent: number; failed: number }> {
    if (!this.ensureVapidConfigured()) {
      return { sent: 0, failed: 0 };
    }

    const subscriptions = await this.prisma.$queryRaw<
      Array<{ id: string; endpoint: string; p256dh: string; auth: string }>
    >`
      SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
      FROM push_subscriptions ps
      LEFT JOIN notification_preferences np ON np.userId = ps.userId
      WHERE np.userId IS NULL OR np.systemUpdates = 1
    `;

    const payload = JSON.stringify({
      title,
      body,
      data: { url: '/queue?novidades=1' },
    });

    let sent = 0;
    let failed = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? (error as { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await this.prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => undefined);
        }
      }
    }
    return { sent, failed };
  }

  private ensureVapidConfigured(): boolean {
    if (this.vapidConfigured) return true;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) {
      this.logger.warn('Chaves VAPID ausentes: comunicado salvo sem envio de push.');
      return false;
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.vapidConfigured = true;
    return true;
  }

  private async getById(id: string): Promise<SystemAnnouncement | null> {
    const rows = await this.prisma.$queryRaw<SystemAnnouncement[]>`
      SELECT id, title, body, version, pushSentCount, createdAt
      FROM system_announcements WHERE id = ${id} LIMIT 1
    `;
    return rows[0] ? this.normalize(rows[0]) : null;
  }

  private normalize(row: SystemAnnouncement): SystemAnnouncement {
    return {
      ...row,
      pushSentCount: Number(row.pushSentCount),
      createdAt: new Date(row.createdAt),
    };
  }
}
