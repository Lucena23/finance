import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * UpdateFamilyAccountDto — payload de atualização do workspace familiar.
 * O ownerCpf NÃO é editável (chave de identificação fiscal — RN-02).
 * ARCHITECTURE §3.2 — MÓDULO FAMILY-ACCOUNT.
 */
export class UpdateFamilyAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;
}
