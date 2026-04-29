import { jobToJSON, transitionJobStatus } from "../../domain/job/entities/job.entity";
import { JobRepository } from "../../domain/job/repositories/job.repository";
import { err, ok, Result } from "../../domain/shared/result";
import { emitAudit } from "../../infrastructure/events/audit.listener";
import { emitWebhook } from "../../infrastructure/events/webhook.listener";
import { emailQueue, mediaQueue, reportQueue, webhookQueue } from "../../infrastructure/queue/bullmq/client";

const allQueues = [emailQueue, mediaQueue, reportQueue, webhookQueue];

export const makeCancelJobUseCase =
    (jobRepo: JobRepository) =>
        async (id: string, userId: string): Promise<Result<ReturnType<typeof jobToJSON>>> => {
            const job = await jobRepo.findById(id);
            if (!job) return err('Job không tìm thấy');
            if (job.userId !== userId) return err('Không có quyền cancel job này');

            const transitioned = transitionJobStatus(job, 'CANCELLED');
            if (!transitioned.success) {
                return err(transitioned.error);
            }

            for (const queue of allQueues) {
                const bullJob = await queue.getJob(id);
                if (bullJob) {
                    await bullJob.remove();
                }
            }

            const updated = await jobRepo.update(transitioned.value);

            emitAudit({
                action: 'job.cancelled',
                userId: userId,
                jobId: updated.id,
                meta: { cancelledAt: new Date() },
            });

            emitWebhook({
                event: 'job.cancelled',
                jobId: updated.id,
                data: { type: updated.type, userId: updated.userId },
            });

            return ok(jobToJSON(updated));
        };