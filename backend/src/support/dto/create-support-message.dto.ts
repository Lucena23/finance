import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * CreateSupportMessageDto — payload do formulário de Suporte (TAREFA 21).
 * ARCHITECTURE §3.2 — MÓDULO SUPPORT — RN-14.
 *
 * O `familyAccountId` NÃO é aceito aqui: o escopo é derivado exclusivamente
 * do JWT pelo FamilyScopeInterceptor (RN-01 / §8.3). O backend enriquece a
 * mensagem enviada ao Telegram com os dados do usuário autenticado.
 */
export class CreateSupportMessageDto {
  /** Assunto curto da solicitação (ex: "Erro ao editar despesa"). */
  @IsString()
  @MinLength(3, { message: 'O assunto deve ter ao menos 3 caracteres.' })
  @MaxLength(120, { message: 'O assunto deve ter no máximo 120 caracteres.' })
  subject!: string;

  /** Corpo da mensagem com a descrição detalhada do problema/dúvida. */
  @IsString()
  @MinLength(10, { message: 'A mensagem deve ter ao menos 10 caracteres.' })
  @MaxLength(2000, { message: 'A mensagem deve ter no máximo 2000 caracteres.' })
  message!: string;

  /**
   * Contato opcional informado pelo usuário (e-mail/telefone alternativo).
   * Quando ausente, o backend usa o e-mail do usuário autenticado.
   */
  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'O contato deve ter no máximo 160 caracteres.' })
  contact?: string;
}
