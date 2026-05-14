import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeDeleteWebhookUseCase } from './delete-webhook.use-case';
import { WebhookRepository } from '../../domain/webhook/repositories/webhook.repository';
import { WebhookEntity } from '../../domain/webhook/entities/webhook.entity';

vi.mock('../../infrastructure/events/audit.listener', () => ({
    emitAudit: vi.fn(),
}));

import { emitAudit } from '../../infrastructure/events/audit.listener';

// -----------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------

const MOCK_WEBHOOK_ID = 'webhook-uuid-1234';
const MOCK_USER_ID = 'user-uuid-5678';
const MOCK_ADMIN_ID = 'admin-uuid-9999';

const makeWebhook = (overrides: Partial<WebhookEntity> = {}): WebhookEntity => ({
    id: MOCK_WEBHOOK_ID,
    url: 'https://example.com/webhook',
    events: ['job.completed'],
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

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

describe('makeDeleteWebhookUseCase()', () => {

    let repo: WebhookRepository;
    let deleteWebhook: ReturnType<typeof makeDeleteWebhookUseCase>;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = makeMockRepo();
        deleteWebhook = makeDeleteWebhookUseCase(repo);
    });

    it('xóa thành công khi owner tự xóa webhook của mình', async () => {
        vi.mocked(repo.findById).mockResolvedValue(makeWebhook());
        vi.mocked(repo.delete).mockResolvedValue();

        const result = await deleteWebhook(MOCK_WEBHOOK_ID, MOCK_USER_ID, 'USER');

        expect(result.success).toBe(true);
        if (result.success) expect(result.value.message).toBe('Xóa webhook thành công');
    });

    it('xóa thành công khi ADMIN xóa webhook của người khác', async () => {
        vi.mocked(repo.findById).mockResolvedValue(makeWebhook({ userId: MOCK_USER_ID }));
        vi.mocked(repo.delete).mockResolvedValue();

        const result = await deleteWebhook(MOCK_WEBHOOK_ID, MOCK_ADMIN_ID, 'ADMIN');

        expect(result.success).toBe(true);
    });

    it('trả về lỗi khi webhook không tồn tại', async () => {
        vi.mocked(repo.findById).mockResolvedValue(null);

        const result = await deleteWebhook(MOCK_WEBHOOK_ID, MOCK_USER_ID, 'USER');

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toBe('Webhook không tìm thấy');
    });

    it('trả về lỗi khi USER xóa webhook của người khác', async () => {
        vi.mocked(repo.findById).mockResolvedValue(makeWebhook({ userId: 'other-user-id' }));

        const result = await deleteWebhook(MOCK_WEBHOOK_ID, MOCK_USER_ID, 'USER');

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toBe('Bạn không có quyền xóa webhook này');
    });

    it('gọi repo.findById với đúng id', async () => {
        vi.mocked(repo.findById).mockResolvedValue(makeWebhook());
        vi.mocked(repo.delete).mockResolvedValue();

        await deleteWebhook(MOCK_WEBHOOK_ID, MOCK_USER_ID, 'USER');

        expect(repo.findById).toHaveBeenCalledWith(MOCK_WEBHOOK_ID);
        expect(repo.findById).toHaveBeenCalledTimes(1);
    });

    it('gọi repo.delete với đúng id', async () => {
        vi.mocked(repo.findById).mockResolvedValue(makeWebhook());
        vi.mocked(repo.delete).mockResolvedValue();

        await deleteWebhook(MOCK_WEBHOOK_ID, MOCK_USER_ID, 'USER');

        expect(repo.delete).toHaveBeenCalledWith(MOCK_WEBHOOK_ID);
        expect(repo.delete).toHaveBeenCalledTimes(1);
    });

    it('emit audit webhook.deleted với đúng thông tin', async () => {
        vi.mocked(repo.findById).mockResolvedValue(makeWebhook());
        vi.mocked(repo.delete).mockResolvedValue();

        await deleteWebhook(MOCK_WEBHOOK_ID, MOCK_USER_ID, 'USER');

        expect(emitAudit).toHaveBeenCalledWith({
            action: 'webhook.deleted',
            userId: MOCK_USER_ID,
            meta: { webhookId: MOCK_WEBHOOK_ID, deletedBy: 'USER' },
        });
    });

    it('emit audit với role ADMIN khi admin xóa', async () => {
        vi.mocked(repo.findById).mockResolvedValue(makeWebhook({ userId: MOCK_USER_ID }));
        vi.mocked(repo.delete).mockResolvedValue();

        await deleteWebhook(MOCK_WEBHOOK_ID, MOCK_ADMIN_ID, 'ADMIN');

        expect(emitAudit).toHaveBeenCalledWith(
            expect.objectContaining({ meta: expect.objectContaining({ deletedBy: 'ADMIN' }) })
        );
    });

    it('không gọi repo.delete khi webhook không tồn tại', async () => {
        vi.mocked(repo.findById).mockResolvedValue(null);

        await deleteWebhook(MOCK_WEBHOOK_ID, MOCK_USER_ID, 'USER');

        expect(repo.delete).not.toHaveBeenCalled();
    });

    it('không gọi repo.delete khi không có quyền', async () => {
        vi.mocked(repo.findById).mockResolvedValue(makeWebhook({ userId: 'other-user-id' }));

        await deleteWebhook(MOCK_WEBHOOK_ID, MOCK_USER_ID, 'USER');

        expect(repo.delete).not.toHaveBeenCalled();
    });

    it('không emit audit khi thất bại', async () => {
        vi.mocked(repo.findById).mockResolvedValue(null);

        await deleteWebhook(MOCK_WEBHOOK_ID, MOCK_USER_ID, 'USER');

        expect(emitAudit).not.toHaveBeenCalled();
    });

});