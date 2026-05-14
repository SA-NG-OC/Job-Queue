import { describe, it, expect } from 'vitest';
import { createUserEntity, userToJSON } from './user.entity';
import { createEmail } from '../value-objects/email.vo';
import { fromHashedString } from '../value-objects/password.vo';
import { entityEquals } from '../../shared/entity.base';

const emailResult = createEmail('test@example.com');
if (!emailResult.success) throw new Error('Email mock không hợp lệ');
const MOCK_EMAIL = emailResult.value;
const MOCK_HASH = fromHashedString('$2b$12$hashedvalue');
const MOCK_ID = 'user-uuid-1234';

const makeUser = (overrides = {}) =>
    createUserEntity(MOCK_ID, {
        email: MOCK_EMAIL,
        passwordHash: MOCK_HASH,
        role: 'USER' as const,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        ...overrides,
    });

describe('UserEntity', () => {

    describe('createUserEntity()', () => {

        it('tạo entity với đầy đủ thông tin', () => {
            const user = makeUser();

            expect(user.id).toBe(MOCK_ID);
            expect(user.email).toBe(MOCK_EMAIL);
            expect(user.passwordHash).toBe(MOCK_HASH);
            expect(user.role).toBe('USER');
            expect(user.createdAt).toBeInstanceOf(Date);
            expect(user.updatedAt).toBeInstanceOf(Date);
        });

        it('tạo được user với role ADMIN', () => {
            const user = makeUser({ role: 'ADMIN' });
            expect(user.role).toBe('ADMIN');
        });

        it('hai user cùng id là cùng entity (entityEquals)', () => {
            const user1 = makeUser();
            const user2 = makeUser();
            expect(entityEquals(user1, user2)).toBe(true);
        });

        it('hai user khác id là entity khác nhau (entityEquals)', () => {
            const user1 = makeUser();
            const user2 = createUserEntity('other-uuid', {
                email: MOCK_EMAIL,
                passwordHash: MOCK_HASH,
                role: 'USER',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            expect(entityEquals(user1, user2)).toBe(false);
        });

    });

    describe('userToJSON()', () => {

        it('trả về đúng cấu trúc JSON', () => {
            const user = makeUser();
            const json = userToJSON(user);

            expect(json).toEqual({
                id: MOCK_ID,
                email: 'test@example.com',
                role: 'USER',
                createdAt: user.createdAt,
            });
        });

        it('email trong JSON là string, không phải Email object', () => {
            const user = makeUser();
            const json = userToJSON(user);

            expect(typeof json.email).toBe('string');
            expect(json.email).toBe('test@example.com');
        });

        it('không expose passwordHash trong JSON', () => {
            const user = makeUser();
            const json = userToJSON(user);

            expect(json).not.toHaveProperty('passwordHash');
        });

        it('không expose updatedAt trong JSON', () => {
            const user = makeUser();
            const json = userToJSON(user);

            expect(json).not.toHaveProperty('updatedAt');
        });

        it('JSON không có field thừa ngoài spec', () => {
            const user = makeUser();
            const json = userToJSON(user);

            expect(Object.keys(json)).toEqual(['id', 'email', 'role', 'createdAt']);
        });

        it('createdAt trong JSON là Date object', () => {
            const user = makeUser();
            const json = userToJSON(user);

            expect(json.createdAt).toBeInstanceOf(Date);
        });

    });

});