import IORedis from 'ioredis';
import { Queue, QueueOptions } from 'bullmq';
import { JobType } from '../../../domain/job/value-objects/job-type.vo';

export const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
});

const defaultQueueOptions: QueueOptions = {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
    },
};

export const QUEUE_NAME: Record<JobType, string> = {
    SEND_EMAIL: 'email',
    SEND_SMS: 'email',
    RESIZE_IMAGE: 'media',
    COMPRESS_VIDEO: 'media',
    GENERATE_PDF: 'report',
    EXPORT_CSV: 'report',
    CALL_WEBHOOK: 'webhook',
};

export const emailQueue = new Queue('email', defaultQueueOptions);
export const mediaQueue = new Queue('media', defaultQueueOptions);
export const reportQueue = new Queue('report', defaultQueueOptions);
export const webhookQueue = new Queue('webhook', defaultQueueOptions);

export const getQueueByJobType = (type: JobType): Queue => {
    const queueMap: Record<string, Queue> = {
        email: emailQueue,
        media: mediaQueue,
        report: reportQueue,
        webhook: webhookQueue,
    };
    return queueMap[QUEUE_NAME[type]];
}