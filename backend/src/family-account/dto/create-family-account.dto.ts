import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { IsCpf } from '../../common/validators/is-cpf.validator';

/**
 * CreateFamilyAccountDto — payload de criação de um workspace familiar.
 * RN-02: exige o CPF do titular (válido e único) para identificação fiscal.
 * ARCHITECTURE §3.2 — MÓDULO FAMILY-ACCOUNT.
 */
export class CreateFamilyAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsCpf()
  ownerCpf!: string;
}
