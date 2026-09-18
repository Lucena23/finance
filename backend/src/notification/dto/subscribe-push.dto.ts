import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

/**
 * Chaves criptográficas da subscription de Web Push (protocolo VAPID).
 * ARCHITECTURE §3.2 — MÓDULO NOTIFICATIONS — TAREFA 31.
 */
export class PushSubscriptionKeysDto {
  /** Chave pública do cliente (curva P-256). */
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  /** Token de autenticação da subscription. */
  @IsString()
  @IsNotEmpty()
  auth!: string;
}

/**
 * SubscribePushDto — payload de registro de uma subscription de Web Push.
 * ARCHITECTURE §3.2 — MÓDULO NOTIFICATIONS — TAREFA 31.
 *
 * O userId NÃO é aceito aqui: o vínculo é derivado exclusivamente do JWT
 * pelo JwtStrategy (RN-01 / §8.3).
 */
export class SubscribePushDto {
  /** Endpoint único da subscription fornecido pelo navegador. */
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  /** Chaves VAPID da subscription. */
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;
}
