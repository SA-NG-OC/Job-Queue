import { CronJob } from 'cron';
import parser from 'cron-parser';
import { markScheduleRan } from '../../../domain/schedule/entities/schedule.entity';
import { scheduleDrizzleRepository } from '../../../domain/schedule/repositories/schedule.drizzle.repository';
import { jobDrizzleRepository } from '../../../domain/job/repositories/job.drizzle.repository';
import { makeCreateJobUseCase } from '../../../application/job/create-job.use-case';

const createJob = makeCreateJobUseCase(jobDrizzleRepository);

const registeredSchedulers = new Map<string, CronJob>();

export const registerSchedule = (
    id: string,
    cronExpr: string,
    handler: () => Promise<void>
): void => {
    stopSchedule(id);

    try {
        const job = new CronJob(
            cronExpr,
            async () => {
                try {
                    await handler();
                } catch (error) {
                    console.error(`[Scheduler] Execution failed for ${id}:`, error);
                }
            },
            null,
            true,
            'Asia/Ho_Chi_Minh'
        );

        registeredSchedulers.set(id, job);
    } catch (err) {
        console.error(`[Scheduler] Invalid cron expression for ${id}: ${cronExpr}`, err);
    }
};

export const startScheduler = async (): Promise<void> => {
    try {
        const activeSchedules = await scheduleDrizzleRepository.findAllActive();
        console.log(`[Scheduler] Initializing ${activeSchedules.length} active schedules...`);

        await Promise.all(
            activeSchedules.map(async (schedule) => {
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
                        console.error(`[Scheduler] Failed to create job [${schedule.name}]:`, result.error);
                        return;
                    }

                    const nextRunAt = parser.parseExpression(schedule.cronExpr.value).next().toDate();
                    await scheduleDrizzleRepository.update(
                        markScheduleRan(schedule, nextRunAt)
                    );

                    console.log(`[Scheduler] SUCCESS: ${schedule.name} | Next run: ${nextRunAt.toLocaleString()}`);
                });
            })
        );

        console.log(`[Scheduler] All active schedules are ready.`);
    } catch (error) {
        console.error("[Scheduler] Critical failure during startup:", error);
    }
};


export const stopSchedule = (id: string): void => {
    const job = registeredSchedulers.get(id);
    if (job) {
        job.stop();
        registeredSchedulers.delete(id);
        console.log(`[Scheduler] Stopped and cleared: ${id}`);
    }
};

export const stopAllSchedulers = (): void => {
    console.log("[Scheduler] Stopping all schedules...");
    for (const [id, job] of registeredSchedulers) {
        job.stop();
    }
    registeredSchedulers.clear();
};