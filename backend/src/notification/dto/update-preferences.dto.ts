import { IsBoolean } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsBoolean({ message: 'A preferência systemUpdates deve ser um booleano.' })
  systemUpdates!: boolean;
}
