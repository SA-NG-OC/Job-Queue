import { JobEntity } from "../entities/job.entity";
import { JobStatus } from "../value-objects/job-status.vo";
import { JobType } from "../value-objects/job-type.vo";

export type JobFilter = {
    userId?: string;
    status?: JobStatus;
    type?: JobType;
    page?: number;
    limit?: number;
};

export type PaginatedJobs = {
    data: JobEntity[];
    total: number;
    page: number;
    limit: number;
};

export type JobRepository = {
    findById: (id: string) => Promise<JobEntity | null>;
    findMany: (filter: JobFilter) => Promise<PaginatedJobs>;
    save: (job: JobEntity) => Promise<JobEntity>;
    update: (job: JobEntity) => Promise<JobEntity>;
    delete: (id: string) => Promise<void>;
};