import { and, count, eq, gte } from "drizzle-orm";
import { auditLogs } from "../../../db/schema";
import { AuditAction, AuditLogEntity, createAuditLog } from "../entities/audit-log.entity";
import { AuditFilter, AuditRepository } from "./audit.repository";
import { lte } from "drizzle-orm";
import { db } from "../../../db";

const toEntity = (row: typeof auditLogs.$inferSelect): AuditLogEntity =>
    createAuditLog(
        row.id,
        row.action as AuditAction,
        row.userId,
        row.jobId,
        row.meta as Record<string, unknown> | null,
    );

export const auditDrizzleRepository: AuditRepository = {
    save: async (log) => {
        const [row] = await db
            .insert(auditLogs)
            .values({
                id: log.id,
                action: log.action,
                userId: log.userId,
                jobId: log.jobId,
                meta: log.meta,
                createdAt: log.createdAt,
            })
            .returning();
        return toEntity(row);
    },

    findMany: async (filter: AuditFilter) => {
        const page = filter.page ?? 1;
        const limit = filter.limit ?? 20;
        const offset = (page - 1) * limit;

        const conditions = [
            filter.userId ? eq(auditLogs.userId, filter.userId) : undefined,
            filter.action ? eq(auditLogs.action, filter.action) : undefined,
            filter.jobId ? eq(auditLogs.jobId, filter.jobId) : undefined,
            filter.fromDate ? gte(auditLogs.createdAt, filter.fromDate) : undefined,
            filter.toDate ? lte(auditLogs.createdAt, filter.toDate) : undefined,
        ].filter(Boolean) as ReturnType<typeof eq>[];

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const [rows, [{ value: total }]] = await Promise.all([
            db.query.auditLogs.findMany({ where, limit, offset, orderBy: (t, { desc }) => [desc(t.createdAt)] }),
            db.select({ value: count() }).from(auditLogs).where(where),
        ]);

        return { data: rows.map(toEntity), total: Number(total), page, limit };
    },
}