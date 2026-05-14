import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeLogAuditUseCase, makeGetAuditLogsUseCase, LogAuditCommand } from './log-audit.use-case';
import { AuditRepository, AuditFilter, PaginatedAuditLogs } from '../../domain/audit/repositories/audit.repository';
import { AuditLogEntity } from '../../domain/audit/entities/audit-log.entity';

// --- mock uuid cố định để assert dễ hơn ---
vi.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));

const makeMockRepo = (): AuditRepository => ({
    save: vi.fn(async (log: AuditLogEntity) => log),
    findMany: vi.fn(),
});

const makePaginated = (overrides: Partial<PaginatedAuditLogs> = {}): PaginatedAuditLogs => ({
    data: [],
    total: 0,
    page: 1,
    limit: 10,
    ...overrides,
});

describe('Audit Use Cases', () => {

    describe('makeLogAuditUseCase()', () => {

        let repo: AuditRepository;
        let logAudit: ReturnType<typeof makeLogAuditUseCase>;

        beforeEach(() => {
            repo = makeMockRepo();
            logAudit = makeLogAuditUseCase(repo);
        });

        it('gọi auditRepo.save đúng 1 lần', async () => {
            const cmd: LogAuditCommand = {
                action: 'auth.login',
                userId: 'user-123',
            };
            await logAudit(cmd);

            expect(repo.save).toHaveBeenCalledTimes(1);
        });

        it('truyền đúng action và userId vào audit log', async () => {
            const cmd: LogAuditCommand = {
                action: 'auth.login',
                userId: 'user-123',
            };
            await logAudit(cmd);

            const saved = vi.mocked(repo.save).mock.calls[0][0];
            expect(saved.action).toBe('auth.login');
            expect(saved.userId).toBe('user-123');
        });

        it('dùng uuid làm id cho audit log', async () => {
            await logAudit({ action: 'auth.login', userId: 'user-123' });

            const saved = vi.mocked(repo.save).mock.calls[0][0];
            expect(saved.id).toBe('mock-uuid-1234');
        });

        it('jobId mặc định là null khi không truyền', async () => {
            await logAudit({ action: 'auth.login', userId: 'user-123' });

            const saved = vi.mocked(repo.save).mock.calls[0][0];
            expect(saved.jobId).toBeNull();
        });

        it('meta mặc định là null khi không truyền', async () => {
            await logAudit({ action: 'auth.login', userId: 'user-123' });

            const saved = vi.mocked(repo.save).mock.calls[0][0];
            expect(saved.meta).toBeNull();
        });

        it('truyền đúng jobId khi có', async () => {
            await logAudit({
                action: 'job.created',
                userId: 'user-123',
                jobId: 'job-uuid-456',
            });

            const saved = vi.mocked(repo.save).mock.calls[0][0];
            expect(saved.jobId).toBe('job-uuid-456');
        });

        it('truyền đúng meta khi có', async () => {
            const meta = { jobType: 'SEND_EMAIL', priority: 5 };
            await logAudit({
                action: 'job.created',
                userId: 'user-123',
                meta,
            });

            const saved = vi.mocked(repo.save).mock.calls[0][0];
            expect(saved.meta).toEqual(meta);
        });

        it('truyền đầy đủ jobId và meta cùng lúc', async () => {
            const meta = { reason: 'manual retry' };
            await logAudit({
                action: 'job.retried',
                userId: 'user-123',
                jobId: 'job-uuid-789',
                meta,
            });

            const saved = vi.mocked(repo.save).mock.calls[0][0];
            expect(saved.jobId).toBe('job-uuid-789');
            expect(saved.meta).toEqual(meta);
        });

        it('createdAt là Date object', async () => {
            await logAudit({ action: 'auth.logout', userId: 'user-123' });

            const saved = vi.mocked(repo.save).mock.calls[0][0];
            expect(saved.createdAt).toBeInstanceOf(Date);
        });

        it('return void (không trả về giá trị)', async () => {
            const result = await logAudit({ action: 'auth.login', userId: 'user-123' });
            expect(result).toBeUndefined();
        });

        it('hoạt động với tất cả AuditAction hợp lệ', async () => {
            const actions: LogAuditCommand['action'][] = [
                'auth.register', 'auth.login', 'auth.logout',
                'job.created', 'job.cancelled', 'job.retried', 'job.completed', 'job.failed',
                'schedule.created', 'schedule.updated', 'schedule.deleted', 'schedule.toggled',
                'webhook.registered', 'webhook.deleted',
            ];

            for (const action of actions) {
                const localRepo = makeMockRepo();
                const useCase = makeLogAuditUseCase(localRepo);
                await useCase({ action, userId: 'user-123' });

                const saved = vi.mocked(localRepo.save).mock.calls[0][0];
                expect(saved.action).toBe(action);
            }
        });

    });

    describe('makeGetAuditLogsUseCase()', () => {

        let repo: AuditRepository;
        let getAuditLogs: ReturnType<typeof makeGetAuditLogsUseCase>;

        beforeEach(() => {
            repo = makeMockRepo();
            getAuditLogs = makeGetAuditLogsUseCase(repo);
        });

        it('gọi auditRepo.findMany đúng 1 lần', async () => {
            vi.mocked(repo.findMany).mockResolvedValue(makePaginated());
            await getAuditLogs({});

            expect(repo.findMany).toHaveBeenCalledTimes(1);
        });

        it('truyền đúng filter vào findMany', async () => {
            vi.mocked(repo.findMany).mockResolvedValue(makePaginated());
            const filter: AuditFilter = {
                userId: 'user-123',
                action: 'auth.login',
                page: 1,
                limit: 20,
            };
            await getAuditLogs(filter);

            expect(repo.findMany).toHaveBeenCalledWith(filter);
        });

        it('trả về đúng kết quả từ repository', async () => {
            const mockLog: AuditLogEntity = {
                id: 'log-1',
                action: 'auth.login',
                userId: 'user-123',
                jobId: null,
                meta: null,
                createdAt: new Date('2024-01-01'),
            };
            const paginated = makePaginated({ data: [mockLog], total: 1 });
            vi.mocked(repo.findMany).mockResolvedValue(paginated);

            const result = await getAuditLogs({ userId: 'user-123' });

            expect(result).toEqual(paginated);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].action).toBe('auth.login');
        });

        it('trả về danh sách rỗng khi không có kết quả', async () => {
            vi.mocked(repo.findMany).mockResolvedValue(makePaginated());

            const result = await getAuditLogs({ userId: 'not-found' });

            expect(result.data).toHaveLength(0);
            expect(result.total).toBe(0);
        });

        it('truyền filter rỗng {} không bị lỗi', async () => {
            vi.mocked(repo.findMany).mockResolvedValue(makePaginated());

            await expect(getAuditLogs({})).resolves.not.toThrow();
            expect(repo.findMany).toHaveBeenCalledWith({});
        });

        it('truyền đúng filter với fromDate và toDate', async () => {
            vi.mocked(repo.findMany).mockResolvedValue(makePaginated());
            const filter: AuditFilter = {
                fromDate: new Date('2024-01-01'),
                toDate: new Date('2024-01-31'),
            };
            await getAuditLogs(filter);

            expect(repo.findMany).toHaveBeenCalledWith(filter);
        });

        it('truyền đúng filter với jobId', async () => {
            vi.mocked(repo.findMany).mockResolvedValue(makePaginated());
            const filter: AuditFilter = { jobId: 'job-uuid-456' };
            await getAuditLogs(filter);

            expect(repo.findMany).toHaveBeenCalledWith(filter);
        });

        it('trả về đúng pagination metadata', async () => {
            vi.mocked(repo.findMany).mockResolvedValue(
                makePaginated({ total: 100, page: 3, limit: 20 })
            );

            const result = await getAuditLogs({ page: 3, limit: 20 });

            expect(result.total).toBe(100);
            expect(result.page).toBe(3);
            expect(result.limit).toBe(20);
        });

    });

});