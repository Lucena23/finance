import { createHmac } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { BillingCycle, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { DAY_MS } from './plan.constants';
import { PlanPaymentService } from './plan-payment.service';
import { PlanService } from './plan.service';

describe('PlanPaymentService (Mercado Pago v1.3)', () => {
  let service: PlanPaymentService;
  let prismaMock: {
    $executeRawUnsafe: jest.Mock;
    $executeRaw: jest.Mock;
    $queryRaw: jest.Mock;
    user: { findFirst: jest.Mock };
  };
  let configValues: Record<string, string>;
  let configMock: { get: jest.Mock };
  let planServiceMock: {
    grantPremium: jest.Mock;
    revokePremium: jest.Mock;
    getPlanInfo: jest.Mock;
  };
  let mailerMock: { sendMail: jest.Mock };

  beforeEach(() => {
    prismaMock = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([]),
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          name: 'João Titular',
          email: 'joao@aksurim.com',
        }),
      },
    };

    configValues = {
      MP_ACCESS_TOKEN: 'APP_USR-test-token-123',
      MP_PUBLIC_KEY: 'APP_USR-test-pub-123',
      MP_WEBHOOK_SECRET: 'test-webhook-secret-xyz',
      PAYMENTS_ENABLED: 'true',
      PAYMENTS_ALLOWLIST_EMAILS: 'vip@aksurim.com',
    };

    configMock = {
      get: jest.fn((key: string) => configValues[key]),
    };

    planServiceMock = {
      grantPremium: jest.fn().mockResolvedValue({
        familyName: 'Família Silva',
        status: 'PREMIUM',
        hasPremiumAccess: true,
        premiumEndsAt: new Date(Date.now() + 30 * DAY_MS).toISOString(),
      }),
      revokePremium: jest.fn().mockResolvedValue({
        familyName: 'Família Silva',
        status: 'FREE',
        hasPremiumAccess: false,
        premiumEndsAt: null,
      }),
      getPlanInfo: jest.fn().mockResolvedValue({
        familyName: 'Família Silva',
        status: 'PREMIUM',
        hasPremiumAccess: true,
        premiumEndsAt: new Date(Date.now() + 20 * DAY_MS).toISOString(),
      }),
    };

    mailerMock = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };

    service = new PlanPaymentService(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService,
      planServiceMock as unknown as PlanService,
      mailerMock as unknown as MailerService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Catálogo de preços (centavos + numerologia 8)', () => {
    it('retorna os valores aprovados 1295, 6290 e 8990 centavos (todos reduzindo a 8)', () => {
      const catalog = service.getPricingCatalog();
      expect(catalog).toEqual([
        expect.objectContaining({ id: BillingCycle.MONTHLY, amountCents: 1295 }),
        expect.objectContaining({ id: BillingCycle.SEMIANNUAL, amountCents: 6290 }),
        expect.objectContaining({ id: BillingCycle.ANNUAL, amountCents: 8990 }),
      ]);

      const digitalRoot = (n: number): number => {
        let sum = n;
        while (sum > 9) {
          sum = String(sum)
            .split('')
            .reduce((acc, d) => acc + Number(d), 0);
        }
        return sum;
      };

      expect(digitalRoot(1295)).toBe(8);
      expect(digitalRoot(6290)).toBe(8);
      expect(digitalRoot(8990)).toBe(8);
    });
  });

  describe('Feature flag PAYMENTS_ENABLED + Allowlist', () => {
    it('habilita para todos quando PAYMENTS_ENABLED=true', () => {
      configValues.PAYMENTS_ENABLED = 'true';
      expect(service.isPaymentsEnabledForEmail('qualquer@email.com')).toBe(true);
    });

    it('quando PAYMENTS_ENABLED=false, habilita apenas para e-mails na allowlist', () => {
      configValues.PAYMENTS_ENABLED = 'false';
      expect(service.isPaymentsEnabledForEmail('comum@email.com')).toBe(false);
      expect(service.isPaymentsEnabledForEmail('vip@aksurim.com')).toBe(true);
    });
  });

  describe('Validação HMAC-SHA256 do Webhook (x-signature)', () => {
    it('aceita assinatura HMAC-SHA256 válida e rejeita assinatura adulterada', () => {
      const secret = 'test-webhook-secret-xyz';
      const dataId = '99887766';
      const xRequestId = 'req-abc-123';
      const ts = '1704908010';
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const v1 = createHmac('sha256', secret).update(manifest).digest('hex');

      const valid = service.validateWebhookSignature({
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId,
        dataId,
        secret,
      });
      expect(valid).toBe(true);

      const invalid = service.validateWebhookSignature({
        xSignature: `ts=${ts},v1=${'0'.repeat(64)}`,
        xRequestId,
        dataId,
        secret,
      });
      expect(invalid).toBe(false);
    });

    it('lança UnauthorizedException no handleWebhook quando x-signature é inválida', async () => {
      await expect(
        service.handleWebhook({
          xSignature: 'ts=12345,v1=invalidhash',
          xRequestId: 'req-1',
          query: { 'data.id': '555', type: 'payment' },
          body: { type: 'payment', data: { id: '555' } },
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Idempotência do Webhook de Pagamento', () => {
    it('não concede meses em duplicidade quando o mesmo pagamento aprovado chega 2x', async () => {
      const secret = configValues.MP_WEBHOOK_SECRET;
      const dataId = 'pay-100';
      const xRequestId = 'req-idemp';
      const ts = '1700000000';
      const v1 = createHmac('sha256', secret)
        .update(`id:${dataId};request-id:${xRequestId};ts:${ts};`)
        .digest('hex');

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          id: dataId,
          status: 'approved',
          external_reference: 'tx-1',
        }),
      } as Response);

      // 1ª chamada: transação estava PENDING -> aprova e chama grantPremium
      prismaMock.$queryRaw.mockResolvedValueOnce([
        {
          id: 'tx-1',
          familyAccountId: 'fam-1',
          userId: 'user-1',
          billingCycle: BillingCycle.ANNUAL,
          paymentMode: 'CHECKOUT_PRO',
          amountCents: 8990,
          status: 'PENDING',
          mpPaymentId: null,
          mpPreapprovalId: null,
          mpPreferenceId: 'pref-1',
          checkoutUrl: null,
          refundedAmountCents: null,
          refundedAt: null,
          approvedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const first = await service.handleWebhook({
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId,
        query: { 'data.id': dataId, type: 'payment' },
        body: {},
      });
      expect(first.processed).toBe(true);
      expect(planServiceMock.grantPremium).toHaveBeenCalledTimes(1);

      // 2ª chamada (repetida pelo MP): transação já está APPROVED com o mesmo mpPaymentId
      prismaMock.$queryRaw.mockResolvedValueOnce([
        {
          id: 'tx-1',
          familyAccountId: 'fam-1',
          userId: 'user-1',
          billingCycle: BillingCycle.ANNUAL,
          paymentMode: 'CHECKOUT_PRO',
          amountCents: 8990,
          status: 'APPROVED',
          mpPaymentId: dataId,
          mpPreapprovalId: null,
          mpPreferenceId: 'pref-1',
          checkoutUrl: null,
          refundedAmountCents: null,
          refundedAt: null,
          approvedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const second = await service.handleWebhook({
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId,
        query: { 'data.id': dataId, type: 'payment' },
        body: {},
      });
      expect(second).toEqual({
        received: true,
        processed: true,
        idempotent: true,
      });
      // Não deve ter chamado grantPremium novamente!
      expect(planServiceMock.grantPremium).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reembolso Automático CDC (7 dias) e Cancelamento de Renovação', () => {
    it('executa reembolso integral automático dentro de 7 dias da 1ª compra', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * DAY_MS);
      const txRow = {
        id: 'tx-cdc-1',
        familyAccountId: 'fam-1',
        userId: 'user-1',
        billingCycle: BillingCycle.MONTHLY,
        paymentMode: 'PIX_ONCE',
        amountCents: 1295,
        status: 'APPROVED',
        mpPaymentId: 'mp-pay-999',
        mpPreapprovalId: null,
        mpPreferenceId: 'pref-1',
        checkoutUrl: null,
        refundedAmountCents: null,
        refundedAt: null,
        approvedAt: twoDaysAgo,
        createdAt: twoDaysAgo,
        updatedAt: twoDaysAgo,
      };

      prismaMock.$queryRaw
        .mockResolvedValueOnce([txRow]) // getFamilySubscriptionSummary
        .mockResolvedValueOnce([txRow]); // findTransactionById

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'refund-1' }),
      } as Response);

      const res = await service.requestCdcRefund('fam-1', {
        userId: 'user-1',
        email: 'joao@aksurim.com',
        role: Role.ADMIN,
        familyAccountId: 'fam-1',
        isGlobalAdmin: false,
      });

      expect(res.refunded).toBe(true);
      expect(planServiceMock.revokePremium).toHaveBeenCalledWith('fam-1');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.mercadopago.com/v1/payments/mp-pay-999/refunds',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('bloqueia reembolso automático após 7 dias corridos', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * DAY_MS);
      prismaMock.$queryRaw.mockResolvedValueOnce([
        {
          id: 'tx-old',
          familyAccountId: 'fam-1',
          userId: 'user-1',
          billingCycle: BillingCycle.MONTHLY,
          paymentMode: 'PIX_ONCE',
          amountCents: 1295,
          status: 'APPROVED',
          mpPaymentId: 'mp-pay-old',
          mpPreapprovalId: null,
          mpPreferenceId: 'pref-1',
          checkoutUrl: null,
          refundedAmountCents: null,
          refundedAt: null,
          approvedAt: tenDaysAgo,
          createdAt: tenDaysAgo,
          updatedAt: tenDaysAgo,
        },
      ]);

      await expect(
        service.requestCdcRefund('fam-1', {
          userId: 'user-1',
          email: 'joao@aksurim.com',
          role: Role.ADMIN,
          familyAccountId: 'fam-1',
          isGlobalAdmin: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('bloqueia tentativa de membro secundário (MEMBER) contratar ou cancelar plano', async () => {
      await expect(
        service.createCheckout(
          'fam-1',
          {
            userId: 'user-2',
            email: 'membro@aksurim.com',
            role: Role.MEMBER,
            familyAccountId: 'fam-1',
            isGlobalAdmin: false,
          },
          {
            billingCycle: BillingCycle.MONTHLY,
            paymentMode: 'CARD_RECURRING',
            acceptedTerms: true,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
