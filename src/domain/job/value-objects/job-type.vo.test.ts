import { describe, it, expect } from 'vitest';
import { createJobType, JOB_TYPES } from './job-type.vo';

describe('JobType Value Object', () => {

    describe('JOB_TYPES constant', () => {

        it('có đủ 7 loại job', () => {
            expect(JOB_TYPES).toHaveLength(7);
        });

        it('bao gồm tất cả các loại hợp lệ', () => {
            expect(JOB_TYPES).toContain('SEND_EMAIL');
            expect(JOB_TYPES).toContain('SEND_SMS');
            expect(JOB_TYPES).toContain('RESIZE_IMAGE');
            expect(JOB_TYPES).toContain('COMPRESS_VIDEO');
            expect(JOB_TYPES).toContain('GENERATE_PDF');
            expect(JOB_TYPES).toContain('EXPORT_CSV');
            expect(JOB_TYPES).toContain('CALL_WEBHOOK');
        });

        it('không có loại bị duplicate', () => {
            const unique = new Set(JOB_TYPES);
            expect(unique.size).toBe(JOB_TYPES.length);
        });

    });

    describe('createJobType()', () => {

        it.each([...JOB_TYPES])('tạo thành công với type hợp lệ: %s', (type) => {
            const result = createJobType(type);

            expect(result.success).toBe(true);
            if (result.success) expect(result.value).toBe(type);
        });

        it('trả về lỗi khi type không hợp lệ', () => {
            const result = createJobType('INVALID_TYPE');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('Job type không hợp lệ');
            }
        });

        it('thông báo lỗi liệt kê các loại hợp lệ', () => {
            const result = createJobType('UNKNOWN');

            expect(result.success).toBe(false);
            if (!result.success) {
                for (const type of JOB_TYPES) {
                    expect(result.error).toContain(type);
                }
            }
        });

        it('trả về lỗi khi chuỗi rỗng', () => {
            const result = createJobType('');

            expect(result.success).toBe(false);
        });

        it('trả về lỗi khi lowercase (phân biệt hoa thường)', () => {
            const result = createJobType('send_email');

            expect(result.success).toBe(false);
        });

        it('trả về lỗi khi có khoảng trắng thừa', () => {
            const result = createJobType(' SEND_EMAIL ');

            expect(result.success).toBe(false);
        });

    });

});