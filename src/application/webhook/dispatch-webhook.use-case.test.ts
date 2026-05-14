import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeDispatchWebhookUseCase, WebhookDispatchPayload } from './dispatch-webhook.use-case';
import { WebhookRepository } from '../../domain/webhook/repositories/webhook.repository';
import { WebhookEntity } from '../../domain/webhook/entities/webhook.entity';

// -----------------------------------------------------------------------
// Mock global fetch
// -----------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// -----------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------

const MOCK_PAYLOAD: WebhookDispatchPayload = {
    event: 'job.completed',
    jobId: 'job-uuid-1234',
    data: { type: 'SEND_EMAIL', userId: 'user-uuid-5678' },
};

const makeWebhook = (overrides: Partial<WebhookEntity> = {}): WebhookEntity => ({
    id: 'webhook-uuid-1234',
    url: 'https://example.com/webhook',
    events: ['job.completed'],
    isActive: true,
    userId: 'user-uuid-5678',
    createdAt: new Date('2024-01-01'),
    ...overrides,
});

const makeMockRepo = (): WebhookRepository => ({
    findById: vi.fn(),
    findByEvent: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    findByUserId: vi.fn(),
});

const mockOkResponse = () =>
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

const mockFailResponse = (status = 500) =>
    mockFetch.mockResolvedValue({ ok: false, status });

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

describe('makeDispatchWebhookUseCase()', () => {

    let repo: WebhookRepository;
    let dispatchWebhook: ReturnType<typeof makeDispatchWebhookUseCase>;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = makeMockRepo();
        dispatchWebhook = makeDispatchWebhookUseCase(repo);
    });

    it('gọi findByEvent với đúng event', async () => {
        vi.mocked(repo.findByEvent).mockResolvedValue([]);

        await dispatchWebhook(MOCK_PAYLOAD);

        expect(repo.findByEvent).toHaveBeenCalledWith('job.completed');
        expect(repo.findByEvent).toHaveBeenCalledTimes(1);
    });

    it('không gọi fetch khi không có webhook nào đăng ký event', async () => {
        vi.mocked(repo.findByEvent).mockResolvedValue([]);

        await dispatchWebhook(MOCK_PAYLOAD);

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('gọi fetch đến đúng url của webhook', async () => {
        vi.mocked(repo.findByEvent).mockResolvedValue([makeWebhook()]);
        mockOkResponse();

        await dispatchWebhook(MOCK_PAYLOAD);

        expect(mockFetch).toHaveBeenCalledWith(
            'https://example.com/webhook',
            expect.any(Object)
        );
    });

    it('gọi fetch với đúng method POST và headers', async () => {
        vi.mocked(repo.findByEvent).mockResolvedValue([makeWebhook()]);
        mockOkResponse();

        await dispatchWebhook(MOCK_PAYLOAD);

        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'X-Event': 'job.completed',
                }),
            })
        );
    });

    it('gọi fetch với body chứa đúng event, jobId, data', async () => {
        vi.mocked(repo.findByEvent).mockResolvedValue([makeWebhook()]);
        mockOkResponse();

        await dispatchWebhook(MOCK_PAYLOAD);

        const body = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body);
        expect(body.event).toBe('job.completed');
        expect(body.jobId).toBe('job-uuid-1234');
        expect(body.data).toEqual(MOCK_PAYLOAD.data);
        expect(body.timestamp).toBeDefined();
    });

    it('gọi fetch đến tất cả webhooks đăng ký event', async () => {
        const webhooks = [
            makeWebhook({ id: 'wh-1', url: 'https://service-a.com/hook' }),
            makeWebhook({ id: 'wh-2', url: 'https://service-b.com/hook' }),
            makeWebhook({ id: 'wh-3', url: 'https://service-c.com/hook' }),
        ];
        vi.mocked(repo.findByEvent).mockResolvedValue(webhooks);
        mockOkResponse();

        await dispatchWebhook(MOCK_PAYLOAD);

        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(mockFetch).toHaveBeenCalledWith('https://service-a.com/hook', expect.any(Object));
        expect(mockFetch).toHaveBeenCalledWith('https://service-b.com/hook', expect.any(Object));
        expect(mockFetch).toHaveBeenCalledWith('https://service-c.com/hook', expect.any(Object));
    });

    it('không throw khi một webhook trả về response lỗi (4xx/5xx)', async () => {
        vi.mocked(repo.findByEvent).mockResolvedValue([makeWebhook()]);
        mockFailResponse(500);

        await expect(dispatchWebhook(MOCK_PAYLOAD)).resolves.not.toThrow();
    });

    it('không throw khi fetch throw lỗi network', async () => {
        vi.mocked(repo.findByEvent).mockResolvedValue([makeWebhook()]);
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(dispatchWebhook(MOCK_PAYLOAD)).resolves.not.toThrow();
    });

    it('tiếp tục deliver các webhook còn lại dù một cái bị lỗi', async () => {
        const webhooks = [
            makeWebhook({ id: 'wh-1', url: 'https://fail.com/hook' }),
            makeWebhook({ id: 'wh-2', url: 'https://success.com/hook' }),
        ];
        vi.mocked(repo.findByEvent).mockResolvedValue(webhooks);
        mockFetch
            .mockRejectedValueOnce(new Error('timeout'))
            .mockResolvedValueOnce({ ok: true, status: 200 });

        await expect(dispatchWebhook(MOCK_PAYLOAD)).resolves.not.toThrow();
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('return void (không trả về giá trị)', async () => {
        vi.mocked(repo.findByEvent).mockResolvedValue([]);

        const result = await dispatchWebhook(MOCK_PAYLOAD);

        expect(result).toBeUndefined();
    });

    it('hoạt động với tất cả WebhookEvent hợp lệ', async () => {
        const events = ['job.completed', 'job.failed', 'job.cancelled', 'job.retried'] as const;
        vi.mocked(repo.findByEvent).mockResolvedValue([]);

        for (const event of events) {
            await dispatchWebhook({ ...MOCK_PAYLOAD, event });
            expect(repo.findByEvent).toHaveBeenCalledWith(event);
        }
    });

});