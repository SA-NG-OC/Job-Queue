import { Worker, Job } from 'bullmq'
import { jobDrizzleRepository } from '../../../../domain/job/repositories/job.drizzle.repository';
import { markJobCompleted, markJobFailed, markJobStarted } from '../../../../domain/job/entities/job.entity';
import { redisConnection } from '../client';
import { processCompressVideoJob, processResizeImageJob } from '../../processors/media.processor';
import { JobType } from '../../../../domain/job/value-objects/job-type.vo';

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
            return result;
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            await jobDrizzleRepository.update(markJobFailed(job, errMsg));
            throw error;
        }
    },
    { connection: redisConnection, concurrency: 3 }
)

mediaWorker.on('completed', (job) => console.log(`[Media Worker] Job ${job.id} completed`));
mediaWorker.on('failed', (job, err) => console.error(`[Media Worker] Job ${job?.id} failed:`, err.message));