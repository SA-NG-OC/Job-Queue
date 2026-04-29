import { UserRole } from "../../domain/auth/entities/user.entity";
import { JobRepository } from "../../domain/job/repositories/job.repository";
import { validateJobPayload } from "../../domain/job/value-objects/job-payload.vo";
import { JobType } from "../../domain/job/value-objects/job-type.vo";
import { scheduleToJSON, updateScheduleConfig } from "../../domain/schedule/entities/schedule.entity";
import { ScheduleRepository } from "../../domain/schedule/repositories/schedule.repository";
import { createCronExpr } from "../../domain/schedule/value-objects/cron-expr.vo";
import { err, ok, Result } from "../../domain/shared/result";
import parser from 'cron-parser';
import { registerSchedule, stopSchedule } from "../../infrastructure/queue/bullmq/scheduler";
import { enqueueFromSchedule } from "./helpers/enqueue-from-schedule";
import { emitAudit } from "../../infrastructure/events/audit.listener";
import { createJobUseCase } from "../../container";

export type UpdateScheduleCommand = {
    id: string;
    requesterId: string;
    requesterRole: UserRole;
    name?: string;
    cronExpr?: string;
    payload?: unknown;
};

export const makeUpdateScheduleUseCase =
    (scheduleRepo: ScheduleRepository) =>
        async (cmd: UpdateScheduleCommand): Promise<Result<ReturnType<typeof scheduleToJSON>>> => {

            const schedule = await scheduleRepo.findById(cmd.id);
            if (!schedule) return err("Không tìm thấy schedule");

            if (cmd.requesterRole !== "ADMIN" && schedule.userId !== cmd.requesterId) {
                return err("Bạn không có quyền cập nhật schedule này");
            }

            const updates: Parameters<typeof updateScheduleConfig>[1] = {};

            if (cmd.name) updates.name = cmd.name;

            if (cmd.cronExpr) {
                const cronResult = createCronExpr(cmd.cronExpr);
                if (!cronResult.success) return err(cronResult.error);
                updates.cronExpr = cronResult.value;
            }

            if (cmd.payload) {
                const payloadResult = validateJobPayload(schedule.jobType, cmd.payload);
                if (!payloadResult.success) return err(payloadResult.error);
                updates.payload = payloadResult.value;
            }

            const updatedResult = updateScheduleConfig(schedule, updates);
            if (!updatedResult.success) return err(updatedResult.error);

            const interval = parser.parseExpression(updatedResult.value.cronExpr.value);
            const nextRunAt = interval.next().toDate();

            const saved = await scheduleRepo.update({
                ...updatedResult.value,
                nextRunAt,
            });

            emitAudit({
                action: 'schedule.updated',
                userId: cmd.requesterId,
                meta: { scheduleId: saved.id, changes: { name: cmd.name, cronExpr: cmd.cronExpr, payload: cmd.payload } },
            });

            stopSchedule(saved.id);

            try {
                registerSchedule(saved.id, saved.cronExpr.value, async () => {
                    await enqueueFromSchedule(saved, createJobUseCase);
                });
            } catch (e) {
                console.error("Failed to re-register schedule", e);
            }

            return ok(scheduleToJSON(saved));
        };