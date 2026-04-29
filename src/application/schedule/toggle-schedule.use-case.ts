import { UserRole } from "../../domain/auth/entities/user.entity";
import { JobRepository } from "../../domain/job/repositories/job.repository";
import { toggleSchedule, scheduleToJSON } from "../../domain/schedule/entities/schedule.entity";
import { ScheduleRepository } from "../../domain/schedule/repositories/schedule.repository";
import { err, ok, Result } from "../../domain/shared/result";
import { registerSchedule, stopSchedule } from "../../infrastructure/queue/bullmq/scheduler";
import parser from "cron-parser";
import { enqueueFromSchedule } from "./helpers/enqueue-from-schedule";
import { emitAudit } from "../../infrastructure/events/audit.listener";
import { createJobUseCase } from "../../container";

export const makeToggleScheduleUseCase =
    (scheduleRepo: ScheduleRepository) =>
        async (
            id: string,
            requesterId: string,
            requesterRole: UserRole,
        ): Promise<Result<ReturnType<typeof scheduleToJSON>>> => {

            const schedule = await scheduleRepo.findById(id);
            if (!schedule) return err("Không tìm thấy schedule");

            if (requesterRole !== "ADMIN" && schedule.userId !== requesterId) {
                return err("Bạn không có quyền thay đổi schedule này");
            }

            const toggled = toggleSchedule(schedule);

            let saved = await scheduleRepo.update(toggled);

            emitAudit({
                action: 'schedule.toggled',
                userId: requesterId,
                meta: { scheduleId: saved.id, isActive: saved.isActive },
            });

            if (saved.isActive) {
                const interval = parser.parseExpression(saved.cronExpr.value);
                const nextRunAt = interval.next().toDate();

                saved = await scheduleRepo.update({
                    ...saved,
                    nextRunAt,
                });

                registerSchedule(saved.id, saved.cronExpr.value, async () => {
                    await enqueueFromSchedule(saved, createJobUseCase);
                });

            } else {
                stopSchedule(saved.id);
            }

            return ok(scheduleToJSON(saved));
        };