import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * LoginDto — payload de autenticação de usuário existente.
 * ARCHITECTURE §3.2 — MÓDULO AUTH.
 */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
