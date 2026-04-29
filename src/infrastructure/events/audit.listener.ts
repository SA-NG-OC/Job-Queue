import { appEmitter } from './event-emitter';
import { logAuditUseCase } from '../../container';
import { AuditAction } from '../../domain/audit/entities/audit-log.entity';

export type AuditEvent = {
    action: AuditAction;
    userId: string;
    jobId?: string;
    meta?: Record<string, unknown>;
};

export const registerAuditListeners = (): void => {
    appEmitter.on('audit', async (event: AuditEvent) => {
        try {
            await logAuditUseCase({
                action: event.action,
                userId: event.userId,
                jobId: event.jobId,
                meta: event.meta,
            });
        } catch (err) {
            console.error('[Audit Listener] Failed to log audit event:', err);
        }
    });

    console.log('[Audit Listener] Registered');
};

export const emitAudit = (event: AuditEvent): void => {
    appEmitter.emit('audit', event);
};