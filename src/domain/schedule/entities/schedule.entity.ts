import { BaseEntity } from '../../shared/entity.base';
import { JobType } from '../../job/value-objects/job-type.vo';
import { JobPayload } from '../../job/value-objects/job-payload.vo';
import { CronExpr } from '../value-objects/cron-expr.vo';
import { Result, ok, err } from '../../shared/result';

export type ScheduleEntity = BaseEntity & {
    name: string;
    jobType: JobType;
    payload: JobPayload;
    cronExpr: CronExpr;
    isActive: boolean;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
    createdAt: Date;
    userId: string;
};

export const createScheduleEntity = (
    id: string,
    props: Omit<ScheduleEntity, 'id'>
): ScheduleEntity => ({ id, ...props });

export const markScheduleRan = (
    schedule: ScheduleEntity,
    nextRunAt: Date
): ScheduleEntity => ({
    ...schedule,
    lastRunAt: new Date(),
    nextRunAt,
});

export const toggleSchedule = (schedule: ScheduleEntity): ScheduleEntity => ({
    ...schedule,
    isActive: !schedule.isActive,
});

export const updateScheduleConfig = (
    schedule: ScheduleEntity,
    updates: Partial<Pick<ScheduleEntity, 'name' | 'cronExpr' | 'payload'>>
): Result<ScheduleEntity> => {
    if (!schedule.isActive) {
        return err('Không thể cập nhật schedule đang tắt, vui lòng bật lại trước');
    }
    return ok({ ...schedule, ...updates });
}

export const scheduleToJSON = (s: ScheduleEntity) => ({
    id: s.id,
    name: s.name,
    jobType: s.jobType,
    payload: s.payload,
    cronExpr: s.cronExpr.value,
    isActive: s.isActive,
    lastRunAt: s.lastRunAt,
    nextRunAt: s.nextRunAt,
    createdAt: s.createdAt,
    userId: s.userId,
});