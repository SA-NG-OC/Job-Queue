import { v4 as uuidv4 } from 'uuid';
import { err, ok, Result } from "../../shared/result";
import { createJobEntity, JobEntity } from "../entities/job.entity";
import { validateJobPayload } from "../value-objects/job-payload.vo";
import { createJobType } from "../value-objects/job-type.vo";

export type CreateJobInput = {
    type: string;
    payload: unknown;
    userId: string;
    priority?: number;
    delay?: number;
    maxAttempts?: number;
    scheduledAt?: Date;
};

export const buildNewJob = (input: CreateJobInput): Result<JobEntity> => {
    const typeResult = createJobType(input.type);
    if (!typeResult.success) {
        return err(typeResult.error);
    }

    const payloadResult = validateJobPayload(typeResult.value, input.payload);
    if (!payloadResult.success) return err(payloadResult.error);

    return ok(
        createJobEntity(uuidv4(), {
            type: typeResult.value,
            status: 'PENDING',
            payload: payloadResult.value,
            result: null,
            error: null,
            priority: input.priority ?? 0,
            attempts: 0,
            maxAttempts: input.maxAttempts ?? 3,
            delay: input.delay ?? null,
            scheduledAt: input.scheduledAt ?? null,
            startedAt: null,
            completedAt: null,
            createdAt: new Date(),
            userId: input.userId,
        })
    )
}