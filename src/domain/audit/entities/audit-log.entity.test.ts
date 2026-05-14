import { describe, it, expect, beforeEach } from 'vitest';
import {
    AUDIT_ACTIONS,
    createAuditLog,
    auditLogToJSON,
    AuditAction,
} from './audit-log.entity';

const MOCK_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const MOCK_USER = 'user-uuid-1234';
const MOCK_JOB = 'job-uuid-5678';
const MOCK_ACTION = 'job.created' as AuditAction;

describe('AuditLog Entity', () => {

    describe('createAuditLog()', () => {

        it('tạo audit log với đầy đủ thông tin', () => {
            const meta = { jobType: 'SEND_EMAIL', priority: 5 };
            const log = createAuditLog(MOCK_ID, MOCK_ACTION, MOCK_USER, MOCK_JOB, meta);

            expect(log.id).toBe(MOCK_ID);
            expect(log.action).toBe(MOCK_ACTION);
            expect(log.userId).toBe(MOCK_USER);
            expect(log.jobId).toBe(MOCK_JOB);
            expect(log.meta).toEqual(meta);
            expect(log.createdAt).toBeInstanceOf(Date);
        });

        it('jobId và meta mặc định là null khi không truyền', () => {
            const log = createAuditLog(MOCK_ID, 'auth.login', MOCK_USER);

            expect(log.jobId).toBeNull();
            expect(log.meta).toBeNull();
        });

        it('jobId null khi truyền tường minh', () => {
            const log = createAuditLog(MOCK_ID, 'auth.register', MOCK_USER, null);

            expect(log.jobId).toBeNull();
        });

        it('meta null khi truyền tường minh', () => {
            const log = createAuditLog(MOCK_ID, 'auth.logout', MOCK_USER, null, null);

            expect(log.meta).toBeNull();
        });

        it('createdAt là thời điểm hiện tại', () => {
            const before = new Date();
            const log = createAuditLog(MOCK_ID, MOCK_ACTION, MOCK_USER);
            const after = new Date();

            expect(log.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(log.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('tạo được tất cả AUDIT_ACTIONS hợp lệ', () => {
            for (const action of AUDIT_ACTIONS) {
                const log = createAuditLog(MOCK_ID, action, MOCK_USER);
                expect(log.action).toBe(action);
            }
        });

        it('meta có thể chứa nested object', () => {
            const meta = {
                email: 'user@example.com',
                role: 'USER',
                nested: { key: 'value', count: 42 },
            };
            const log = createAuditLog(MOCK_ID, 'auth.register', MOCK_USER, null, meta);

            expect(log.meta).toEqual(meta);
            expect((log.meta as any).nested.count).toBe(42);
        });

    });

    describe('auditLogToJSON()', () => {

        it('trả về đúng cấu trúc JSON', () => {
            const meta = { jobType: 'SEND_EMAIL' };
            const log = createAuditLog(MOCK_ID, MOCK_ACTION, MOCK_USER, MOCK_JOB, meta);
            const json = auditLogToJSON(log);

            expect(json).toEqual({
                id: MOCK_ID,
                action: MOCK_ACTION,
                userId: MOCK_USER,
                jobId: MOCK_JOB,
                meta: meta,
                createdAt: log.createdAt,
            });
        });

        it('JSON không có field thừa ngoài spec', () => {
            const log = createAuditLog(MOCK_ID, MOCK_ACTION, MOCK_USER);
            const json = auditLogToJSON(log);

            expect(Object.keys(json)).toEqual([
                'id', 'action', 'userId', 'jobId', 'meta', 'createdAt'
            ]);
        });

        it('giữ nguyên null khi jobId và meta là null', () => {
            const log = createAuditLog(MOCK_ID, 'auth.login', MOCK_USER);
            const json = auditLogToJSON(log);

            expect(json.jobId).toBeNull();
            expect(json.meta).toBeNull();
        });

        it('createdAt trong JSON là Date object', () => {
            const log = createAuditLog(MOCK_ID, MOCK_ACTION, MOCK_USER);
            const json = auditLogToJSON(log);

            expect(json.createdAt).toBeInstanceOf(Date);
        });

        it('hai log khác nhau có createdAt độc lập', () => {
            const log1 = createAuditLog(MOCK_ID, 'auth.login', MOCK_USER);
            const log2 = createAuditLog(MOCK_ID, 'auth.logout', MOCK_USER);

            expect(log1.createdAt).not.toBe(log2.createdAt);
        });

    });

    describe('AUDIT_ACTIONS constant', () => {

        it('có đủ 14 actions', () => {
            expect(AUDIT_ACTIONS).toHaveLength(14);
        });

        it('bao gồm tất cả auth actions', () => {
            expect(AUDIT_ACTIONS).toContain('auth.register');
            expect(AUDIT_ACTIONS).toContain('auth.login');
            expect(AUDIT_ACTIONS).toContain('auth.logout');
        });

        it('bao gồm tất cả job actions', () => {
            expect(AUDIT_ACTIONS).toContain('job.created');
            expect(AUDIT_ACTIONS).toContain('job.completed');
            expect(AUDIT_ACTIONS).toContain('job.failed');
            expect(AUDIT_ACTIONS).toContain('job.cancelled');
            expect(AUDIT_ACTIONS).toContain('job.retried');
        });

        it('bao gồm tất cả schedule actions', () => {
            expect(AUDIT_ACTIONS).toContain('schedule.created');
            expect(AUDIT_ACTIONS).toContain('schedule.updated');
            expect(AUDIT_ACTIONS).toContain('schedule.deleted');
            expect(AUDIT_ACTIONS).toContain('schedule.toggled');
        });

        it('bao gồm tất cả webhook actions', () => {
            expect(AUDIT_ACTIONS).toContain('webhook.registered');
            expect(AUDIT_ACTIONS).toContain('webhook.deleted');
        });

        it('không có action bị duplicate', () => {
            const unique = new Set(AUDIT_ACTIONS);
            expect(unique.size).toBe(AUDIT_ACTIONS.length);
        });

    });

});