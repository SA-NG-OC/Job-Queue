import { Result, ok, err } from '../../shared/result';

const CRON_REGEX = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;

export type CronExpr = { readonly _brand: 'CronExpr'; readonly value: string };

export const createCronExpr = (raw: string): Result<CronExpr> => {
    const trimmed = raw.trim();
    if (!CRON_REGEX.test(trimmed)) {
        return err('Cron expression không hợp lệ. Ví dụ "0 9 * * 1-5" (9am mỗi ngày làm việc)');
    }
    return ok({ _brand: 'CronExpr', value: trimmed } as CronExpr);
};

export const CRON_PRESETS = {
    EVERY_MINUTE: '* * * * *',
    EVERY_HOUR: '0 * * * *',
    EVERY_DAY_9AM: '0 9 * * *',
    EVERY_MONDAY: '0 9 * * 1',
    EVERY_MONTH: '0 9 1 * *',
} as const;