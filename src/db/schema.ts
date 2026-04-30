import {
    pgTable, uuid, text, timestamp, integer,
    boolean, jsonb, pgEnum, index, uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['USER', 'ADMIN']);
export const jobTypeEnum = pgEnum('job_type', [
    'SEND_EMAIL', 'SEND_SMS', 'RESIZE_IMAGE',
    'COMPRESS_VIDEO', 'GENERATE_PDF', 'EXPORT_CSV', 'CALL_WEBHOOK',
]);
export const jobStatusEnum = pgEnum('job_status', [
    'PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED',
]);

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').default('USER').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
    uniqueIndex('users_email_idx').on(t.email),
    index('users_role_idx').on(t.role),
    index('users_created_at_idx').on(t.createdAt),
]);

export const apiKeys = pgTable('api_keys', {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull().unique(),
    name: text('name').notNull(),
    userId: uuid('user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
}, (t) => [
    uniqueIndex('api_keys_key_idx').on(t.key),
    index('api_keys_user_id_idx').on(t.userId),
    index('api_keys_expires_at_idx').on(t.expiresAt),
]);

export const jobs = pgTable('jobs', {
    id: uuid('id').primaryKey().defaultRandom(),
    type: jobTypeEnum('type').notNull(),
    status: jobStatusEnum('status').default('PENDING').notNull(),
    payload: jsonb('payload').notNull(),
    result: jsonb('result'),
    error: text('error'),
    priority: integer('priority').default(0).notNull(),
    attempts: integer('attempts').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(3).notNull(),
    delay: integer('delay'),
    scheduledAt: timestamp('scheduled_at'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    userId: uuid('user_id').notNull().references(() => users.id),
}, (t) => [
    index('jobs_status_priority_idx').on(t.status, t.priority),
    index('jobs_user_id_status_idx').on(t.userId, t.status),
    index('jobs_type_idx').on(t.type),
    index('jobs_scheduled_at_idx').on(t.scheduledAt),
    index('jobs_created_at_idx').on(t.createdAt),
]);

export const schedules = pgTable('schedules', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    jobType: jobTypeEnum('job_type').notNull(),
    payload: jsonb('payload').notNull(),
    cronExpr: text('cron_expr').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    lastRunAt: timestamp('last_run_at'),
    nextRunAt: timestamp('next_run_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
}, (t) => [
    index('schedules_is_active_next_run_at_idx').on(t.isActive, t.nextRunAt),
    index('schedules_user_id_idx').on(t.userId),
]);

export const webhooks = pgTable('webhooks', {
    id: uuid('id').primaryKey().defaultRandom(),
    url: text('url').notNull(),
    events: text('events').array().notNull(),
    userId: uuid('user_id').notNull().references(() => users.id),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
    index('webhooks_is_active_idx').on(t.isActive),
    index('webhooks_user_id_idx').on(t.userId),
]);

export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    action: text('action').notNull(),
    userId: uuid('user_id').notNull().references(() => users.id),
    jobId: uuid('job_id').references(() => jobs.id),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
    index('audit_logs_user_id_created_at_idx').on(t.userId, t.createdAt),
    index('audit_logs_job_id_idx').on(t.jobId),
    index('audit_logs_created_at_idx').on(t.createdAt),
]);

export const usersRelations = relations(users, ({ many }) => ({
    apiKeys: many(apiKeys),
    jobs: many(jobs),
    webhooks: many(webhooks),
    auditLogs: many(auditLogs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
    user: one(users, { fields: [jobs.userId], references: [users.id] }),
    auditLogs: many(auditLogs),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
    job: one(jobs, { fields: [auditLogs.jobId], references: [jobs.id] }),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
    user: one(users, {
        fields: [schedules.userId],
        references: [users.id],
    }),
}));