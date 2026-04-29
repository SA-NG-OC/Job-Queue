import { AuditLogEntity, AuditAction } from '../entities/audit-log.entity';

export type AuditFilter = {
    userId?: string;
    action?: AuditAction;
    jobId?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
};

export type PaginatedAuditLogs = {
    data: AuditLogEntity[];
    total: number;
    page: number;
    limit: number;
};

export type AuditRepository = {
    save: (log: AuditLogEntity) => Promise<AuditLogEntity>;
    findMany: (filter: AuditFilter) => Promise<PaginatedAuditLogs>;
};