import { markScheduleRan } from '../../../domain/schedule/entities/schedule.entity';
import { scheduleDrizzleRepository } from '../../../domain/schedule/repositories/schedule.drizzle.repository';
import parser from 'cron-parser';
import { jobDrizzleRepository } from '../../../domain/job/repositories/job.drizzle.repository';
import { makeCreateJobUseCase } from '../../../application/job/create-job.use-case';

const createJob = makeCreateJobUseCase(jobDrizzleRepository);

const registeredSchedulers = new Map<string, NodeJS.Timeout>();

const getMsUntilNext = (cronExpr: string): number => {
    const interval = parser.parseExpression(cronExpr);
    return interval.next().getTime() - Date.now();
};

export const registerSchedule = (
    id: string,
    cronExpr: string,
    handler: () => Promise<void>
): void => {
    stopSchedule(id);

    const scheduleNextTick = () => {
        const msUntilNext = getMsUntilNext(cronExpr);
        const delay = Math.max(msUntilNext, 10);

        const timer = setTimeout(async () => {
            try {
                await handler();
            } catch (error) {
                console.error(`[Scheduler] Error execution for ${id}:`, error);
            } finally {
                scheduleNextTick();
            }
        }, delay);

        registeredSchedulers.set(id, timer);
    };

    scheduleNextTick();
};

export const startScheduler = async (): Promise<void> => {
    try {
        const activeSchedules = await scheduleDrizzleRepository.findAllActive();
        console.log(`[Scheduler] Initializing ${activeSchedules.length} active schedules`);

        for (const schedule of activeSchedules) {

            registerSchedule(schedule.id, schedule.cronExpr.value, async () => {

                const result = await createJob({
                    type: schedule.jobType,
                    payload: schedule.payload,
                    userId: schedule.userId,
                    scheduledAt: new Date(),
                    priority: 0,
                    maxAttempts: 3,
                });

                if (!result.success) {
                    console.error(`[Scheduler] Failed to create job:`, result.error);
                    return;
                }

                const nextRunAt = parser.parseExpression(schedule.cronExpr.value).next().toDate();
                await scheduleDrizzleRepository.update(
                    markScheduleRan(schedule, nextRunAt)
                );

                console.log(`[Scheduler] Fired: ${schedule.name} | Next: ${nextRunAt.toISOString()}`);
            });
        }

    } catch (error) {
        console.error("[Scheduler] Failed to start:", error);
    }
};

export const stopSchedule = (id: string): void => {
    const timer = registeredSchedulers.get(id);
    if (timer) {
        clearTimeout(timer);
        registeredSchedulers.delete(id);
        console.log(`[Scheduler] Stopped: ${id}`);
    }
};