import { v4 as uuidv4 } from 'uuid';
import { Result, ok, err } from '../../shared/result';
import { ScheduleEntity, createScheduleEntity } from '../entities/schedule.entity';
import { createCronExpr } from '../value-objects/cron-expr.vo';
import { createJobType } from '../../job/value-objects/job-type.vo';
import { validateJobPayload } from '../../job/value-objects/job-payload.vo';

export type createScheduleInput = {
    name: string;
    jobType: string;
    payload: unknown;
    cronExpr: string;
    userId: string;
}

export const buildNewSchedule = (input: createScheduleInput): Result<ScheduleEntity> => {
    if (!input.name?.trim()) {
        return err('Tên schedule không được để trống');
    }

    const typeResult = createJobType(input.jobType);
    if (!typeResult.success) return err(typeResult.error);

    const payloadResult = validateJobPayload(typeResult.value, input.payload);
    if (!payloadResult.success) return err(payloadResult.error);

    const cronResult = createCronExpr(input.cronExpr);
    if (!cronResult.success) return err(cronResult.error);

    return ok(
        createScheduleEntity(uuidv4(), {
            name: input.name.trim(),
            jobType: typeResult.value,
            payload: payloadResult.value,
            cronExpr: cronResult.value,
            isActive: true,
            lastRunAt: null,
            nextRunAt: null,
            createdAt: new Date(),
            userId: input.userId,
        })
    );
}