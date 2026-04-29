import { ScheduleRepository, ScheduleFilter } from "../../domain/schedule/repositories/schedule.repository";
import { scheduleToJSON } from "../../domain/schedule/entities/schedule.entity";
import { Result, ok, err } from "../../domain/shared/result";

export const makeGetSchedulesUseCase =
    (scheduleRepo: ScheduleRepository) =>
        async (filter: ScheduleFilter): Promise<
            Result<{
                data: ReturnType<typeof scheduleToJSON>[];
                total: number;
                page: number;
                limit: number;
            }>
        > => {
            try {
                const result = await scheduleRepo.findMany(filter);

                return ok({
                    ...result,
                    data: result.data.map(scheduleToJSON),
                });
            } catch (error) {
                return err('Failed to fetch schedules');
            }
        };