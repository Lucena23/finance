import { IsNotEmpty, IsString } from 'class-validator';

/**
 * UnsubscribePushDto — payload de remoção de uma subscription de Web Push.
 * ARCHITECTURE §3.2 — MÓDULO NOTIFICATIONS — TAREFA 31.
 *
 * A remoção é feita por `endpoint`, sempre restrita ao usuário autenticado
 * (derivado do JWT) para evitar remoção de subscriptions de terceiros.
 */
export class UnsubscribePushDto {
  /** Endpoint único da subscription a ser removida. */
  @IsString()
  @IsNotEmpty()
  endpoint!: string;
}
