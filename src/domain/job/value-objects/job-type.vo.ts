import { Result, ok, err } from "../../shared/result";

export const JOB_TYPES = [
    'SEND_EMAIL',
    'SEND_SMS',
    'RESIZE_IMAGE',
    'COMPRESS_VIDEO',
    'GENERATE_PDF',
    'EXPORT_CSV',
    'CALL_WEBHOOK',
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const createJobType = (raw: string): Result<JobType> => {
    if (!JOB_TYPES.includes(raw as JobType)) {
        return err(`Job type không hợp lệ. Các loại hợp lệ: ${JOB_TYPES.join(', ')}`);
    }
    return ok(raw as JobType);
};