import { PushSubscription } from '@prisma/client';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';
import { NotificationService } from './notification.service';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    subscribe(user: AuthenticatedUser, dto: SubscribePushDto): Promise<PushSubscription>;
    unsubscribe(user: AuthenticatedUser, dto: UnsubscribePushDto): Promise<void>;
}
