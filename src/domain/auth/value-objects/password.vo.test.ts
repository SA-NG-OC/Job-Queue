import { describe, it, expect } from 'vitest';
import {
    createPassword,
    hashPassword,
    fromHashedString,
    verifyPassword,
} from './password.vo';

describe('Password Value Object', () => {

    describe('createPassword()', () => {

        it('tạo password hợp lệ', () => {
            const result = createPassword('Password1');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.value.value).toBe('Password1');
                expect(result.value._brand).toBe('UnhashedPassword');
            }
        });

        it('trả về lỗi khi dưới 8 ký tự', () => {
            const result = createPassword('Pass1');

            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Mật khẩu tối thiểu 8 ký tự');
        });

        it('trả về lỗi khi không có chữ hoa', () => {
            const result = createPassword('password1');

            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Cần ít nhất 1 chữ hoa');
        });

        it('trả về lỗi khi không có số', () => {
            const result = createPassword('PasswordOnly');

            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Cần ít nhất 1 số');
        });

        it('trả về lỗi khi chuỗi rỗng', () => {
            const result = createPassword('');

            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Mật khẩu tối thiểu 8 ký tự');
        });

        it('lỗi độ dài được ưu tiên trước lỗi chữ hoa/số', () => {
            const result = createPassword('abcdefg'); // 7 ký tự, không hoa, không số

            expect(result.success).toBe(false);
            if (!result.success) expect(result.error).toBe('Mật khẩu tối thiểu 8 ký tự');
        });

        it('chấp nhận password đúng 8 ký tự', () => {
            const result = createPassword('Passwor1');
            expect(result.success).toBe(true);
        });

        it('chấp nhận password dài với ký tự đặc biệt', () => {
            const result = createPassword('MyStr0ng!P@ssword#2024');
            expect(result.success).toBe(true);
        });

    });

    describe('hashPassword()', () => {

        it('trả về HashedPassword với _brand đúng', async () => {
            const result = createPassword('Password1');
            expect(result.success).toBe(true);
            if (!result.success) return;

            const hashed = await hashPassword(result.value);
            expect(hashed._brand).toBe('HashedPassword');
        });

        it('hash không bằng plaintext gốc', async () => {
            const result = createPassword('Password1');
            if (!result.success) return;

            const hashed = await hashPassword(result.value);
            expect(hashed.value).not.toBe('Password1');
        });

        it('hai lần hash cùng password cho kết quả khác nhau (salt ngẫu nhiên)', async () => {
            const result = createPassword('Password1');
            if (!result.success) return;

            const hash1 = await hashPassword(result.value);
            const hash2 = await hashPassword(result.value);
            expect(hash1.value).not.toBe(hash2.value);
        });

        it('hash là chuỗi bcrypt hợp lệ (bắt đầu với $2b$)', async () => {
            const result = createPassword('Password1');
            if (!result.success) return;

            const hashed = await hashPassword(result.value);
            expect(hashed.value).toMatch(/^\$2b\$/);
        });

    });

    describe('fromHashedString()', () => {

        it('wrap chuỗi thành HashedPassword', () => {
            const raw = '$2b$12$somehashvalue';
            const hashed = fromHashedString(raw);

            expect(hashed._brand).toBe('HashedPassword');
            expect(hashed.value).toBe(raw);
        });

        it('giữ nguyên giá trị không thay đổi', () => {
            const raw = '$2b$12$abc123xyz';
            const hashed = fromHashedString(raw);

            expect(hashed.value).toBe(raw);
        });

    });

    describe('verifyPassword()', () => {

        it('trả về true khi password khớp', async () => {
            const result = createPassword('Password1');
            if (!result.success) return;

            const hashed = await hashPassword(result.value);
            const match = await verifyPassword('Password1', hashed);
            expect(match).toBe(true);
        });

        it('trả về false khi password không khớp', async () => {
            const result = createPassword('Password1');
            if (!result.success) return;

            const hashed = await hashPassword(result.value);
            const match = await verifyPassword('WrongPass9', hashed);
            expect(match).toBe(false);
        });

        it('trả về false khi chuỗi rỗng', async () => {
            const result = createPassword('Password1');
            if (!result.success) return;

            const hashed = await hashPassword(result.value);
            const match = await verifyPassword('', hashed);
            expect(match).toBe(false);
        });

        it('phân biệt hoa thường', async () => {
            const result = createPassword('Password1');
            if (!result.success) return;

            const hashed = await hashPassword(result.value);
            const match = await verifyPassword('password1', hashed);
            expect(match).toBe(false);
        });

        it('hoạt động với hash được restore từ fromHashedString()', async () => {
            const result = createPassword('Password1');
            if (!result.success) return;

            const hashed = await hashPassword(result.value);
            const restored = fromHashedString(hashed.value);
            const match = await verifyPassword('Password1', restored);
            expect(match).toBe(true);
        });

    });

});