import { and, count, eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { jobs } from "../../db/schema";
import { createJobEntity, JobEntity } from "../../domain/job/entities/job.entity";
import { JobPayload } from "../../domain/job/value-objects/job-payload.vo";
import { JobStatus } from "../../domain/job/value-objects/job-status.vo";
import { JobType } from "../../domain/job/value-objects/job-type.vo";
import { JobFilter, JobRepository } from "../../domain/job/repositories/job.repository";

const toEntity = (row: typeof jobs.$inferSelect): JobEntity =>
    createJobEntity(row.id, {
        type: row.type as JobType,
        status: row.status as JobStatus,
        payload: row.payload as JobPayload,
        result: row.result as Record<string, unknown> | null,
        error: row.error,
        priority: row.priority,
        attempts: row.attempts,
        maxAttempts: row.maxAttempts,
        delay: row.delay,
        scheduledAt: row.scheduledAt,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        createdAt: row.createdAt,
        userId: row.userId,
    });

export const jobDrizzleRepository: JobRepository = {
    findById: async (id) => {
        const row = await db.query.jobs.findFirst({ where: eq(jobs.id, id) });
        return row ? toEntity(row) : null;
    },

    findMany: async (filter: JobFilter) => {
        const page = filter.page ?? 1;
        const limit = filter.limit ?? 10;
        const offset = (page - 1) * limit;

        const conditions = [filter.userId ? eq(jobs.userId, filter.userId) : undefined,
        filter.status ? eq(jobs.status, filter.status) : undefined,
        filter.type ? eq(jobs.type, filter.type) : undefined,].filter(Boolean) as ReturnType<typeof eq>[];

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const [rows, [{ value: total }]] = await Promise.all([
            db.query.jobs.findMany({ where, limit, offset, orderBy: desc(jobs.createdAt), }),
            db.select({ value: count() }).from(jobs).where(where),
        ]);

        return { data: rows.map(toEntity), total: Number(total), page, limit };
    },

    save: async (job) => {
        const [row] = await db.insert(jobs)
            .values({
                id: job.id,
                type: job.type,
                status: job.status,
                payload: job.payload,
                result: job.result,
                error: job.error,
                priority: job.priority,
                attempts: job.attempts,
                maxAttempts: job.maxAttempts,
                delay: job.delay,
                scheduledAt: job.scheduledAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                createdAt: job.createdAt,
                userId: job.userId,
            })
            .returning();
        return toEntity(row);
    },

    update: async (job) => {
        const [row] = await db
            .update(jobs)
            .set({
                status: job.status,
                result: job.result,
                error: job.error,
                attempts: job.attempts,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
            })
            .where(eq(jobs.id, job.id))
            .returning();
        return toEntity(row);
    },

    delete: async (id) => {
        await db.delete(jobs).where(eq(jobs.id, id));
    },
}