"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AnnouncementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementService = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const webpush = __importStar(require("web-push"));
const prisma_service_1 = require("../prisma/prisma.service");
let AnnouncementService = AnnouncementService_1 = class AnnouncementService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AnnouncementService_1.name);
        this.tablesEnsured = false;
        this.vapidConfigured = false;
    }
    async onModuleInit() {
        await this.ensureTables();
    }
    async ensureTables() {
        if (this.tablesEnsured)
            return;
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
        }
        catch (err) {
            this.logger.warn(`Aviso ao verificar tabelas de comunicados: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    async getPreferences(userId) {
        await this.ensureTables();
        const rows = await this.prisma.$queryRaw `
      SELECT systemUpdates FROM notification_preferences WHERE userId = ${userId} LIMIT 1
    `;
        const row = rows[0];
        return { systemUpdates: row ? Number(row.systemUpdates) === 1 : true };
    }
    async updatePreferences(userId, prefs) {
        await this.ensureTables();
        const value = prefs.systemUpdates ? 1 : 0;
        await this.prisma.$executeRaw `
      INSERT INTO notification_preferences (userId, systemUpdates, updatedAt)
      VALUES (${userId}, ${value}, NOW(3))
      ON DUPLICATE KEY UPDATE systemUpdates = ${value}, updatedAt = NOW(3)
    `;
        return { systemUpdates: prefs.systemUpdates };
    }
    async getLatest() {
        await this.ensureTables();
        const rows = await this.prisma.$queryRaw `
      SELECT id, title, body, version, pushSentCount, createdAt
      FROM system_announcements
      ORDER BY createdAt DESC
      LIMIT 1
    `;
        return rows[0] ? this.normalize(rows[0]) : null;
    }
    async list(limit = 30) {
        await this.ensureTables();
        const safeLimit = Math.min(Math.max(1, limit), 100);
        const rows = await this.prisma.$queryRaw `
      SELECT id, title, body, version, pushSentCount, createdAt
      FROM system_announcements
      ORDER BY createdAt DESC
      LIMIT ${safeLimit}
    `;
        return rows.map((r) => this.normalize(r));
    }
    async publish(input) {
        await this.ensureTables();
        const id = (0, node_crypto_1.randomUUID)();
        const version = input.version?.trim() || null;
        await this.prisma.$executeRaw `
      INSERT INTO system_announcements (id, title, body, version, pushSentCount, createdAt)
      VALUES (${id}, ${input.title}, ${input.body}, ${version}, 0, NOW(3))
    `;
        let sent = 0;
        let failed = 0;
        if (input.sendPush) {
            const result = await this.broadcastPush(input.title, input.body);
            sent = result.sent;
            failed = result.failed;
            await this.prisma.$executeRaw `
        UPDATE system_announcements SET pushSentCount = ${sent} WHERE id = ${id}
      `;
        }
        this.logger.log(`Comunicado publicado (id=${id}, push enviados=${sent}, falhas=${failed}).`);
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
    async broadcastPush(title, body) {
        if (!this.ensureVapidConfigured()) {
            return { sent: 0, failed: 0 };
        }
        const subscriptions = await this.prisma.$queryRaw `
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
                await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
                sent += 1;
            }
            catch (error) {
                failed += 1;
                const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
                    ? error.statusCode
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
    ensureVapidConfigured() {
        if (this.vapidConfigured)
            return true;
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
    async getById(id) {
        const rows = await this.prisma.$queryRaw `
      SELECT id, title, body, version, pushSentCount, createdAt
      FROM system_announcements WHERE id = ${id} LIMIT 1
    `;
        return rows[0] ? this.normalize(rows[0]) : null;
    }
    normalize(row) {
        return {
            ...row,
            pushSentCount: Number(row.pushSentCount),
            createdAt: new Date(row.createdAt),
        };
    }
};
exports.AnnouncementService = AnnouncementService;
exports.AnnouncementService = AnnouncementService = AnnouncementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnnouncementService);
//# sourceMappingURL=announcement.service.js.map