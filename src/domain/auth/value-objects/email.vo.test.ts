import { describe, it, expect } from 'vitest';
import { createEmail } from './email.vo';

describe('Email Value Object', () => {

    describe('createEmail() - valid', () => {

        it('tạo email hợp lệ', () => {
            const result = createEmail('user@example.com');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.value.value).toBe('user@example.com');
                expect(result.value._brand).toBe('Email');
            }
        });

        it('trim whitespace đầu cuối', () => {
            const result = createEmail('  user@example.com  ');

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.value).toBe('user@example.com');
        });

        it('lowercase email', () => {
            const result = createEmail('USER@EXAMPLE.COM');

            expect(result.success).toBe(true);
            if (result.success) expect(result.value.value).toBe('user@example.com');
        });

        it('email có subdomain hợp lệ', () => {
            const result = createEmail('user@mail.example.co.uk');
            expect(result.success).toBe(true);
        });

        it('email có dấu + hợp lệ', () => {
            const result = createEmail('user+tag@example.com');
            expect(result.success).toBe(true);
        });

        it('email có dấu . trong local part hợp lệ', () => {
            const result = createEmail('first.last@example.com');
            expect(result.success).toBe(true);
        });

    });

    describe('createEmail() - invalid', () => {

        it('trả về lỗi khi thiếu @', () => {
            const result = createEmail('userexample.com');

            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Email không hợp lệ');
        });

        it('trả về lỗi khi thiếu domain', () => {
            const result = createEmail('user@');
            expect(result.success).toBe(false);
        });

        it('trả về lỗi khi chuỗi rỗng', () => {
            const result = createEmail('');
            expect(result.success).toBe(false);
        });

        it('trả về lỗi khi chỉ có khoảng trắng', () => {
            const result = createEmail('   ');
            expect(result.success).toBe(false);
        });

        it('trả về lỗi khi thiếu TLD', () => {
            const result = createEmail('user@example');
            expect(result.success).toBe(false);
        });

        it('trả về lỗi khi có khoảng trắng trong email', () => {
            const result = createEmail('user @example.com');
            expect(result.success).toBe(false);
        });

        it('trả về lỗi khi có nhiều @', () => {
            const result = createEmail('user@@example.com');
            expect(result.success).toBe(false);
        });

    });

});