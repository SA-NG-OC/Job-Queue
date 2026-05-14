import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRegisterWebhookUseCase, RegisterWebhookCommand } from './register-webhook.use-case';
import { WebhookRepository } from '../../domain/webhook/repositories/webhook.repository';
import { WebhookEntity } from '../../domain/webhook/entities/webhook.entity';

vi.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));

vi.mock('../../domain/webhook/entities/webhook.entity', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../domain/webhook/entities/webhook.entity')>();
    return { ...actual, buildNewWebhook: vi.fn() };
});

vi.mock('../../infrastructure/events/audit.listener', () => ({
    emitAudit: vi.fn(),
}));

import { buildNewWebhook } from '../../domain/webhook/entities/webhook.entity';
import { emitAudit } from '../../infrastructure/events/audit.listener';

// -----------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------

const MOCK_USER_ID = 'user-uuid-5678';
const MOCK_WEBHOOK_ID = 'mock-uuid-1234';

const makeWebhook = (overrides: Partial<WebhookEntity> = {}): WebhookEntity => ({
    id: MOCK_WEBHOOK_ID,
    url: 'https://example.com/webhook',
    events: ['job.completed', 'job.failed'],
    isActive: true,
    userId: MOCK_USER_ID,
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

const MOCK_CMD: RegisterWebhookCommand = {
    url: 'https://example.com/webhook',
    events: ['job.completed', 'job.failed'],
    userId: MOCK_USER_ID,
};

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

describe('makeRegisterWebhookUseCase()', () => {

    let repo: WebhookRepository;
    let registerWebhook: ReturnType<typeof makeRegisterWebhookUseCase>;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = makeMockRepo();
        registerWebhook = makeRegisterWebhookUseCase(repo);
    });

    it('đăng ký thành công, trả về webhookJSON', async () => {
        const webhook = makeWebhook();
        vi.mocked(buildNewWebhook).mockReturnValue({ success: true, value: webhook });
        vi.mocked(repo.save).mockResolvedValue(webhook);

        const result = await registerWebhook(MOCK_CMD);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.id).toBe(MOCK_WEBHOOK_ID);
            expect(result.value.url).toBe('https://example.com/webhook');
            expect(result.value.events).toEqual(['job.completed', 'job.failed']);
        }
    });

    it('trả về lỗi khi buildNewWebhook thất bại (url không hợp lệ)', async () => {
        vi.mocked(buildNewWebhook).mockReturnValue({
            success: false,
            error: 'URL webhook phải bắt đầu bằng http:// hoặc https://',
        });

        const result = await registerWebhook({ ...MOCK_CMD, url: 'ftp://bad-url.com' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe('URL webhook phải bắt đầu bằng http:// hoặc https://');
        }
    });

    it('trả về lỗi khi buildNewWebhook thất bại (không có event hợp lệ)', async () => {
        vi.mocked(buildNewWebhook).mockReturnValue({
            success: false,
            error: 'Cần ít nhất 1 event hợp lệ',
        });

        const result = await registerWebhook({ ...MOCK_CMD, events: ['invalid.event'] });

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toContain('Cần ít nhất 1 event hợp lệ');
    });

    it('gọi buildNewWebhook với uuid, url, events, userId đúng', async () => {
        const webhook = makeWebhook();
        vi.mocked(buildNewWebhook).mockReturnValue({ success: true, value: webhook });
        vi.mocked(repo.save).mockResolvedValue(webhook);

        await registerWebhook(MOCK_CMD);

        expect(buildNewWebhook).toHaveBeenCalledWith(
            'mock-uuid-1234',
            MOCK_CMD.url,
            MOCK_CMD.events,
            MOCK_CMD.userId
        );
    });

    it('gọi repo.save với webhook từ buildNewWebhook', async () => {
        const webhook = makeWebhook();
        vi.mocked(buildNewWebhook).mockReturnValue({ success: true, value: webhook });
        vi.mocked(repo.save).mockResolvedValue(webhook);

        await registerWebhook(MOCK_CMD);

        expect(repo.save).toHaveBeenCalledWith(webhook);
        expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('emit audit webhook.registered với đúng thông tin', async () => {
        const webhook = makeWebhook();
        vi.mocked(buildNewWebhook).mockReturnValue({ success: true, value: webhook });
        vi.mocked(repo.save).mockResolvedValue(webhook);

        await registerWebhook(MOCK_CMD);

        expect(emitAudit).toHaveBeenCalledWith({
            action: 'webhook.registered',
            userId: MOCK_USER_ID,
            meta: {
                webhookId: MOCK_WEBHOOK_ID,
                url: webhook.url,
                events: webhook.events,
            },
        });
    });

    it('JSON trả về không có _brand hay field nội bộ', async () => {
        const webhook = makeWebhook();
        vi.mocked(buildNewWebhook).mockReturnValue({ success: true, value: webhook });
        vi.mocked(repo.save).mockResolvedValue(webhook);

        const result = await registerWebhook(MOCK_CMD);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(Object.keys(result.value)).toEqual([
                'id', 'url', 'events', 'isActive', 'userId', 'createdAt',
            ]);
        }
    });

    it('không gọi repo.save khi buildNewWebhook thất bại', async () => {
        vi.mocked(buildNewWebhook).mockReturnValue({
            success: false,
            error: 'URL không hợp lệ',
        });

        await registerWebhook(MOCK_CMD);

        expect(repo.save).not.toHaveBeenCalled();
    });

    it('không emit audit khi buildNewWebhook thất bại', async () => {
        vi.mocked(buildNewWebhook).mockReturnValue({
            success: false,
            error: 'URL không hợp lệ',
        });

        await registerWebhook(MOCK_CMD);

        expect(emitAudit).not.toHaveBeenCalled();
    });

    it('emit audit dùng thông tin từ saved (sau khi repo.save), không phải webhook trước khi save', async () => {
        const unsaved = makeWebhook({ id: 'temp-id' });
        const saved = makeWebhook({ id: MOCK_WEBHOOK_ID });
        vi.mocked(buildNewWebhook).mockReturnValue({ success: true, value: unsaved });
        vi.mocked(repo.save).mockResolvedValue(saved);

        await registerWebhook(MOCK_CMD);

        expect(emitAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                meta: expect.objectContaining({ webhookId: MOCK_WEBHOOK_ID }),
            })
        );
    });

});