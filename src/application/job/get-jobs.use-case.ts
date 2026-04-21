import { jobToJSON } from "../../domain/job/entities/job.entity";
import { JobFilter, JobRepository } from "../../domain/job/repositories/job.repository";
import { err, ok, Result } from "../../domain/shared/result";

export type GetJobsQuery = JobFilter;

export type PagniatedJobsJSON = {
    data: ReturnType<typeof jobToJSON>[];
    total: number;
    page: number;
    limit: number;
};

export const makeGetJobsUseCase =
    (jobRepo: JobRepository) =>
        async (query: GetJobsQuery): Promise<Result<PagniatedJobsJSON>> => {
            const result = await jobRepo.findMany(query);
            return ok({
                ...result,
                data: result.data.map(jobToJSON),
            });
        };

export const makeGetJobByIdUseCase =
    (jobRepo: JobRepository) =>
        async (id: string, userId: string): Promise<Result<ReturnType<typeof jobToJSON>>> => {
            const job = await jobRepo.findById(id);
            if (!job) return err('Job không tìm thấy');
            if (job.userId !== userId) return err('Không có quyền xem job này');
            return ok(jobToJSON(job));
        };