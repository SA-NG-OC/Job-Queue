import { scheduleToJSON } from "../../domain/schedule/entities/schedule.entity";
import { ScheduleRepository } from "../../domain/schedule/repositories/schedule.repository";
import { buildNewSchedule, createScheduleInput } from "../../domain/schedule/services/schedule.domain.service";
import { err, ok, Result } from "../../domain/shared/result";
import parser from 'cron-parser';
import { registerSchedule } from "../../infrastructure/queue/bullmq/scheduler";
import { jobDrizzleRepository } from "../../domain/job/repositories/job.drizzle.repository";
import { makeCreateJobUseCase } from "../job/create-job.use-case";
import { JobRepository } from "../../domain/job/repositories/job.repository";
import { enqueueFromSchedule } from "./helpers/enqueue-from-schedule";

const createJob = makeCreateJobUseCase(jobDrizzleRepository);

export const makeCreateScheduleUseCase =
    (scheduleRepo: ScheduleRepository, jobRepo: JobRepository) =>
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

            registerSchedule(updated.id, updated.cronExpr.value, async () => {
                await enqueueFromSchedule(updated, jobRepo);
            });

            return ok(scheduleToJSON(updated));
        };