import { BaseEntity } from "../../shared/entity.base";
import { err, ok, Result } from "../../shared/result";
import { JobPayload } from "../value-objects/job-payload.vo";
import { canTransitionTo, JobStatus } from "../value-objects/job-status.vo";
import { JobType } from "../value-objects/job-type.vo";

export type JobEntity = BaseEntity & {
    type: JobType;
    status: JobStatus;
    payload: JobPayload;
    result: Record<string, unknown> | null;
    error: string | null;
    priority: number;
    attempts: number;
    maxAttempts: number;
    delay: number | null;
    scheduledAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    userId: string;
};

export const createJobEntity = (id: string, props: Omit<JobEntity, 'id'>): JobEntity => ({ id, ...props });

export const transitionJobStatus = (
    job: JobEntity,
    to: JobStatus
): Result<JobEntity> => {
    if (!canTransitionTo(job.status, to))
        return err(`Không thể thực hiện chuyển đổi trạng thái từ ${job.status} sang ${to}`);
    return ok({ ...job, status: to });
}

export const incrementJobAttempts = (job: JobEntity): Result<JobEntity> => {
    if (job.attempts >= job.maxAttempts) {
        return err(`Đã đạt số lần retry tối đa (${job.maxAttempts})`);
    }
    return ok({ ...job, attempts: job.attempts + 1, status: 'PENDING' as JobStatus });
}

export const markJobStarted = (job: JobEntity): JobEntity => ({
    ...job,
    status: 'ACTIVE',
    startedAt: new Date(),
});

export const markJobCompleted = (
    job: JobEntity,
    result: Record<string, unknown>
): JobEntity => ({
    ...job,
    status: 'COMPLETED',
    result,
    completedAt: new Date(),
});

export const markJobFailed = (job: JobEntity, error: string): JobEntity => ({
    ...job,
    status: 'FAILED',
    error,
});

export const jobToJSON = (job: JobEntity) => ({
    id: job.id,
    type: job.type,
    status: job.status,
    payload: job.payload,
    result: job.result,
    error: job.error,
    priority: job.priority,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    delay: job.delay,
    scheduledAt: job.scheduledAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
    userId: job.userId,
});