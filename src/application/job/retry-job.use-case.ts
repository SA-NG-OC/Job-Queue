import { incrementJobAttempts, jobToJSON } from "../../domain/job/entities/job.entity";
import { JobRepository } from "../../domain/job/repositories/job.repository";
import { err, ok, Result } from "../../domain/shared/result";
import { getQueueByJobType } from "../../infrastructure/queue/bullmq/client";

export const makeRetryJobUseCase =
    (jobRepo: JobRepository) =>
        async (id: string, userId: string): Promise<Result<ReturnType<typeof jobToJSON>>> => {
            const job = await jobRepo.findById(id);
            if (!job) return err('Job không tìm thấy');
            if (job.userId !== userId) return err('Không có quyền retry job này');
            if (job.status !== 'FAILED') return err('Chỉ có thể retry job ở trạng thái FAILED');

            const retried = incrementJobAttempts(job);
            if (!retried.success) return err(retried.error);

            const updated = await jobRepo.update(retried.value);

            // Re-enqueue
            const queue = getQueueByJobType(job.type);
            await queue.add(job.type, {
                jobId: updated.id,
                type: updated.type,
                payload: updated.payload,
            }, { jobId: `${updated.id}-retry-${updated.attempts}` });

            return ok(jobToJSON(updated));
        };