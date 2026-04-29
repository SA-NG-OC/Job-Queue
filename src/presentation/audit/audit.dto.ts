import { AUDIT_ACTIONS } from '../../domain/audit/entities/audit-log.entity';
import z from 'zod';

export const getAuditLogsSchema = z.object({
    query: z.object({
        action: z.enum(AUDIT_ACTIONS).optional(),
        jobId: z.uuid().optional(),
        fromDate: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
        toDate: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
        page: z.string().optional().transform((v) => v ? Number(v) : 1),
        limit: z.string().optional().transform((v) => v ? Math.min(Number(v), 100) : 20),
    }),
});