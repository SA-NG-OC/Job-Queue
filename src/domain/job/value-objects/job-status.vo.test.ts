import { describe, it, expect } from 'vitest';
import { canTransitionTo, JOB_STATUSES, JobStatus } from './job-status.vo';

describe('JobStatus Value Object', () => {

    describe('JOB_STATUSES constant', () => {

        it('có đủ 5 trạng thái', () => {
            expect(JOB_STATUSES).toHaveLength(5);
        });

        it('bao gồm tất cả các trạng thái hợp lệ', () => {
            expect(JOB_STATUSES).toContain('PENDING');
            expect(JOB_STATUSES).toContain('ACTIVE');
            expect(JOB_STATUSES).toContain('COMPLETED');
            expect(JOB_STATUSES).toContain('FAILED');
            expect(JOB_STATUSES).toContain('CANCELLED');
        });

        it('không có trạng thái bị duplicate', () => {
            const unique = new Set(JOB_STATUSES);
            expect(unique.size).toBe(JOB_STATUSES.length);
        });

    });

    describe('canTransitionTo()', () => {

        describe('từ PENDING', () => {

            it('có thể chuyển sang ACTIVE', () => {
                expect(canTransitionTo('PENDING', 'ACTIVE')).toBe(true);
            });

            it('có thể chuyển sang CANCELLED', () => {
                expect(canTransitionTo('PENDING', 'CANCELLED')).toBe(true);
            });

            it('không thể chuyển sang COMPLETED', () => {
                expect(canTransitionTo('PENDING', 'COMPLETED')).toBe(false);
            });

            it('không thể chuyển sang FAILED', () => {
                expect(canTransitionTo('PENDING', 'FAILED')).toBe(false);
            });

            it('không thể chuyển sang PENDING (tự chính nó)', () => {
                expect(canTransitionTo('PENDING', 'PENDING')).toBe(false);
            });

        });

        describe('từ ACTIVE', () => {

            it('có thể chuyển sang COMPLETED', () => {
                expect(canTransitionTo('ACTIVE', 'COMPLETED')).toBe(true);
            });

            it('có thể chuyển sang FAILED', () => {
                expect(canTransitionTo('ACTIVE', 'FAILED')).toBe(true);
            });

            it('không thể chuyển sang PENDING', () => {
                expect(canTransitionTo('ACTIVE', 'PENDING')).toBe(false);
            });

            it('không thể chuyển sang CANCELLED', () => {
                expect(canTransitionTo('ACTIVE', 'CANCELLED')).toBe(false);
            });

            it('không thể chuyển sang ACTIVE (tự chính nó)', () => {
                expect(canTransitionTo('ACTIVE', 'ACTIVE')).toBe(false);
            });

        });

        describe('từ COMPLETED (trạng thái cuối)', () => {

            it('không thể chuyển sang bất kỳ trạng thái nào', () => {
                const allStatuses: JobStatus[] = [...JOB_STATUSES];
                for (const status of allStatuses) {
                    expect(canTransitionTo('COMPLETED', status)).toBe(false);
                }
            });

        });

        describe('từ FAILED', () => {

            it('có thể chuyển sang PENDING (retry)', () => {
                expect(canTransitionTo('FAILED', 'PENDING')).toBe(true);
            });

            it('không thể chuyển sang ACTIVE', () => {
                expect(canTransitionTo('FAILED', 'ACTIVE')).toBe(false);
            });

            it('không thể chuyển sang COMPLETED', () => {
                expect(canTransitionTo('FAILED', 'COMPLETED')).toBe(false);
            });

            it('không thể chuyển sang CANCELLED', () => {
                expect(canTransitionTo('FAILED', 'CANCELLED')).toBe(false);
            });

            it('không thể chuyển sang FAILED (tự chính nó)', () => {
                expect(canTransitionTo('FAILED', 'FAILED')).toBe(false);
            });

        });

        describe('từ CANCELLED (trạng thái cuối)', () => {

            it('không thể chuyển sang bất kỳ trạng thái nào', () => {
                const allStatuses: JobStatus[] = [...JOB_STATUSES];
                for (const status of allStatuses) {
                    expect(canTransitionTo('CANCELLED', status)).toBe(false);
                }
            });

        });

    });

});