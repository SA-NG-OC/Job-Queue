import { z } from 'zod';
import { JOB_TYPES } from '../../domain/job/value-objects/job-type.vo';

export const createScheduleSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Tên không được để trống').max(100),
        jobType: z.enum(JOB_TYPES),
        payload: z.record(z.string(), z.unknown()),
        cronExpr: z.string().min(1, 'Cron expression không được để trống'),
    }),
});

export const updateScheduleSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        cronExpr: z.string().optional(),
        payload: z.record(z.string(), z.unknown()).optional(),
    }),
});

export const scheduleIdSchema = z.object({
    params: z.object({ id: z.string().uuid('Schedule ID không hợp lệ') }),
});