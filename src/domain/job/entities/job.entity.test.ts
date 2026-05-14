import { describe, it, expect, beforeEach } from 'vitest';
import {
    createJobEntity,
    incrementJobAttempts,
    jobToJSON,
    JobEntity,
    markJobCompleted,
    markJobFailed,
    markJobStarted,
    transitionJobStatus,
} from './job.entity';

const MOCK_ID = 'job-uuid-1234';
const MOCK_USER_ID = 'user-uuid-5678';

const makeJob = (overrides: Partial<Omit<JobEntity, 'id'>> = {}): JobEntity =>
    createJobEntity(MOCK_ID, {
        type: 'SEND_EMAIL',
        status: 'PENDING',
        payload: { to: 'user@example.com', subject: 'Hello', body: 'Test' },
        result: null,
        error: null,
        priority: 1,
        attempts: 0,
        maxAttempts: 3,
        delay: null,
        scheduledAt: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date('2024-01-01'),
        userId: MOCK_USER_ID,
        ...overrides,
    });

describe('JobEntity', () => {

    describe('createJobEntity()', () => {

        it('tạo entity với đầy đủ thông tin', () => {
            const job = makeJob();

            expect(job.id).toBe(MOCK_ID);
            expect(job.type).toBe('SEND_EMAIL');
            expect(job.status).toBe('PENDING');
            expect(job.attempts).toBe(0);
            expect(job.maxAttempts).toBe(3);
            expect(job.result).toBeNull();
            expect(job.error).toBeNull();
            expect(job.userId).toBe(MOCK_USER_ID);
        });

        it('tạo entity với delay và scheduledAt', () => {
            const scheduledAt = new Date('2024-06-01');
            const job = makeJob({ delay: 5000, scheduledAt });

            expect(job.delay).toBe(5000);
            expect(job.scheduledAt).toEqual(scheduledAt);
        });

        it('tạo được các JobType khác nhau', () => {
            const job = makeJob({ type: 'CALL_WEBHOOK' });
            expect(job.type).toBe('CALL_WEBHOOK');
        });

    });

    describe('transitionJobStatus()', () => {

        it('chuyển trạng thái hợp lệ PENDING → ACTIVE thành công', () => {
            const job = makeJob({ status: 'PENDING' });
            const result = transitionJobStatus(job, 'ACTIVE');

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.status).toBe('ACTIVE');
        });

        it('chuyển trạng thái hợp lệ ACTIVE → COMPLETED thành công', () => {
            const job = makeJob({ status: 'ACTIVE' });
            const result = transitionJobStatus(job, 'COMPLETED');

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.status).toBe('COMPLETED');
        });

        it('chuyển trạng thái hợp lệ ACTIVE → FAILED thành công', () => {
            const job = makeJob({ status: 'ACTIVE' });
            const result = transitionJobStatus(job, 'FAILED');

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.status).toBe('FAILED');
        });

        it('chuyển trạng thái hợp lệ FAILED → PENDING (retry) thành công', () => {
            const job = makeJob({ status: 'FAILED' });
            const result = transitionJobStatus(job, 'PENDING');

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.status).toBe('PENDING');
        });

        it('trả về lỗi khi chuyển trạng thái không hợp lệ PENDING → COMPLETED', () => {
            const job = makeJob({ status: 'PENDING' });
            const result = transitionJobStatus(job, 'COMPLETED');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('PENDING');
                expect(result.error).toContain('COMPLETED');
            }
        });

        it('trả về lỗi khi chuyển trạng thái từ COMPLETED (trạng thái cuối)', () => {
            const job = makeJob({ status: 'COMPLETED' });
            const result = transitionJobStatus(job, 'ACTIVE');

            expect(result.success).toBe(false);
        });

        it('trả về lỗi khi chuyển trạng thái từ CANCELLED (trạng thái cuối)', () => {
            const job = makeJob({ status: 'CANCELLED' });
            const result = transitionJobStatus(job, 'PENDING');

            expect(result.success).toBe(false);
        });

        it('không mutate job gốc', () => {
            const job = makeJob({ status: 'PENDING' });
            transitionJobStatus(job, 'ACTIVE');

            expect(job.status).toBe('PENDING');
        });

    });

    describe('incrementJobAttempts()', () => {

        it('tăng attempts lên 1', () => {
            const job = makeJob({ attempts: 0, maxAttempts: 3 });
            const result = incrementJobAttempts(job);

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.attempts).toBe(1);
        });

        it('đặt lại status về PENDING sau khi increment', () => {
            const job = makeJob({ attempts: 1, maxAttempts: 3, status: 'FAILED' });
            const result = incrementJobAttempts(job);

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.status).toBe('PENDING');
        });

        it('trả về lỗi khi đã đạt maxAttempts', () => {
            const job = makeJob({ attempts: 3, maxAttempts: 3 });
            const result = incrementJobAttempts(job);

            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toContain('3');
        });

        it('trả về lỗi khi attempts vượt maxAttempts', () => {
            const job = makeJob({ attempts: 5, maxAttempts: 3 });
            const result = incrementJobAttempts(job);

            expect(result.success).toBe(false);
        });

        it('không mutate job gốc', () => {
            const job = makeJob({ attempts: 1, maxAttempts: 3 });
            incrementJobAttempts(job);

            expect(job.attempts).toBe(1);
        });

    });

    describe('markJobStarted()', () => {

        it('đặt status thành ACTIVE', () => {
            const job = makeJob({ status: 'PENDING' });
            const updated = markJobStarted(job);

            expect(updated.status).toBe('ACTIVE');
        });

        it('gán startedAt là thời điểm hiện tại', () => {
            const before = new Date();
            const updated = markJobStarted(makeJob());
            const after = new Date();

            expect(updated.startedAt).toBeInstanceOf(Date);
            expect(updated.startedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(updated.startedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('không mutate job gốc', () => {
            const job = makeJob({ status: 'PENDING' });
            markJobStarted(job);

            expect(job.status).toBe('PENDING');
            expect(job.startedAt).toBeNull();
        });

    });

    describe('markJobCompleted()', () => {

        it('đặt status thành COMPLETED', () => {
            const job = makeJob({ status: 'ACTIVE' });
            const updated = markJobCompleted(job, { sent: true });

            expect(updated.status).toBe('COMPLETED');
        });

        it('lưu result vào entity', () => {
            const job = makeJob({ status: 'ACTIVE' });
            const resultData = { sent: true, messageId: 'abc-123' };
            const updated = markJobCompleted(job, resultData);

            expect(updated.result).toEqual(resultData);
        });

        it('gán completedAt là thời điểm hiện tại', () => {
            const before = new Date();
            const updated = markJobCompleted(makeJob(), { done: true });
            const after = new Date();

            expect(updated.completedAt).toBeInstanceOf(Date);
            expect(updated.completedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(updated.completedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('không mutate job gốc', () => {
            const job = makeJob({ status: 'ACTIVE' });
            markJobCompleted(job, { done: true });

            expect(job.status).toBe('ACTIVE');
            expect(job.result).toBeNull();
        });

    });

    describe('markJobFailed()', () => {

        it('đặt status thành FAILED', () => {
            const job = makeJob({ status: 'ACTIVE' });
            const updated = markJobFailed(job, 'Connection timeout');

            expect(updated.status).toBe('FAILED');
        });

        it('lưu error message vào entity', () => {
            const job = makeJob({ status: 'ACTIVE' });
            const updated = markJobFailed(job, 'Connection timeout');

            expect(updated.error).toBe('Connection timeout');
        });

        it('không mutate job gốc', () => {
            const job = makeJob({ status: 'ACTIVE' });
            markJobFailed(job, 'Some error');

            expect(job.status).toBe('ACTIVE');
            expect(job.error).toBeNull();
        });

    });

    describe('jobToJSON()', () => {

        it('trả về đúng cấu trúc JSON', () => {
            const job = makeJob();
            const json = jobToJSON(job);

            expect(json).toEqual({
                id: MOCK_ID,
                type: 'SEND_EMAIL',
                status: 'PENDING',
                payload: { to: 'user@example.com', subject: 'Hello', body: 'Test' },
                result: null,
                error: null,
                priority: 1,
                attempts: 0,
                maxAttempts: 3,
                delay: null,
                scheduledAt: null,
                startedAt: null,
                completedAt: null,
                createdAt: job.createdAt,
                userId: MOCK_USER_ID,
            });
        });

        it('JSON không có field thừa ngoài spec', () => {
            const json = jobToJSON(makeJob());
            const expectedKeys = [
                'id', 'type', 'status', 'payload', 'result', 'error',
                'priority', 'attempts', 'maxAttempts', 'delay',
                'scheduledAt', 'startedAt', 'completedAt', 'createdAt', 'userId',
            ];
            expect(Object.keys(json)).toEqual(expectedKeys);
        });

        it('giữ nguyên null fields', () => {
            const json = jobToJSON(makeJob());

            expect(json.result).toBeNull();
            expect(json.error).toBeNull();
            expect(json.delay).toBeNull();
            expect(json.scheduledAt).toBeNull();
            expect(json.startedAt).toBeNull();
            expect(json.completedAt).toBeNull();
        });

        it('phản ánh đúng sau khi markJobCompleted', () => {
            const job = markJobCompleted(makeJob(), { sent: true });
            const json = jobToJSON(job);

            expect(json.status).toBe('COMPLETED');
            expect(json.result).toEqual({ sent: true });
            expect(json.completedAt).toBeInstanceOf(Date);
        });

        it('phản ánh đúng sau khi markJobFailed', () => {
            const job = markJobFailed(makeJob(), 'Timeout');
            const json = jobToJSON(job);

            expect(json.status).toBe('FAILED');
            expect(json.error).toBe('Timeout');
        });

    });

});