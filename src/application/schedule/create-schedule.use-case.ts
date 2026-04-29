import { scheduleToJSON } from "../../domain/schedule/entities/schedule.entity";
import { ScheduleRepository } from "../../domain/schedule/repositories/schedule.repository";
import { buildNewSchedule, createScheduleInput } from "../../domain/schedule/services/schedule.domain.service";
import { err, ok, Result } from "../../domain/shared/result";
import parser from 'cron-parser';
import { registerSchedule } from "../../infrastructure/queue/bullmq/scheduler";
import { enqueueFromSchedule } from "./helpers/enqueue-from-schedule";
import { emitAudit } from "../../infrastructure/events/audit.listener";
import { createJobUseCase } from "../../container";

export const makeCreateScheduleUseCase =
    (scheduleRepo: ScheduleRepository) =>
        async (cmd: createScheduleInput): Promise<Result<ReturnType<typeof scheduleToJSON>>> => {

            const scheduleResult = buildNewSchedule(cmd);
            if (!scheduleResult.success) return err(scheduleResult.error);

            const saved = await scheduleRepo.save(scheduleResult.value);

            const interval = parser.parseExpression(saved.cronExpr.value);
            const nextRunAt = interval.next().toDate();

            const updated = await scheduleRepo.update({
                ...saved,
                nextRunAt,
            });

            emitAudit({
                action: 'schedule.created',
                userId: cmd.userId,
                meta: { scheduleId: updated.id, name: updated.name, cronExpr: updated.cronExpr.value },
            });

            registerSchedule(updated.id, updated.cronExpr.value, async () => {
                await enqueueFromSchedule(updated, createJobUseCase);
            });

            return ok(scheduleToJSON(updated));
        };