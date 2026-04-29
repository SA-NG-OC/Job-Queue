import { db } from '../../../db';
import { redisConnection } from '../../queue/bullmq/client';
import { emailQueue, mediaQueue, reportQueue, webhookQueue } from '../../queue/bullmq/client';
import { sql } from 'drizzle-orm';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type ServiceHealth = {
    status: HealthStatus;
    latencyMs?: number;
    message?: string;
};

export type HealthReport = {
    status: HealthStatus;
    timestamp: string;
    uptime: number;
    version: string;
    services: {
        database: ServiceHealth;
        redis: ServiceHealth;
        queues: ServiceHealth & {
            details?: Record<string, { waiting: number; active: number; failed: number }>;
        };
    };
};

const checkDatabase = async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
        await db.execute(sql`SELECT 1`);
        return { status: 'healthy', latencyMs: Date.now() - start };
    } catch (err) {
        return {
            status: 'unhealthy',
            message: err instanceof Error ? err.message : 'Database unreachable',
        };
    }
};

const checkRedis = async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
        await redisConnection.ping();
        return { status: 'healthy', latencyMs: Date.now() - start };
    } catch (err) {
        return {
            status: 'unhealthy',
            message: err instanceof Error ? err.message : 'Redis unreachable',
        };
    }
};

const checkQueues = async (): Promise<HealthReport['services']['queues']> => {
    try {
        const queueList = [
            { name: 'email', queue: emailQueue },
            { name: 'media', queue: mediaQueue },
            { name: 'report', queue: reportQueue },
            { name: 'webhook', queue: webhookQueue },
        ];

        const details: Record<string, { waiting: number; active: number; failed: number }> = {};

        for (const { name, queue } of queueList) {
            const [waiting, active, failed] = await Promise.all([
                queue.getWaitingCount(),
                queue.getActiveCount(),
                queue.getFailedCount(),
            ]);
            details[name] = { waiting, active, failed };
        }

        // Nếu có queue nào failed quá nhiều thì báo degraded
        const totalFailed = Object.values(details).reduce((sum, q) => sum + q.failed, 0);
        const status: HealthStatus = totalFailed > 100 ? 'degraded' : 'healthy';

        return { status, details };
    } catch (err) {
        return {
            status: 'unhealthy',
            message: err instanceof Error ? err.message : 'Queue check failed',
        };
    }
};

export const getHealthReport = async (): Promise<HealthReport> => {
    const [database, redis, queues] = await Promise.all([
        checkDatabase(),
        checkRedis(),
        checkQueues(),
    ]);

    const allStatuses = [database.status, redis.status, queues.status];

    const overallStatus: HealthStatus =
        allStatuses.includes('unhealthy') ? 'unhealthy' :
            allStatuses.includes('degraded') ? 'degraded' :
                'healthy';

    return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: process.env.npm_package_version || '1.0.0',
        services: { database, redis, queues },
    };
};