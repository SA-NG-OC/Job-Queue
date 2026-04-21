import { z } from 'zod';
import { JOB_TYPES } from '../../domain/job/value-objects/job-type.vo';
import { JOB_STATUSES } from '../../domain/job/value-objects/job-status.vo';

export const createJobSchema = z.object({
    body: z.object({
        type: z.enum(JOB_TYPES),
        payload: z.record(z.string(), z.unknown()),
        priority: z.number().int().min(0).max(10).optional(),
        delay: z.number().int().min(0).optional(),
        maxAttempts: z.number().int().min(1).max(10).optional(),
        scheduledAt: z.string().datetime().optional()
            .transform((v) => v ? new Date(v) : undefined),
    }),
});

export const getJobsSchema = z.object({
    query: z.object({
        status: z.enum(JOB_STATUSES).optional(),
        type: z.enum(JOB_TYPES).optional(),
        page: z.string().optional().transform((v) => v ? Number(v) : 1),
        limit: z.string().optional().transform((v) => v ? Math.min(Number(v), 100) : 10),
    }),
});

export const jobIdSchema = z.object({
    params: z.object({ id: z.string().uuid('Job ID không hợp lệ') }),
});