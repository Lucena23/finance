import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatTurnDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content!: string;
}

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'A mensagem não pode estar vazia.' })
  @MaxLength(300, {
    message: 'A mensagem deve ter no máximo 300 caracteres na central de suporte.',
  })
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history?: ChatTurnDto[];
}
