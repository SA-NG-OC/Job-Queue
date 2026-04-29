import { ScheduleEntity } from "../../../domain/schedule/entities/schedule.entity";
import { JobRepository } from "../../../domain/job/repositories/job.repository";
import { buildNewJob } from "../../../domain/job/services/job.domain.service";
import { getQueueByJobType } from "../../../infrastructure/queue/bullmq/client";

export const enqueueFromSchedule = async (
    schedule: ScheduleEntity,
    jobRepo: JobRepository,
) => {
    const jobResult = buildNewJob({
        type: schedule.jobType,
        payload: schedule.payload,
        userId: schedule.userId,
        scheduledAt: new Date(),
    });

    if (!jobResult.success) {
        throw new Error(jobResult.error);
    }

    const savedJob = await jobRepo.save(jobResult.value);

    const queue = getQueueByJobType(savedJob.type);

    await queue.add(
        savedJob.type,
        {
            jobId: savedJob.id,
            type: savedJob.type,
            payload: savedJob.payload,
        },
        {
            jobId: savedJob.id,
            priority: savedJob.priority,
            delay: savedJob.delay ?? undefined,
        }
    );

    return savedJob;
};