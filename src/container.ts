import { userDrizzleRepository } from './domain/auth/repositories/user.drizzle.repository';
import { makeRegisterUseCase } from './application/auth/register.use-case';
import { makeLoginUseCase } from './application/auth/login.use-case';
import { makeRefreshTokenUseCase } from './application/auth/refresh-token.use-case';
import { makeCreateJobUseCase } from './application/job/create-job.use-case';
import { makeGetJobByIdUseCase, makeGetJobsUseCase } from './application/job/get-jobs.use-case';
import { makeCancelJobUseCase } from './application/job/cancel-job.use-case';
import { makeRetryJobUseCase } from './application/job/retry-job.use-case';
import { jobDrizzleRepository } from './domain/job/repositories/job.drizzle.repository';
import { scheduleDrizzleRepository } from './domain/schedule/repositories/schedule.drizzle.repository';
import { makeCreateScheduleUseCase } from './application/schedule/create-schedule.use-case';
import { makeUpdateScheduleUseCase } from './application/schedule/update-schedule.use-case';
import { makeToggleScheduleUseCase } from './application/schedule/toggle-schedule.use-case';
import { makeDeleteScheduleUseCase } from './application/schedule/delete-schedule.use-case';
import { makeRegisterWebhookUseCase } from './application/webhook/register-webhook.use-case';
import { makeDeleteWebhookUseCase } from './application/webhook/delete-webhook.use-case';
import { makeDispatchWebhookUseCase } from './application/webhook/dispatch-webhook.use-case';
import { makeGetAuditLogsUseCase, makeLogAuditUseCase } from './application/audit/log-audit.use-case';
import { webhookDrizzleRepository } from './domain/webhook/repositories/webhook.drizzle.repository';
import { auditDrizzleRepository } from './domain/audit/repositories/audit.drizzle.repository';
import { makeGetSchedulesUseCase } from './application/schedule/get-schedules.usecase';

// Wire repositories
const userRepo = userDrizzleRepository;
const jobRepo = jobDrizzleRepository;
const scheduleRepo = scheduleDrizzleRepository;
const webhookRepo = webhookDrizzleRepository;
const auditRepo = auditDrizzleRepository;

// Auth use case
export const registerUseCase = makeRegisterUseCase(userRepo);
export const loginUseCase = makeLoginUseCase(userRepo);
export const refreshTokenUseCase = makeRefreshTokenUseCase(userRepo);

// Job use case
export const createJobUseCase = makeCreateJobUseCase(jobRepo);
export const getJobsUseCase = makeGetJobsUseCase(jobRepo);
export const getJobByIdUseCase = makeGetJobByIdUseCase(jobRepo);
export const cancelJobUseCase = makeCancelJobUseCase(jobRepo);
export const retryJobUseCase = makeRetryJobUseCase(jobRepo);

// ── Schedule ──────────────────────────────────────────────
export const createScheduleUseCase = makeCreateScheduleUseCase(scheduleRepo, jobRepo);
export const updateScheduleUseCase = makeUpdateScheduleUseCase(scheduleRepo, jobRepo);
export const toggleScheduleUseCase = makeToggleScheduleUseCase(scheduleRepo, jobRepo);
export const deleteScheduleUseCase = makeDeleteScheduleUseCase(scheduleRepo);
export const getSchedulesUseCase = makeGetSchedulesUseCase(scheduleRepo);

// ── Webhook ───────────────────────────────────────────────
export const registerWebhookUseCase = makeRegisterWebhookUseCase(webhookRepo);
export const deleteWebhookUseCase = makeDeleteWebhookUseCase(webhookRepo);
export const dispatchWebhookUseCase = makeDispatchWebhookUseCase(webhookRepo);
export const getWebhooksUseCase = (userId: string) => webhookRepo.findByUserId(userId);

// ── Audit ─────────────────────────────────────────────────
export const logAuditUseCase = makeLogAuditUseCase(auditRepo);
export const getAuditLogsUseCase = makeGetAuditLogsUseCase(auditRepo);