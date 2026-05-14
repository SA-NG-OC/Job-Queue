import { describe, it, expect } from 'vitest';
import {
    createScheduleEntity,
    markScheduleRan,
    toggleSchedule,
    updateScheduleConfig,
    scheduleToJSON,
    ScheduleEntity,
} from './schedule.entity';

const MOCK_ID = 'schedule-uuid-1234';
const MOCK_USER_ID = 'user-uuid-5678';
const MOCK_CRON: import('../value-objects/cron-expr.vo').CronExpr = {
    _brand: 'CronExpr',
    value: '0 9 * * *',
};

const makeSchedule = (overrides: Partial<Omit<ScheduleEntity, 'id'>> = {}): ScheduleEntity =>
    createScheduleEntity(MOCK_ID, {
        name: 'Daily email report',
        jobType: 'SEND_EMAIL',
        payload: { to: 'user@example.com', subject: 'Report', body: 'Daily report' },
        cronExpr: MOCK_CRON,
        isActive: true,
        lastRunAt: null,
        nextRunAt: null,
        createdAt: new Date('2024-01-01'),
        userId: MOCK_USER_ID,
        ...overrides,
    });

describe('ScheduleEntity', () => {

    describe('createScheduleEntity()', () => {

        it('tạo entity với đầy đủ thông tin', () => {
            const schedule = makeSchedule();

            expect(schedule.id).toBe(MOCK_ID);
            expect(schedule.name).toBe('Daily email report');
            expect(schedule.jobType).toBe('SEND_EMAIL');
            expect(schedule.cronExpr).toBe(MOCK_CRON);
            expect(schedule.isActive).toBe(true);
            expect(schedule.lastRunAt).toBeNull();
            expect(schedule.nextRunAt).toBeNull();
            expect(schedule.userId).toBe(MOCK_USER_ID);
        });

        it('tạo được schedule với isActive = false', () => {
            const schedule = makeSchedule({ isActive: false });
            expect(schedule.isActive).toBe(false);
        });

        it('tạo được schedule với lastRunAt và nextRunAt', () => {
            const lastRunAt = new Date('2024-06-01');
            const nextRunAt = new Date('2024-06-02');
            const schedule = makeSchedule({ lastRunAt, nextRunAt });

            expect(schedule.lastRunAt).toEqual(lastRunAt);
            expect(schedule.nextRunAt).toEqual(nextRunAt);
        });

        it('tạo được với các jobType khác nhau', () => {
            const schedule = makeSchedule({ jobType: 'CALL_WEBHOOK' });
            expect(schedule.jobType).toBe('CALL_WEBHOOK');
        });

    });

    describe('markScheduleRan()', () => {

        it('cập nhật lastRunAt là thời điểm hiện tại', () => {
            const schedule = makeSchedule();
            const nextRunAt = new Date('2024-06-02');
            const before = new Date();
            const updated = markScheduleRan(schedule, nextRunAt);
            const after = new Date();

            expect(updated.lastRunAt).toBeInstanceOf(Date);
            expect(updated.lastRunAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(updated.lastRunAt!.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('cập nhật nextRunAt đúng giá trị truyền vào', () => {
            const schedule = makeSchedule();
            const nextRunAt = new Date('2024-06-02T09:00:00');
            const updated = markScheduleRan(schedule, nextRunAt);

            expect(updated.nextRunAt).toEqual(nextRunAt);
        });

        it('không thay đổi các field khác', () => {
            const schedule = makeSchedule();
            const updated = markScheduleRan(schedule, new Date());

            expect(updated.id).toBe(schedule.id);
            expect(updated.name).toBe(schedule.name);
            expect(updated.isActive).toBe(schedule.isActive);
            expect(updated.cronExpr).toBe(schedule.cronExpr);
        });

        it('không mutate schedule gốc', () => {
            const schedule = makeSchedule();
            markScheduleRan(schedule, new Date());

            expect(schedule.lastRunAt).toBeNull();
            expect(schedule.nextRunAt).toBeNull();
        });

    });

    describe('toggleSchedule()', () => {

        it('chuyển isActive từ true sang false', () => {
            const schedule = makeSchedule({ isActive: true });
            const updated = toggleSchedule(schedule);

            expect(updated.isActive).toBe(false);
        });

        it('chuyển isActive từ false sang true', () => {
            const schedule = makeSchedule({ isActive: false });
            const updated = toggleSchedule(schedule);

            expect(updated.isActive).toBe(true);
        });

        it('toggle hai lần trả về trạng thái ban đầu', () => {
            const schedule = makeSchedule({ isActive: true });
            const updated = toggleSchedule(toggleSchedule(schedule));

            expect(updated.isActive).toBe(true);
        });

        it('không thay đổi các field khác', () => {
            const schedule = makeSchedule({ isActive: true });
            const updated = toggleSchedule(schedule);

            expect(updated.id).toBe(schedule.id);
            expect(updated.name).toBe(schedule.name);
            expect(updated.cronExpr).toBe(schedule.cronExpr);
        });

        it('không mutate schedule gốc', () => {
            const schedule = makeSchedule({ isActive: true });
            toggleSchedule(schedule);

            expect(schedule.isActive).toBe(true);
        });

    });

    describe('updateScheduleConfig()', () => {

        it('cập nhật name thành công khi schedule đang bật', () => {
            const schedule = makeSchedule({ isActive: true });
            const result = updateScheduleConfig(schedule, { name: 'Updated name' });

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.name).toBe('Updated name');
        });

        it('cập nhật cronExpr thành công', () => {
            const newCron: import('../value-objects/cron-expr.vo').CronExpr = {
                _brand: 'CronExpr',
                value: '0 8 * * 1',
            };
            const schedule = makeSchedule({ isActive: true });
            const result = updateScheduleConfig(schedule, { cronExpr: newCron });

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.cronExpr.value).toBe('0 8 * * 1');
        });

        it('cập nhật payload thành công', () => {
            const schedule = makeSchedule({ isActive: true });
            const newPayload = { to: 'new@example.com', subject: 'New', body: 'Updated body' };
            const result = updateScheduleConfig(schedule, { payload: newPayload });

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.payload).toEqual(newPayload);
        });

        it('cập nhật nhiều field cùng lúc', () => {
            const schedule = makeSchedule({ isActive: true });
            const newCron: import('../value-objects/cron-expr.vo').CronExpr = {
                _brand: 'CronExpr',
                value: '*/30 * * * *',
            };
            const result = updateScheduleConfig(schedule, {
                name: 'New name',
                cronExpr: newCron,
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.value.name).toBe('New name');
                expect(result.value.cronExpr.value).toBe('*/30 * * * *');
            }
        });

        it('trả về lỗi khi schedule đang tắt (isActive = false)', () => {
            const schedule = makeSchedule({ isActive: false });
            const result = updateScheduleConfig(schedule, { name: 'New name' });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('Không thể cập nhật schedule đang tắt');
            }
        });

        it('không thay đổi các field không được truyền vào updates', () => {
            const schedule = makeSchedule({ isActive: true });
            const result = updateScheduleConfig(schedule, { name: 'New name' });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.value.jobType).toBe(schedule.jobType);
                expect(result.value.payload).toEqual(schedule.payload);
                expect(result.value.userId).toBe(schedule.userId);
                expect(result.value.isActive).toBe(true);
            }
        });

        it('không mutate schedule gốc', () => {
            const schedule = makeSchedule({ isActive: true });
            updateScheduleConfig(schedule, { name: 'New name' });

            expect(schedule.name).toBe('Daily email report');
        });

    });

    describe('scheduleToJSON()', () => {

        it('trả về đúng cấu trúc JSON', () => {
            const schedule = makeSchedule();
            const json = scheduleToJSON(schedule);

            expect(json).toEqual({
                id: MOCK_ID,
                name: 'Daily email report',
                jobType: 'SEND_EMAIL',
                payload: { to: 'user@example.com', subject: 'Report', body: 'Daily report' },
                cronExpr: '0 9 * * *',
                isActive: true,
                lastRunAt: null,
                nextRunAt: null,
                createdAt: schedule.createdAt,
                userId: MOCK_USER_ID,
            });
        });

        it('cronExpr trong JSON là string (value), không phải CronExpr object', () => {
            const schedule = makeSchedule();
            const json = scheduleToJSON(schedule);

            expect(typeof json.cronExpr).toBe('string');
            expect(json.cronExpr).toBe('0 9 * * *');
        });

        it('JSON không có field thừa ngoài spec', () => {
            const json = scheduleToJSON(makeSchedule());
            const expectedKeys = [
                'id', 'name', 'jobType', 'payload', 'cronExpr',
                'isActive', 'lastRunAt', 'nextRunAt', 'createdAt', 'userId',
            ];
            expect(Object.keys(json)).toEqual(expectedKeys);
        });

        it('giữ nguyên null khi lastRunAt và nextRunAt là null', () => {
            const json = scheduleToJSON(makeSchedule());

            expect(json.lastRunAt).toBeNull();
            expect(json.nextRunAt).toBeNull();
        });

        it('phản ánh đúng sau khi markScheduleRan', () => {
            const nextRunAt = new Date('2024-06-02');
            const updated = markScheduleRan(makeSchedule(), nextRunAt);
            const json = scheduleToJSON(updated);

            expect(json.lastRunAt).toBeInstanceOf(Date);
            expect(json.nextRunAt).toEqual(nextRunAt);
        });

        it('phản ánh đúng sau khi toggleSchedule', () => {
            const schedule = makeSchedule({ isActive: true });
            const toggled = toggleSchedule(schedule);
            const json = scheduleToJSON(toggled);

            expect(json.isActive).toBe(false);
        });

    });

});