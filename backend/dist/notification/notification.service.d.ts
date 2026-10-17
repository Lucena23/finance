import { PushSubscription } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';
export declare class NotificationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    subscribe(userId: string, dto: SubscribePushDto): Promise<PushSubscription>;
    unsubscribe(userId: string, dto: UnsubscribePushDto): Promise<void>;
}
