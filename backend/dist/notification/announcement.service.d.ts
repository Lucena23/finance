import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export interface SystemAnnouncement {
    id: string;
    title: string;
    body: string;
    version: string | null;
    pushSentCount: number;
    createdAt: Date;
}
export interface NotificationPreferences {
    systemUpdates: boolean;
}
export interface PublishAnnouncementResult {
    announcement: SystemAnnouncement;
    pushSentCount: number;
    pushFailedCount: number;
}
export declare class AnnouncementService implements OnModuleInit {
    private readonly prisma;
    private readonly logger;
    private tablesEnsured;
    private vapidConfigured;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    ensureTables(): Promise<void>;
    getPreferences(userId: string): Promise<NotificationPreferences>;
    updatePreferences(userId: string, prefs: NotificationPreferences): Promise<NotificationPreferences>;
    getLatest(): Promise<SystemAnnouncement | null>;
    list(limit?: number): Promise<SystemAnnouncement[]>;
    publish(input: {
        title: string;
        body: string;
        version?: string;
        sendPush: boolean;
    }): Promise<PublishAnnouncementResult>;
    private broadcastPush;
    private ensureVapidConfigured;
    private getById;
    private normalize;
}
