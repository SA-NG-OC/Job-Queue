import { describe, it, expect } from 'vitest';
import { createCronExpr, CRON_PRESETS } from './cron-expr.vo';

describe('CronExpr Value Object', () => {

    describe('createCronExpr() - valid', () => {

        it('gắn đúng _brand CronExpr', () => {
            const result = createCronExpr('* * * * *');

            expect(result.success).toBe(true);
            if (result.success) expect(result.value._brand).toBe('CronExpr');
        });

        it('giữ nguyên giá trị sau khi tạo', () => {
            const result = createCronExpr('0 9 * * 1');

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.value).toBe('0 9 * * 1');
        });

        it('trim whitespace đầu cuối', () => {
            const result = createCronExpr('  * * * * *  ');

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.value).toBe('* * * * *');
        });

        it('* * * * * (every minute)', () => {
            expect(createCronExpr('* * * * *').success).toBe(true);
        });

        it('0 * * * * (every hour)', () => {
            expect(createCronExpr('0 * * * *').success).toBe(true);
        });

        it('0 9 * * * (every day 9am)', () => {
            expect(createCronExpr('0 9 * * *').success).toBe(true);
        });

        it('0 9 * * 1 (every monday)', () => {
            expect(createCronExpr('0 9 * * 1').success).toBe(true);
        });

        it('0 9 1 * * (every month)', () => {
            expect(createCronExpr('0 9 1 * *').success).toBe(true);
        });

        it('59 23 31 12 6 (biên trên các trường)', () => {
            expect(createCronExpr('59 23 31 12 6').success).toBe(true);
        });

        it('0 0 1 1 0 (biên dưới các trường)', () => {
            expect(createCronExpr('0 0 1 1 0').success).toBe(true);
        });

        it('*/5 * * * * (step trường minute)', () => {
            expect(createCronExpr('*/5 * * * *').success).toBe(true);
        });

        it('0 */6 * * * (step trường hour)', () => {
            expect(createCronExpr('0 */6 * * *').success).toBe(true);
        });

        it('0 9 */2 * * (step trường day)', () => {
            expect(createCronExpr('0 9 */2 * *').success).toBe(true);
        });

    });

    describe('createCronExpr() - invalid', () => {

        it('trả về lỗi khi chuỗi rỗng', () => {
            const result = createCronExpr('');

            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toContain('Cron expression không hợp lệ');
        });

        it('trả về lỗi khi chỉ có khoảng trắng', () => {
            const result = createCronExpr('   ');
            expect(result.success).toBe(false);
        });

        it('trả về lỗi khi thiếu trường (chỉ có 4 phần)', () => {
            expect(createCronExpr('* * * *').success).toBe(false);
        });

        it('trả về lỗi khi thừa trường (có 6 phần)', () => {
            expect(createCronExpr('* * * * * *').success).toBe(false);
        });

        it('trả về lỗi khi minute > 59', () => {
            expect(createCronExpr('60 * * * *').success).toBe(false);
        });

        it('trả về lỗi khi hour > 23', () => {
            expect(createCronExpr('0 24 * * *').success).toBe(false);
        });

        it('trả về lỗi khi day = 0', () => {
            expect(createCronExpr('0 9 0 * *').success).toBe(false);
        });

        it('trả về lỗi khi day > 31', () => {
            expect(createCronExpr('0 9 32 * *').success).toBe(false);
        });

        it('trả về lỗi khi month = 0', () => {
            expect(createCronExpr('0 9 1 0 *').success).toBe(false);
        });

        it('trả về lỗi khi month > 12', () => {
            expect(createCronExpr('0 9 1 13 *').success).toBe(false);
        });

        it('trả về lỗi khi weekday > 6', () => {
            expect(createCronExpr('0 9 * * 7').success).toBe(false);
        });

        it('trả về lỗi khi dùng range (1-5) — không hỗ trợ', () => {
            expect(createCronExpr('0 9 * * 1-5').success).toBe(false);
        });

        it('trả về lỗi khi dùng chữ thay số', () => {
            expect(createCronExpr('0 9 * * MON').success).toBe(false);
        });

    });

    describe('CRON_PRESETS', () => {

        it('tất cả preset đều hợp lệ', () => {
            for (const expr of Object.values(CRON_PRESETS)) {
                const result = createCronExpr(expr);
                expect(result.success).toBe(true);
            }
        });

        it('EVERY_MINUTE là * * * * *', () => {
            expect(CRON_PRESETS.EVERY_MINUTE).toBe('* * * * *');
        });

        it('EVERY_HOUR là 0 * * * *', () => {
            expect(CRON_PRESETS.EVERY_HOUR).toBe('0 * * * *');
        });

        it('EVERY_DAY_9AM là 0 9 * * *', () => {
            expect(CRON_PRESETS.EVERY_DAY_9AM).toBe('0 9 * * *');
        });

        it('EVERY_MONDAY là 0 9 * * 1', () => {
            expect(CRON_PRESETS.EVERY_MONDAY).toBe('0 9 * * 1');
        });

        it('EVERY_MONTH là 0 9 1 * *', () => {
            expect(CRON_PRESETS.EVERY_MONTH).toBe('0 9 1 * *');
        });

        it('có đủ 5 preset', () => {
            expect(Object.keys(CRON_PRESETS)).toHaveLength(5);
        });

    });

});