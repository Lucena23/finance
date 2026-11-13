import { PushSubscription } from '@prisma/client';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { AnnouncementService, NotificationPreferences, SystemAnnouncement } from './announcement.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-preferences.dto';
import { NotificationService } from './notification.service';
export declare class NotificationController {
    private readonly notificationService;
    private readonly announcementService;
    constructor(notificationService: NotificationService, announcementService: AnnouncementService);
    subscribe(user: AuthenticatedUser, dto: SubscribePushDto): Promise<PushSubscription>;
    unsubscribe(user: AuthenticatedUser, dto: UnsubscribePushDto): Promise<void>;
    getPreferences(user: AuthenticatedUser): Promise<NotificationPreferences>;
    updatePreferences(user: AuthenticatedUser, dto: UpdateNotificationPreferencesDto): Promise<NotificationPreferences>;
    getLatestAnnouncement(): Promise<SystemAnnouncement | null>;
}
