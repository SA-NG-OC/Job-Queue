import { describe, it, expect } from 'vitest';
import { validateJobPayload } from './job-payload.vo';

describe('JobPayload Value Object', () => {

    describe('SEND_EMAIL', () => {

        it('hợp lệ với đầy đủ trường', () => {
            const result = validateJobPayload('SEND_EMAIL', {
                to: 'user@example.com',
                subject: 'Hello',
                body: 'This is a test email',
            });
            expect(result.success).toBe(true);
        });

        it('trả về lỗi khi thiếu to', () => {
            const result = validateJobPayload('SEND_EMAIL', {
                subject: 'Hello',
                body: 'Body',
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường to');
        });

        it('trả về lỗi khi thiếu subject', () => {
            const result = validateJobPayload('SEND_EMAIL', {
                to: 'user@example.com',
                body: 'Body',
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường subject');
        });

        it('trả về lỗi khi thiếu body', () => {
            const result = validateJobPayload('SEND_EMAIL', {
                to: 'user@example.com',
                subject: 'Hello',
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường body');
        });

        it('trả về lỗi khi payload là null', () => {
            const result = validateJobPayload('SEND_EMAIL', null);
            expect(result.success).toBe(false);
        });

    });

    describe('SEND_SMS', () => {

        it('hợp lệ với đầy đủ trường', () => {
            const result = validateJobPayload('SEND_SMS', {
                to: '+84901234567',
                message: 'Your OTP is 123456',
            });
            expect(result.success).toBe(true);
        });

        it('trả về lỗi khi thiếu to', () => {
            const result = validateJobPayload('SEND_SMS', { message: 'OTP' });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường to');
        });

        it('trả về lỗi khi thiếu message', () => {
            const result = validateJobPayload('SEND_SMS', { to: '+84901234567' });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường message');
        });

    });

    describe('RESIZE_IMAGE', () => {

        it('hợp lệ với đầy đủ trường', () => {
            const result = validateJobPayload('RESIZE_IMAGE', {
                imageUrl: 'https://example.com/image.jpg',
                width: 800,
                height: 600,
            });
            expect(result.success).toBe(true);
        });

        it('hợp lệ với format tùy chọn', () => {
            const result = validateJobPayload('RESIZE_IMAGE', {
                imageUrl: 'https://example.com/image.jpg',
                width: 800,
                height: 600,
                format: 'webp',
            });
            expect(result.success).toBe(true);
        });

        it('trả về lỗi khi thiếu imageUrl', () => {
            const result = validateJobPayload('RESIZE_IMAGE', { width: 800, height: 600 });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường imageUrl');
        });

        it('trả về lỗi khi thiếu width', () => {
            const result = validateJobPayload('RESIZE_IMAGE', {
                imageUrl: 'https://example.com/image.jpg',
                height: 600,
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường width');
        });

        it('trả về lỗi khi thiếu height', () => {
            const result = validateJobPayload('RESIZE_IMAGE', {
                imageUrl: 'https://example.com/image.jpg',
                width: 800,
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường height');
        });

        it('trả về lỗi khi width <= 0', () => {
            const result = validateJobPayload('RESIZE_IMAGE', {
                imageUrl: 'https://example.com/image.jpg',
                width: 0,
                height: 600,
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('width phải lớn hơn 0');
        });

        it('trả về lỗi khi height <= 0', () => {
            const result = validateJobPayload('RESIZE_IMAGE', {
                imageUrl: 'https://example.com/image.jpg',
                width: 800,
                height: -1,
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('height phải lớn hơn 0');
        });

    });

    describe('COMPRESS_VIDEO', () => {

        it('hợp lệ với đầy đủ trường', () => {
            const result = validateJobPayload('COMPRESS_VIDEO', {
                videoUrl: 'https://example.com/video.mp4',
                quality: 80,
            });
            expect(result.success).toBe(true);
        });

        it('hợp lệ với quality biên dưới (1)', () => {
            const result = validateJobPayload('COMPRESS_VIDEO', {
                videoUrl: 'https://example.com/video.mp4',
                quality: 1,
            });
            expect(result.success).toBe(true);
        });

        it('hợp lệ với quality biên trên (100)', () => {
            const result = validateJobPayload('COMPRESS_VIDEO', {
                videoUrl: 'https://example.com/video.mp4',
                quality: 100,
            });
            expect(result.success).toBe(true);
        });

        it('trả về lỗi khi thiếu videoUrl', () => {
            const result = validateJobPayload('COMPRESS_VIDEO', { quality: 80 });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường videoUrl');
        });

        it('trả về lỗi khi quality < 1', () => {
            const result = validateJobPayload('COMPRESS_VIDEO', {
                videoUrl: 'https://example.com/video.mp4',
                quality: 0,
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('quality phải từ 1-100');
        });

        it('trả về lỗi khi quality > 100', () => {
            const result = validateJobPayload('COMPRESS_VIDEO', {
                videoUrl: 'https://example.com/video.mp4',
                quality: 101,
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('quality phải từ 1-100');
        });

    });

    describe('GENERATE_PDF', () => {

        it('hợp lệ với đầy đủ trường', () => {
            const result = validateJobPayload('GENERATE_PDF', {
                templateId: 'invoice-v1',
                data: { orderId: '123', total: 99.99 },
            });
            expect(result.success).toBe(true);
        });

        it('trả về lỗi khi thiếu templateId', () => {
            const result = validateJobPayload('GENERATE_PDF', {
                data: { orderId: '123' },
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường templateId');
        });

        it('trả về lỗi khi thiếu data', () => {
            const result = validateJobPayload('GENERATE_PDF', {
                templateId: 'invoice-v1',
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường data');
        });

    });

    describe('EXPORT_CSV', () => {

        it('hợp lệ với đầy đủ trường', () => {
            const result = validateJobPayload('EXPORT_CSV', {
                filename: 'report.csv',
                data: [{ id: 1, name: 'Alice' }],
            });
            expect(result.success).toBe(true);
        });

        it('hợp lệ khi có thêm query tùy chọn', () => {
            const result = validateJobPayload('EXPORT_CSV', {
                filename: 'report.csv',
                data: [{ id: 1 }],
                query: 'SELECT * FROM users',
            });
            expect(result.success).toBe(true);
        });

        it('trả về lỗi khi thiếu data', () => {
            const result = validateJobPayload('EXPORT_CSV', {
                filename: 'report.csv',
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường data');
        });

        it('trả về lỗi khi thiếu filename', () => {
            const result = validateJobPayload('EXPORT_CSV', {
                data: [{ id: 1 }],
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường filename');
        });

    });

    describe('CALL_WEBHOOK', () => {

        it('hợp lệ với trường bắt buộc', () => {
            const result = validateJobPayload('CALL_WEBHOOK', {
                url: 'https://example.com/webhook',
                method: 'POST',
            });
            expect(result.success).toBe(true);
        });

        it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])('hợp lệ với method: %s', (method) => {
            const result = validateJobPayload('CALL_WEBHOOK', {
                url: 'https://example.com/webhook',
                method,
            });
            expect(result.success).toBe(true);
        });

        it('hợp lệ với headers và body tùy chọn', () => {
            const result = validateJobPayload('CALL_WEBHOOK', {
                url: 'https://example.com/webhook',
                method: 'POST',
                headers: { 'Authorization': 'Bearer token' },
                body: { event: 'order.created' },
            });
            expect(result.success).toBe(true);
        });

        it('trả về lỗi khi thiếu url', () => {
            const result = validateJobPayload('CALL_WEBHOOK', { method: 'POST' });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Thiếu trường url');
        });

        it('trả về lỗi khi method không hợp lệ', () => {
            const result = validateJobPayload('CALL_WEBHOOK', {
                url: 'https://example.com/webhook',
                method: 'INVALID',
            });
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('method không hợp lệ');
        });

        it('trả về lỗi khi thiếu method', () => {
            const result = validateJobPayload('CALL_WEBHOOK', {
                url: 'https://example.com/webhook',
            });
            expect(result.success).toBe(false);
        });

    });

});