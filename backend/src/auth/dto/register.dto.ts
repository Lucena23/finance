import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * RegisterDto — payload de criação de FamilyAccount + primeiro usuário (ADMIN).
 * ARCHITECTURE §3.2 — MÓDULO AUTH.
 */
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  familyName!: string;

  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'ownerCpf deve estar no formato XXX.XXX.XXX-XX',
  })
  ownerCpf!: string;
}
