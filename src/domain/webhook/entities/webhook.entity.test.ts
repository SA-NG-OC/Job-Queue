import { describe, it, expect } from 'vitest';
import {
    buildNewWebhook,
    createWebhookEntity,
    webhookToJSON,
    WEBHOOK_EVENTS,
    WebhookEvent,
    WebhookEntity,
} from './webhook.entity';

const MOCK_ID = 'webhook-uuid-1234';
const MOCK_USER_ID = 'user-uuid-5678';
const MOCK_URL = 'https://example.com/webhook';
const MOCK_EVENTS: WebhookEvent[] = ['job.completed', 'job.failed'];

const makeWebhook = (overrides: Partial<Omit<WebhookEntity, 'id'>> = {}): WebhookEntity =>
    createWebhookEntity(MOCK_ID, {
        url: MOCK_URL,
        events: MOCK_EVENTS,
        isActive: true,
        userId: MOCK_USER_ID,
        createdAt: new Date('2024-01-01'),
        ...overrides,
    });

describe('WebhookEntity', () => {

    describe('WEBHOOK_EVENTS constant', () => {

        it('có đủ 4 events', () => {
            expect(WEBHOOK_EVENTS).toHaveLength(4);
        });

        it('bao gồm tất cả các event hợp lệ', () => {
            expect(WEBHOOK_EVENTS).toContain('job.completed');
            expect(WEBHOOK_EVENTS).toContain('job.failed');
            expect(WEBHOOK_EVENTS).toContain('job.cancelled');
            expect(WEBHOOK_EVENTS).toContain('job.retried');
        });

        it('không có event bị duplicate', () => {
            const unique = new Set(WEBHOOK_EVENTS);
            expect(unique.size).toBe(WEBHOOK_EVENTS.length);
        });

    });

    describe('createWebhookEntity()', () => {

        it('tạo entity với đầy đủ thông tin', () => {
            const webhook = makeWebhook();

            expect(webhook.id).toBe(MOCK_ID);
            expect(webhook.url).toBe(MOCK_URL);
            expect(webhook.events).toEqual(MOCK_EVENTS);
            expect(webhook.isActive).toBe(true);
            expect(webhook.userId).toBe(MOCK_USER_ID);
            expect(webhook.createdAt).toBeInstanceOf(Date);
        });

        it('tạo được webhook với isActive = false', () => {
            const webhook = makeWebhook({ isActive: false });
            expect(webhook.isActive).toBe(false);
        });

        it('tạo được webhook với tất cả events', () => {
            const webhook = makeWebhook({ events: [...WEBHOOK_EVENTS] });
            expect(webhook.events).toHaveLength(4);
        });

    });

    describe('buildNewWebhook()', () => {

        describe('valid', () => {

            it('tạo webhook thành công với https://', () => {
                const result = buildNewWebhook(MOCK_ID, 'https://example.com/hook', ['job.completed'], MOCK_USER_ID);

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.value.id).toBe(MOCK_ID);
                    expect(result.value.url).toBe('https://example.com/hook');
                    expect(result.value.userId).toBe(MOCK_USER_ID);
                }
            });

            it('tạo webhook thành công với http://', () => {
                const result = buildNewWebhook(MOCK_ID, 'http://example.com/hook', ['job.completed'], MOCK_USER_ID);

                expect(result.success).toBe(true);
            });

            it('isActive mặc định là true', () => {
                const result = buildNewWebhook(MOCK_ID, MOCK_URL, ['job.completed'], MOCK_USER_ID);

                expect(result.success).toBe(true);
                if (result.success) expect(result.value.isActive).toBe(true);
            });

            it('createdAt là thời điểm hiện tại', () => {
                const before = new Date();
                const result = buildNewWebhook(MOCK_ID, MOCK_URL, ['job.completed'], MOCK_USER_ID);
                const after = new Date();

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.value.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
                    expect(result.value.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
                }
            });

            it('trim whitespace trong url', () => {
                const result = buildNewWebhook(MOCK_ID, '  https://example.com/hook  ', ['job.completed'], MOCK_USER_ID);

                expect(result.success).toBe(true);
                if (result.success) expect(result.value.url).toBe('https://example.com/hook');
            });

            it('lọc bỏ event không hợp lệ, giữ lại event hợp lệ', () => {
                const result = buildNewWebhook(
                    MOCK_ID,
                    MOCK_URL,
                    ['job.completed', 'invalid.event', 'job.failed'],
                    MOCK_USER_ID
                );

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.value.events).toEqual(['job.completed', 'job.failed']);
                    expect(result.value.events).not.toContain('invalid.event');
                }
            });

            it('tạo thành công với tất cả events hợp lệ', () => {
                const result = buildNewWebhook(MOCK_ID, MOCK_URL, [...WEBHOOK_EVENTS], MOCK_USER_ID);

                expect(result.success).toBe(true);
                if (result.success) expect(result.value.events).toHaveLength(4);
            });

            it.each([...WEBHOOK_EVENTS])('tạo thành công với event đơn lẻ: %s', (event) => {
                const result = buildNewWebhook(MOCK_ID, MOCK_URL, [event], MOCK_USER_ID);
                expect(result.success).toBe(true);
            });

        });

        describe('invalid', () => {

            it('trả về lỗi khi url không bắt đầu bằng http:// hoặc https://', () => {
                const result = buildNewWebhook(MOCK_ID, 'ftp://example.com', ['job.completed'], MOCK_USER_ID);

                expect(result.success).toBe(false);
                if (!result.success) expect(result.error).toContain('http://');
            });

            it('trả về lỗi khi url là chuỗi thường (không có protocol)', () => {
                const result = buildNewWebhook(MOCK_ID, 'example.com/hook', ['job.completed'], MOCK_USER_ID);

                expect(result.success).toBe(false);
            });

            it('trả về lỗi khi url rỗng', () => {
                const result = buildNewWebhook(MOCK_ID, '', ['job.completed'], MOCK_USER_ID);

                expect(result.success).toBe(false);
            });

            it('trả về lỗi khi tất cả events đều không hợp lệ', () => {
                const result = buildNewWebhook(MOCK_ID, MOCK_URL, ['invalid.event', 'another.bad'], MOCK_USER_ID);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error).toContain('Cần ít nhất 1 event hợp lệ');
                    for (const event of WEBHOOK_EVENTS) {
                        expect(result.error).toContain(event);
                    }
                }
            });

            it('trả về lỗi khi events là mảng rỗng', () => {
                const result = buildNewWebhook(MOCK_ID, MOCK_URL, [], MOCK_USER_ID);

                expect(result.success).toBe(false);
                if (!result.success) expect(result.error).toContain('Cần ít nhất 1 event hợp lệ');
            });

            it('lỗi url được ưu tiên trước lỗi events', () => {
                const result = buildNewWebhook(MOCK_ID, 'not-a-url', [], MOCK_USER_ID);

                expect(result.success).toBe(false);
                if (!result.success) expect(result.error).toContain('http://');
            });

        });

    });

    describe('webhookToJSON()', () => {

        it('trả về đúng cấu trúc JSON', () => {
            const webhook = makeWebhook();
            const json = webhookToJSON(webhook);

            expect(json).toEqual({
                id: MOCK_ID,
                url: MOCK_URL,
                events: MOCK_EVENTS,
                isActive: true,
                userId: MOCK_USER_ID,
                createdAt: webhook.createdAt,
            });
        });

        it('JSON không có field thừa ngoài spec', () => {
            const json = webhookToJSON(makeWebhook());
            const expectedKeys = ['id', 'url', 'events', 'isActive', 'userId', 'createdAt'];

            expect(Object.keys(json)).toEqual(expectedKeys);
        });

        it('events trong JSON là array', () => {
            const json = webhookToJSON(makeWebhook());

            expect(Array.isArray(json.events)).toBe(true);
        });

        it('phản ánh đúng khi isActive = false', () => {
            const webhook = makeWebhook({ isActive: false });
            const json = webhookToJSON(webhook);

            expect(json.isActive).toBe(false);
        });

        it('phản ánh đúng sau khi buildNewWebhook', () => {
            const result = buildNewWebhook(MOCK_ID, MOCK_URL, ['job.completed', 'job.failed'], MOCK_USER_ID);

            expect(result.success).toBe(true);
            if (!result.success) return;

            const json = webhookToJSON(result.value);

            expect(json.id).toBe(MOCK_ID);
            expect(json.url).toBe(MOCK_URL);
            expect(json.events).toEqual(['job.completed', 'job.failed']);
            expect(json.isActive).toBe(true);
            expect(json.userId).toBe(MOCK_USER_ID);
        });

    });

});