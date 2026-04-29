import { jobToJSON } from "../../domain/job/entities/job.entity";
import { JobRepository } from "../../domain/job/repositories/job.repository";
import { buildNewJob } from "../../domain/job/services/job.domain.service";
import { err, ok, Result } from "../../domain/shared/result";
import { emitAudit } from "../../infrastructure/events/audit.listener";
import { getQueueByJobType } from "../../infrastructure/queue/bullmq/client";

export type CreateJobCommand = {
    type: string;
    payload: unknown;
    userId: string;
    priority?: number;
    delay?: number;
    maxAttempts?: number;
    scheduledAt: Date;
};

export const makeCreateJobUseCase = (jobRepo: JobRepository) =>
    async (cmd: CreateJobCommand): Promise<Result<ReturnType<typeof jobToJSON>>> => {
        const jobResult = buildNewJob(cmd);
        if (!jobResult.success) return err(jobResult.error);
        const job = jobResult.value;

        const saved = await jobRepo.save(job);

        // Ghi log
        emitAudit({
            action: 'job.created',
            userId: saved.userId,
            jobId: saved.id,
            meta: { type: saved.type, priority: saved.priority },
        });

        const queue = getQueueByJobType(job.type);
        await queue.add(job.type, {
            jobId: saved.id,
            type: saved.type,
            payload: saved.payload,
        },
            {
                priority: saved.priority,
                delay: saved.delay ?? undefined,
                jobId: saved.id,
            });
        return ok(jobToJSON(saved));
    }