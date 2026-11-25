import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PublicSupportFormDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe seu nome.' })
  @MinLength(2, { message: 'O nome deve ter ao menos 2 caracteres.' })
  @MaxLength(80, { message: 'O nome deve ter no máximo 80 caracteres.' })
  name!: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(120, { message: 'O e-mail deve ter no máximo 120 caracteres.' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'O contato deve ter no máximo 60 caracteres.' })
  contact?: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe o assunto.' })
  @MinLength(3, { message: 'O assunto deve ter ao menos 3 caracteres.' })
  @MaxLength(100, { message: 'O assunto deve ter no máximo 100 caracteres.' })
  subject!: string;

  @IsString()
  @IsNotEmpty({ message: 'Descreva sua dúvida ou solicitação.' })
  @MinLength(10, { message: 'A mensagem deve ter ao menos 10 caracteres.' })
  @MaxLength(2000, { message: 'A mensagem deve ter no máximo 2000 caracteres.' })
  message!: string;
}
