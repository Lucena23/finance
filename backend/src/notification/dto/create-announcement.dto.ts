import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty({ message: 'O título do comunicado é obrigatório.' })
  @MaxLength(120, { message: 'O título deve ter no máximo 120 caracteres.' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'A mensagem do comunicado é obrigatória.' })
  @MaxLength(4000, { message: 'A mensagem deve ter no máximo 4000 caracteres.' })
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'A versão deve ter no máximo 20 caracteres.' })
  version?: string;

  @IsOptional()
  @IsBoolean()
  sendPush?: boolean;
}
