import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthenticatedUser } from '../auth/jwt.strategy';
import { PlanService } from '../plan/plan.service';
import { DeepSeekService } from './deepseek.service';
import { SupportService } from './support.service';

describe('SupportService & IA-ksurim (v1.4.0)', () => {
  let service: SupportService;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;
  let mockDeepSeekService: jest.Mocked<Partial<DeepSeekService>>;
  let mockPlanService: jest.Mocked<Partial<PlanService>>;

  const mockUser: AuthenticatedUser = {
    userId: 'user-123',
    familyAccountId: 'fam-456',
    email: 'cliente@aksurim.com',
    role: 'ADMIN',
    isGlobalAdmin: false,
  };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'TELEGRAM_SUPPORT_BOT_TOKEN') return 'mock-bot-token';
        if (key === 'TELEGRAM_SUPPORT_CHAT_ID') return 'mock-chat-id';
        return undefined;
      }),
    };

    mockDeepSeekService = {
      generateReply: jest.fn().mockResolvedValue({
        reply: 'Olá! Sou a IA-ksurim. Como posso ajudar com o Aksurim Controle?',
        quickReplies: ['💎 Conhecer Planos', '🚀 Testar Grátis'],
      }),
    };

    mockPlanService = {
      getComputedPlan: jest.fn().mockResolvedValue({
        status: 'PREMIUM',
        trialEndsAt: null,
        premiumEndsAt: new Date(Date.now() + 86400000),
        effectiveUntil: new Date(Date.now() + 86400000),
        daysRemaining: 1,
        isWithinGrace: false,
      }),
    };

    service = new SupportService(
      mockConfigService as ConfigService,
      mockDeepSeekService as DeepSeekService,
      mockPlanService as PlanService,
    );
  });

  describe('chatPublic', () => {
    it('deve chamar o DeepSeek com contexto PUBLIC_FRONTPAGE', async () => {
      const res = await service.chatPublic(
        { message: 'Como funciona o app?' },
        '127.0.0.1',
      );

      expect(res.reply).toContain('IA-ksurim');
      expect(mockDeepSeekService.generateReply).toHaveBeenCalledWith(
        'Como funciona o app?',
        [],
        'PUBLIC_FRONTPAGE',
        1,
      );
    });

    it('deve bloquear após ultrapassar o limite de requisições por IP', async () => {
      const ip = '10.0.0.1';
      for (let i = 0; i < 12; i++) {
        await service.chatPublic({ message: 'Oi' }, ip);
      }

      await expect(service.chatPublic({ message: 'Oi' }, ip)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('chatAuthenticated', () => {
    it('deve retornar mensagem de upsell sem chamar o DeepSeek para contas FREE', async () => {
      mockPlanService.getComputedPlan = jest.fn().mockResolvedValue({
        status: 'FREE',
        trialEndsAt: null,
        premiumEndsAt: null,
        effectiveUntil: null,
        daysRemaining: null,
        isWithinGrace: false,
      });

      const res = await service.chatAuthenticated(mockUser, {
        message: 'Preciso de ajuda',
      });

      expect(res.isUpsell).toBe(true);
      expect(res.reply).toContain('exclusivo dos assinantes Premium');
      expect(mockDeepSeekService.generateReply).not.toHaveBeenCalled();
    });

    it('deve chamar o DeepSeek normalmente para usuários PREMIUM ou TRIAL', async () => {
      const res = await service.chatAuthenticated(mockUser, {
        message: 'Como emitir relatório?',
      });

      expect(res.isUpsell).toBeUndefined();
      expect(mockDeepSeekService.generateReply).toHaveBeenCalledWith(
        'Como emitir relatório?',
        [],
        'AUTHENTICATED_PREMIUM',
        1,
        mockUser.email,
      );
    });
  });

  describe('sendPublicSupportForm & sendToTelegram', () => {
    it('deve encaminhar o formulário público com sucesso simulado', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('ok'),
      } as unknown as Response);

      const res = await service.sendPublicSupportForm(
        {
          name: 'João Silva',
          email: 'joao@exemplo.com',
          subject: 'Erro no acesso',
          message: 'Não consigo recuperar minha senha',
        },
        '192.168.1.1',
      );

      expect(res.delivered).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
