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
var NotificationPriorityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPriorityService = exports.NotificationPriority = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const webpush = __importStar(require("web-push"));
const prisma_service_1 = require("../prisma/prisma.service");
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["P1"] = "P1";
    NotificationPriority["P2"] = "P2";
    NotificationPriority["P3"] = "P3";
    NotificationPriority["SILENT"] = "SILENT";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
const MS_PER_DAY = 24 * 60 * 60 * 1000;
function buildAdvisorMessage(overdueCount, todayCount, upcomingCount) {
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
        const message = todayCount === 1
            ? 'Lembrete do dia: 1 compromisso financeiro vence hoje. Lembre-se de realizar o pagamento em dia para não perder dinheiro com juros.'
            : `Lembrete do dia: ${todayCount} compromissos financeiros vencem hoje. Lembre-se de realizar os pagamentos em dia para não perder dinheiro com juros.`;
        return {
            priority: NotificationPriority.P2,
            pendingCount: todayCount,
            message,
        };
    }
    if (overdueCount > 0) {
        const message = overdueCount === 1
            ? 'Cuidado com os juros: você tem 1 conta com vencimento em aberto. Assim que possível, atualize seu controle para proteger seu orçamento.'
            : `Cuidado com os juros: você tem ${overdueCount} contas com vencimento em aberto. Assim que possível, atualize seu controle para proteger seu orçamento.`;
        return {
            priority: NotificationPriority.P1,
            pendingCount: overdueCount,
            message,
        };
    }
    const message = upcomingCount === 1
        ? 'Planejamento financeiro: você tem 1 compromisso vencendo nos próximos dias. Organize-se com antecedência para manter suas contas em dia.'
        : `Planejamento financeiro: você tem ${upcomingCount} compromissos vencendo nos próximos dias. Organize-se com antecedência para manter suas contas em dia.`;
    return {
        priority: NotificationPriority.P3,
        pendingCount: upcomingCount,
        message,
    };
}
function matchesOverdueCadence(daysOverdue) {
    if (daysOverdue <= 0) {
        return false;
    }
    return daysOverdue === 1 || daysOverdue === 3 || daysOverdue % 7 === 0;
}
let NotificationPriorityService = NotificationPriorityService_1 = class NotificationPriorityService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(NotificationPriorityService_1.name);
        this.vapidConfigured = false;
    }
    async dispatchAll(referenceDate = new Date()) {
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
            this.logger.log(`[MODO TESTE ISOLADO] ONLY_USER_EMAIL=${onlyUserEmail} -> ${accounts.length} workspace(s) filtrado(s).`);
        }
        const results = [];
        for (const account of accounts) {
            const result = await this.dispatchForWorkspace(account.id, referenceDate, isTestMode);
            results.push(result);
        }
        return results;
    }
    async dispatchForWorkspace(familyAccountId, referenceDate = new Date(), ignoreCadence = false) {
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
        if (todayCount > 0) {
            const { priority, pendingCount, message } = buildAdvisorMessage(totalOverdue, todayCount, upcomingCount);
            return this.dispatch(familyAccountId, priority, pendingCount, message);
        }
        if (totalOverdue > 0) {
            const shouldNotifyOverdue = ignoreCadence ||
                overdueItems.some((item) => {
                    const dueUtc = this.startOfDay(item.dueDate);
                    const diffDays = Math.round((today.getTime() - dueUtc.getTime()) / MS_PER_DAY);
                    return matchesOverdueCadence(diffDays);
                });
            if (shouldNotifyOverdue) {
                const { priority, pendingCount, message } = buildAdvisorMessage(totalOverdue, 0, upcomingCount);
                return this.dispatch(familyAccountId, priority, pendingCount, message);
            }
        }
        if (upcomingCount > 0) {
            const { priority, pendingCount, message } = buildAdvisorMessage(0, 0, upcomingCount);
            return this.dispatch(familyAccountId, priority, pendingCount, message);
        }
        return {
            familyAccountId,
            priority: NotificationPriority.SILENT,
            pendingCount: 0,
            notifiedSubscriptions: 0,
            message: null,
        };
    }
    async findOverdueItems(familyAccountId, today) {
        if (typeof this.prisma.paymentItem.findMany === 'function') {
            const rows = await this.prisma.paymentItem.findMany({
                where: {
                    status: client_1.PaymentStatus.PENDING,
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
    countPending(familyAccountId, dueDateFilter) {
        return this.prisma.paymentItem.count({
            where: {
                status: client_1.PaymentStatus.PENDING,
                ...dueDateFilter,
                expense: {
                    familyAccountId,
                    deletedAt: null,
                },
            },
        });
    }
    async dispatch(familyAccountId, priority, pendingCount, message) {
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
                await webpush.sendNotification({
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: subscription.p256dh,
                        auth: subscription.auth,
                    },
                }, payload);
                notified += 1;
            }
            catch (error) {
                if (this.isGoneError(error)) {
                    await this.prisma.pushSubscription.delete({
                        where: { id: subscription.id },
                    });
                    this.logger.warn(`Subscription expirada removida (workspace=${familyAccountId}).`);
                }
                else {
                    this.logger.error(`Falha ao enviar push (workspace=${familyAccountId}): ${this.describeError(error)}`);
                }
            }
        }
        this.logger.log(`Push disparado [${priority}] workspace=${familyAccountId} pendências=${pendingCount} subscriptions=${notified}`);
        return {
            familyAccountId,
            priority,
            pendingCount,
            notifiedSubscriptions: notified,
            message,
        };
    }
    ensureVapidConfigured() {
        if (this.vapidConfigured) {
            return;
        }
        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        const subject = process.env.VAPID_SUBJECT;
        if (!publicKey || !privateKey || !subject) {
            throw new Error('Chaves VAPID ausentes. Defina VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT no .env.');
        }
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.vapidConfigured = true;
    }
    isGoneError(error) {
        if (typeof error === 'object' && error !== null && 'statusCode' in error) {
            const statusCode = error.statusCode;
            return statusCode === 404 || statusCode === 410;
        }
        return false;
    }
    describeError(error) {
        if (error instanceof Error) {
            return error.message;
        }
        return String(error);
    }
    startOfDay(date) {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
    addDays(date, days) {
        const result = new Date(date);
        result.setUTCDate(result.getUTCDate() + days);
        return result;
    }
};
exports.NotificationPriorityService = NotificationPriorityService;
exports.NotificationPriorityService = NotificationPriorityService = NotificationPriorityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationPriorityService);
//# sourceMappingURL=notification-priority.service.js.map