import { eq, and, count, desc } from 'drizzle-orm';
import { ScheduleRepository, ScheduleFilter, PaginatedSchedules } from '../../../domain/schedule/repositories/schedule.repository';
import { ScheduleEntity, createScheduleEntity } from '../../../domain/schedule/entities/schedule.entity';
import { JobType } from '../../../domain/job/value-objects/job-type.vo';
import { JobPayload } from '../../../domain/job/value-objects/job-payload.vo';
import { createCronExpr } from '../../../domain/schedule/value-objects/cron-expr.vo';
import { schedules } from '../../../db/schema';
import { db } from '../../../db';

const toEntity = (row: typeof schedules.$inferSelect): ScheduleEntity => {
    const cronResult = createCronExpr(row.cronExpr);
    if (!cronResult.success) throw new Error('Corrupt cron expr in DB');

    return createScheduleEntity(row.id, {
        name: row.name,
        jobType: row.jobType as JobType,
        payload: row.payload as JobPayload,
        cronExpr: cronResult.value,
        isActive: row.isActive,
        lastRunAt: row.lastRunAt,
        nextRunAt: row.nextRunAt,
        createdAt: row.createdAt,
        userId: row.userId,
    });
}

export const scheduleDrizzleRepository: ScheduleRepository = {
    findById: async (id) => {
        const row = await db.query.schedules.findFirst({ where: eq(schedules.id, id) });
        return row ? toEntity(row) : null;
    },

    findMany: async (filter: ScheduleFilter): Promise<PaginatedSchedules> => {
        const page = filter.page ?? 1;
        const limit = filter.limit ?? 10;
        const offset = (page - 1) * limit;

        const conditions = [
            filter.userId ? eq(schedules.userId, filter.userId) : undefined,
            filter.isActive !== undefined ? eq(schedules.isActive, filter.isActive) : undefined,
        ].filter(Boolean) as ReturnType<typeof eq>[];

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const [rows, [{ value: total }]] = await Promise.all([
            db.query.schedules.findMany({ where, limit, offset, orderBy: desc(schedules.createdAt), }),
            db.select({ value: count() }).from(schedules).where(where),
        ]);
        return { data: rows.map(toEntity), total: Number(total), page, limit };
    },

    findAllActive: async () => {
        const rows = await db.query.schedules.findMany({
            where: eq(schedules.isActive, true),
        });
        return rows.map(toEntity);
    },

    save: async (schedule) => {
        const [row] = await db
            .insert(schedules)
            .values({
                id: schedule.id,
                name: schedule.name,
                jobType: schedule.jobType,
                payload: schedule.payload,
                cronExpr: schedule.cronExpr.value,
                isActive: schedule.isActive,
                lastRunAt: schedule.lastRunAt,
                nextRunAt: schedule.nextRunAt,
                createdAt: schedule.createdAt,
                userId: schedule.userId,
            })
            .returning();
        return toEntity(row);
    },

    update: async (schedule) => {
        const [row] = await db
            .update(schedules)
            .set({
                name: schedule.name,
                payload: schedule.payload,
                cronExpr: schedule.cronExpr.value,
                isActive: schedule.isActive,
                lastRunAt: schedule.lastRunAt,
                nextRunAt: schedule.nextRunAt,
            })
            .where(eq(schedules.id, schedule.id))
            .returning();
        return toEntity(row);
    },

    delete: async (id) => {
        await db.delete(schedules).where(eq(schedules.id, id));
    },

    getAll: async () => {
        const rows = await db.query.schedules.findMany();
        return rows.map(toEntity);
    },
}