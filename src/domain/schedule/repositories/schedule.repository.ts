import { ScheduleEntity } from "../entities/schedule.entity";

export type ScheduleFilter = {
    userId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
};

export type PaginatedSchedules = {
    data: ScheduleEntity[],
    total: number;
    page: number;
    limit: number;
}

export type ScheduleRepository = {
    findById: (id: string) => Promise<ScheduleEntity | null>;
    findMany: (filter: ScheduleFilter) => Promise<PaginatedSchedules>;
    findAllActive: () => Promise<ScheduleEntity[]>;
    save: (schedule: ScheduleEntity) => Promise<ScheduleEntity>;
    update: (schedule: ScheduleEntity) => Promise<ScheduleEntity>;
    delete: (id: string) => Promise<void>;
    getAll(): Promise<ScheduleEntity[]>;
}