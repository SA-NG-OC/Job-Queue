import { Worker, Job } from 'bullmq';
import { redisConnection } from '../client';
import { processGeneratePdfJob, processExportCsvJob } from '../../processors/report.processor';
import { JobType } from '../../../../domain/job/value-objects/job-type.vo';
import { markJobStarted, markJobCompleted, markJobFailed } from '../../../../domain/job/entities/job.entity';
import { jobDrizzleRepository } from '../../../../domain/job/repositories/job.drizzle.repository';

export const reportWorker = new Worker(
    'report',
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
            const result = type === 'GENERATE_PDF'
                ? await processGeneratePdfJob(payload as any)
                : await processExportCsvJob(payload as any);

            await jobDrizzleRepository.update(markJobCompleted(job, result));
            return result;
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            await jobDrizzleRepository.update(markJobFailed(job, errMsg));
            throw error;
        }
    },
    { connection: redisConnection, concurrency: 2 }
);

reportWorker.on('completed', (job) => console.log(`[Report Worker] Job ${job.id} completed`));
reportWorker.on('failed', (job, err) => console.error(`[Report Worker] Job ${job?.id} failed:`, err.message));