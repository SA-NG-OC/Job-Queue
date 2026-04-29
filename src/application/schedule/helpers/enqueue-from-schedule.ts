import { ScheduleEntity } from "../../../domain/schedule/entities/schedule.entity";
import { makeCreateJobUseCase } from "../../job/create-job.use-case";


export const enqueueFromSchedule = async (
    schedule: ScheduleEntity,
    createJobUseCase: ReturnType<typeof makeCreateJobUseCase>
) => {
    const result = await createJobUseCase({
        type: schedule.jobType,
        payload: schedule.payload,
        userId: schedule.userId,
        scheduledAt: new Date(),
    });

    if (!result.success) {
        throw new Error(result.error);
    }

    return result.value;
};