import { BaseEntity } from '../../shared/entity.base';

export const AUDIT_ACTIONS = [
    'auth.register',
    'auth.login',
    'auth.logout',
    'job.created',
    'job.cancelled',
    'job.retried',
    'job.completed',
    'job.failed',
    'schedule.created',
    'schedule.updated',
    'schedule.deleted',
    'schedule.toggled',
    'webhook.registered',
    'webhook.deleted',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditLogEntity = BaseEntity & {
    action: AuditAction;
    userId: string;
    jobId: string | null;
    meta: Record<string, unknown> | null;
    createdAt: Date;
}

export const createAuditLog = (
    id: string,
    action: AuditAction,
    userId: string,
    jobId: string | null = null,
    meta: Record<string, unknown> | null = null
): AuditLogEntity => ({
    id,
    action,
    userId,
    jobId,
    meta,
    createdAt: new Date(),
});

export const auditLogToJSON = (log: AuditLogEntity) => ({
    id: log.id,
    action: log.action,
    userId: log.userId,
    jobId: log.jobId,
    meta: log.meta,
    createdAt: log.createdAt,
});