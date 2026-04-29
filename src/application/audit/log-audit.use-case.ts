import { v4 as uuidv4 } from 'uuid';
import { AuditAction, createAuditLog } from '../../domain/audit/entities/audit-log.entity';
import { AuditRepository } from '../../domain/audit/repositories/audit.repository';

export type LogAuditCommand = {
    action: AuditAction;
    userId: string;
    jobId?: string;
    meta?: Record<string, unknown>;
};

export const makeLogAuditUseCase =
    (auditRepo: AuditRepository) =>
        async (cmd: LogAuditCommand): Promise<void> => {
            const log = createAuditLog(
                uuidv4(),
                cmd.action,
                cmd.userId,
                cmd.jobId ?? null,
                cmd.meta ?? null,
            );
            await auditRepo.save(log);
        };

export const makeGetAuditLogsUseCase =
    (auditRepo: AuditRepository) =>
        async (filter: Parameters<AuditRepository['findMany']>[0]) => {
            return auditRepo.findMany(filter);
        };