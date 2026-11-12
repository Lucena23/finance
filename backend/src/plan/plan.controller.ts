import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FamilyScopeParam } from '../common/decorators/family-scope.decorator';
import { Public } from '../common/decorators/public.decorator';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { LockedSummaryQueryDto } from './dto/locked-summary-query.dto';
import {
  CheckoutSessionResult,
  FamilySubscriptionSummary,
  PlanPaymentService,
} from './plan-payment.service';
import { LockedMonthSummary, PlanInfo, PlanService } from './plan.service';

/**
 * PlanController — informações do plano Freemium e Checkout Mercado Pago (v1.3).
 * Escopo SEMPRE derivado do JWT (RN-01 / §8.3), exceto no endpoint público de webhook.
 */
@Controller('plan')
export class PlanController {
  constructor(
    private readonly planService: PlanService,
    private readonly planPaymentService: PlanPaymentService,
  ) {}

  /** GET /api/v1/plan — status, dias restantes e limites do plano. */
  @Get()
  async getPlan(@FamilyScopeParam() scope: FamilyScope): Promise<PlanInfo> {
    await this.planPaymentService.reconcileFamilyPending(scope.familyAccountId);
    return this.planService.getPlanInfo(scope.familyAccountId);
  }

  /**
   * GET /api/v1/plan/locked-summary?month=&year=
   * Quantidade e total de um mês (para o desfoque). Sem detalhes.
   */
  @Get('locked-summary')
  getLockedSummary(
    @FamilyScopeParam() scope: FamilyScope,
    @Query() query: LockedSummaryQueryDto,
  ): Promise<LockedMonthSummary> {
    return this.planService.getLockedMonthSummary(
      scope.familyAccountId,
      query.month,
      query.year,
    );
  }

  /**
   * GET /api/v1/plan/subscription
   * Resumo da assinatura, catálogo de preços (1295/6290/8990 centavos),
   * elegibilidade de reembolso CDC (7 dias) e histórico de transações.
   */
  @Get('subscription')
  getSubscriptionSummary(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FamilySubscriptionSummary> {
    return this.planPaymentService.getFamilySubscriptionSummary(
      scope.familyAccountId,
      user.email,
    );
  }

  /**
   * POST /api/v1/plan/checkout
   * Cria sessão de pagamento (Assinatura Recorrente no Cartão ou Checkout Pro Pix/Cartão).
   */
  @Post('checkout')
  createCheckout(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CheckoutSessionResult> {
    return this.planPaymentService.createCheckout(
      scope.familyAccountId,
      user,
      dto,
    );
  }

  /**
   * GET /api/v1/plan/transactions/:id/sync
   * Verifica e sincroniza ativamente o status da transação junto ao Mercado Pago.
   */
  @Get('transactions/:id/sync')
  syncTransaction(
    @FamilyScopeParam() scope: FamilyScope,
    @Param('id') id: string,
  ): Promise<{ status: string; plan: PlanInfo }> {
    return this.planPaymentService.verifyAndSyncTransaction(
      scope.familyAccountId,
      id,
    );
  }

  /**
   * POST /api/v1/plan/subscription/cancel
   * Cancela em 1 clique a renovação automática mensal no cartão, mantendo o Premium
   * até o fim do período já pago.
   */
  @Post('subscription/cancel')
  cancelSubscription(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ cancelled: boolean; message: string; plan: PlanInfo }> {
    return this.planPaymentService.cancelRecurringSubscription(
      scope.familyAccountId,
      user,
    );
  }

  /**
   * POST /api/v1/plan/subscription/refund
   * Solicita reembolso integral automático dentro de 7 dias corridos da 1ª compra (CDC Art. 49).
   */
  @Post('subscription/refund')
  requestCdcRefund(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ refunded: boolean; message: string; plan: PlanInfo }> {
    return this.planPaymentService.requestCdcRefund(
      scope.familyAccountId,
      user,
    );
  }

  /**
   * POST /api/v1/plan/webhook (e /api/payments/webhook via alias no main.ts)
   * Endpoint público para notificações de Webhook do Mercado Pago com validação HMAC x-signature.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
    @Query() query: Record<string, string | undefined>,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean; processed: boolean; idempotent?: boolean }> {
    return this.planPaymentService.handleWebhook({
      xSignature,
      xRequestId,
      query,
      body: body ?? {},
    });
  }
}
