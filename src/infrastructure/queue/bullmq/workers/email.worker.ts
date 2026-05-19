import { Worker, Job } from 'bullmq';
import { redisConnection } from '../client';
import { processEmailJob, processSmsJob } from '../../processors/email.processor';
import { JobType } from '../../../../domain/job/value-objects/job-type.vo';
import { markJobStarted, markJobCompleted, markJobFailed } from '../../../../domain/job/entities/job.entity';
import { jobDrizzleRepository } from '../../../drizzle/job.drizzle.repository';
import { emitWebhook } from '../../../events/webhook.listener';

export const emailWorker = new Worker(
    'email',
    async (bullJob: Job) => {
        const { jobId, type, payload } = bullJob.data as {
            jobId: string;
            type: JobType;
            payload: unknown;
        }

        // 1. Lấy job 
        const job = await jobDrizzleRepository.findById(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} không tìm thấy`);
        }

        //2. Đánh dấu bắt đầu
        await jobDrizzleRepository.update(markJobStarted(job));

        try {
            const result = type === 'SEND_EMAIL'
                ? await processEmailJob(payload as any)
                : await processSmsJob(payload as any);

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
    { connection: redisConnection, concurrency: 5 }
);

emailWorker.on('completed', (job) => console.log(`[Email Worker] Job ${job.id} completed`));
emailWorker.on('failed', (job, err) => console.error(`[Email Worker] Job ${job?.id} failed:`, err.message));