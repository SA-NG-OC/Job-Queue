import { Worker, Job } from 'bullmq';
import { redisConnection } from '../client';
import { processWebhookJob } from '../../processors/webhook.processor';
import { markJobStarted, markJobCompleted, markJobFailed } from '../../../../domain/job/entities/job.entity';
import { jobDrizzleRepository } from '../../../../domain/job/repositories/job.drizzle.repository';
import { emitWebhook } from '../../../events/webhook.listener';

export const webhookWorker = new Worker(
    'webhook',
    async (bullJob: Job) => {
        const { jobId, payload } = bullJob.data as { jobId: string; payload: unknown };

        const job = await jobDrizzleRepository.findById(jobId);
        if (!job) throw new Error(`Job ${jobId} không tìm thấy`);

        await jobDrizzleRepository.update(markJobStarted(job));

        try {
            const result = await processWebhookJob(payload as any);
            await jobDrizzleRepository.update(markJobCompleted(job, result));
            emitWebhook({
                event: 'job.completed',
                jobId: job.id,
                data: { type: job.type, result, userId: job.userId },
            });
            return result;
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            await jobDrizzleRepository.update(markJobFailed(job, errMsg));
            emitWebhook({
                event: 'job.failed',
                jobId: job.id,
                data: { type: job.type, error: errMsg, attempts: job.attempts, userId: job.userId },
            });
            throw error;
        }
    },
    { connection: redisConnection, concurrency: 10 }
);

webhookWorker.on('completed', (job) => console.log(`[Webhook Worker] Job ${job.id} completed`));
webhookWorker.on('failed', (job, err) => console.error(`[Webhook Worker] Job ${job?.id} failed:`, err.message));