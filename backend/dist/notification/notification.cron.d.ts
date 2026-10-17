import { NotificationPriorityService } from './notification-priority.service';
export declare class NotificationCron {
    private readonly priorityService;
    private readonly logger;
    constructor(priorityService: NotificationPriorityService);
    handleDailyDispatch(): Promise<void>;
}
