import { Worker, Job } from 'bullmq'
import { jobDrizzleRepository } from '../../../drizzle/job.drizzle.repository';
import { markJobCompleted, markJobFailed, markJobStarted } from '../../../../domain/job/entities/job.entity';
import { redisConnection } from '../client';
import { processCompressVideoJob, processResizeImageJob } from '../../processors/media.processor';
import { JobType } from '../../../../domain/job/value-objects/job-type.vo';
import { emitWebhook } from '../../../events/webhook.listener';

export const mediaWorker = new Worker('media',
    async (bullJob: Job) => {
        const { jobId, type, payload } = bullJob.data as {
            jobId: string;
            type: JobType;
            payload: unknown;
        };

        const job = await jobDrizzleRepository.findById(jobId);
        if (!job) throw new Error(`Job ${jobId} không tìm thấy`);

        await jobDrizzleRepository.update(markJobStarted(job));

        try {
            const result = type === 'RESIZE_IMAGE'
                ? await processResizeImageJob(payload as any)
                : await processCompressVideoJob(payload as any);

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
    { connection: redisConnection, concurrency: 3 }
)

mediaWorker.on('completed', (job) => console.log(`[Media Worker] Job ${job.id} completed`));
mediaWorker.on('failed', (job, err) => console.error(`[Media Worker] Job ${job?.id} failed:`, err.message));