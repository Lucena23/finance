"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const plan_constants_1 = require("./plan.constants");
const plan_required_exception_1 = require("./plan-required.exception");
const plan_service_1 = require("./plan.service");
describe('PlanService & computePlanStatus (Freemium v1.2)', () => {
    const now = new Date('2026-10-15T12:00:00.000Z');
    describe('computePlanStatus (função pura)', () => {
        it('retorna TRIAL quando trialEndsAt está no futuro', () => {
            const trialEndsAt = new Date(now.getTime() + 10 * plan_constants_1.DAY_MS);
            const res = (0, plan_service_1.computePlanStatus)({ trialEndsAt, premiumEndsAt: null }, now, 3);
            expect(res.status).toBe('TRIAL');
            expect(res.hasPremiumAccess).toBe(true);
            expect(res.daysLeft).toBe(10);
        });
        it('retorna PREMIUM quando premiumEndsAt está no futuro (mesmo com trial ativo)', () => {
            const trialEndsAt = new Date(now.getTime() + 5 * plan_constants_1.DAY_MS);
            const premiumEndsAt = new Date(now.getTime() + 30 * plan_constants_1.DAY_MS);
            const res = (0, plan_service_1.computePlanStatus)({ trialEndsAt, premiumEndsAt }, now, 3);
            expect(res.status).toBe('PREMIUM');
            expect(res.hasPremiumAccess).toBe(true);
            expect(res.daysLeft).toBe(30);
        });
        it('retorna GRACE dentro dos 3 dias de tolerância após o fim do teste', () => {
            const trialEndsAt = new Date(now.getTime() - 1 * plan_constants_1.DAY_MS);
            const res = (0, plan_service_1.computePlanStatus)({ trialEndsAt, premiumEndsAt: null }, now, 3);
            expect(res.status).toBe('GRACE');
            expect(res.hasPremiumAccess).toBe(true);
            expect(res.daysLeft).toBe(2);
        });
        it('retorna FREE após o fim da tolerância', () => {
            const trialEndsAt = new Date(now.getTime() - 5 * plan_constants_1.DAY_MS);
            const res = (0, plan_service_1.computePlanStatus)({ trialEndsAt, premiumEndsAt: null }, now, 3);
            expect(res.status).toBe('FREE');
            expect(res.hasPremiumAccess).toBe(false);
            expect(res.daysLeft).toBeNull();
        });
    });
    describe('Janela de meses Free (mês atual + próximo)', () => {
        it('libera mês atual e próximo (inclusive na virada de Dezembro → Janeiro)', () => {
            const decDate = new Date('2026-12-10T15:00:00.000Z');
            const allowed = (0, plan_service_1.freeAllowedPeriods)(decDate);
            expect(allowed).toEqual([
                { month: 12, year: 2026 },
                { month: 1, year: 2027 },
            ]);
            expect((0, plan_service_1.isPeriodAllowedForFree)({ month: 12, year: 2026 }, decDate)).toBe(true);
            expect((0, plan_service_1.isPeriodAllowedForFree)({ month: 1, year: 2027 }, decDate)).toBe(true);
            expect((0, plan_service_1.isPeriodAllowedForFree)({ month: 11, year: 2026 }, decDate)).toBe(false);
            expect((0, plan_service_1.isPeriodAllowedForFree)({ month: 2, year: 2027 }, decDate)).toBe(false);
        });
    });
    describe('PlanService regras de bloqueio e administração', () => {
        let service;
        let prismaMock;
        let configMock;
        beforeEach(() => {
            prismaMock = {
                familyAccount: {
                    findUnique: jest.fn(),
                    update: jest.fn(),
                },
                category: {
                    count: jest.fn(),
                },
                paymentItem: {
                    aggregate: jest.fn(),
                },
            };
            configMock = {
                get: jest.fn(() => undefined),
            };
            service = new plan_service_1.PlanService(prismaMock, configMock);
        });
        it('usa padrão 15 dias de teste, 3 dias de tolerância e 5 categorias no Free', () => {
            expect(service.trialDays).toBe(15);
            expect(service.graceDays).toBe(3);
            expect(service.freeMaxCategories).toBe(5);
        });
        it('bloqueia criação da 6ª categoria no Free com PlanRequiredException (402)', async () => {
            prismaMock.familyAccount.findUnique.mockResolvedValue({
                trialEndsAt: new Date(Date.now() - 10 * plan_constants_1.DAY_MS),
                premiumEndsAt: null,
                billingCycle: null,
            });
            prismaMock.category.count.mockResolvedValue(5);
            await expect(service.assertCanCreateCategory('fam-1')).rejects.toThrow(plan_required_exception_1.PlanRequiredException);
        });
        it('permite criar 6ª categoria quando Premium está ativo', async () => {
            prismaMock.familyAccount.findUnique.mockResolvedValue({
                trialEndsAt: new Date(Date.now() + 10 * plan_constants_1.DAY_MS),
                premiumEndsAt: null,
                billingCycle: null,
            });
            prismaMock.category.count.mockResolvedValue(12);
            await expect(service.assertCanCreateCategory('fam-1')).resolves.toBeUndefined();
        });
        it('bloqueia acesso a meses passados no Free com 402 MONTH_HISTORY', async () => {
            prismaMock.familyAccount.findUnique.mockResolvedValue({
                trialEndsAt: new Date(Date.now() - 10 * plan_constants_1.DAY_MS),
                premiumEndsAt: null,
                billingCycle: null,
            });
            await expect(service.assertMonthAccess('fam-1', 1, 2025)).rejects.toMatchObject({
                response: expect.objectContaining({
                    code: 'PLAN_REQUIRED',
                    feature: plan_constants_1.PremiumFeature.MONTH_HISTORY,
                }),
            });
        });
        it('retorna resumo bloqueado (quantidade e soma) sem expor itens', async () => {
            prismaMock.paymentItem.aggregate.mockResolvedValue({
                _count: { _all: 4 },
                _sum: { expectedAmount: 123000 },
            });
            const summary = await service.getLockedMonthSummary('fam-1', 8, 2026);
            expect(summary).toEqual({
                month: 8,
                year: 2026,
                count: 4,
                totalAmount: 123000,
            });
        });
        it('grantPremium ativa o plano e define isTrialOfferEligible=false', async () => {
            prismaMock.familyAccount.findUnique
                .mockResolvedValueOnce({
                trialEndsAt: null,
                premiumEndsAt: null,
                billingCycle: null,
            })
                .mockResolvedValueOnce({
                trialEndsAt: null,
                premiumEndsAt: new Date(Date.now() + 365 * plan_constants_1.DAY_MS),
                billingCycle: client_1.BillingCycle.ANNUAL,
            });
            prismaMock.familyAccount.update.mockResolvedValue({});
            const info = await service.grantPremium('fam-1', client_1.BillingCycle.ANNUAL);
            expect(info.status).toBe('PREMIUM');
            expect(info.hasPremiumAccess).toBe(true);
            expect(info.isTrialOfferEligible).toBe(false);
        });
    });
});
//# sourceMappingURL=plan.service.spec.js.map