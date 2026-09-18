import { SetMetadata } from '@nestjs/common';

/**
 * Chave de metadata para rotas públicas (sem autenticação).
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — marca uma rota como pública, dispensando o JwtAuthGuard global.
 * Usado em POST /auth/login e POST /auth/register.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
