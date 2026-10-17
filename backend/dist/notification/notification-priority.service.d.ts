import { PrismaService } from '../prisma/prisma.service';
export declare enum NotificationPriority {
    P1 = "P1",
    P2 = "P2",
    P3 = "P3",
    SILENT = "SILENT"
}
export interface WorkspaceDispatchResult {
    familyAccountId: string;
    priority: NotificationPriority;
    pendingCount: number;
    notifiedSubscriptions: number;
    message: string | null;
}
export declare class NotificationPriorityService {
    private readonly prisma;
    private readonly logger;
    private vapidConfigured;
    constructor(prisma: PrismaService);
    dispatchAll(referenceDate?: Date): Promise<WorkspaceDispatchResult[]>;
    dispatchForWorkspace(familyAccountId: string, referenceDate?: Date): Promise<WorkspaceDispatchResult>;
    private countPending;
    private dispatch;
    private ensureVapidConfigured;
    private isGoneError;
    private describeError;
    private startOfDay;
    private addDays;
}
