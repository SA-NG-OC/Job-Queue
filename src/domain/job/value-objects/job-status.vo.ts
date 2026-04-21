export const JOB_STATUSES = [
    'PENDING',
    'ACTIVE',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const canTransitionTo = (from: JobStatus, to: JobStatus): boolean => {
    const transitions: Record<JobStatus, JobStatus[]> = {
        PENDING: ['ACTIVE', 'CANCELLED'],
        ACTIVE: ['COMPLETED', 'FAILED'],
        COMPLETED: [],
        FAILED: ['PENDING'], // retry
        CANCELLED: [],
    };
    return transitions[from].includes(to);
};