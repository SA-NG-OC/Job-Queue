import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeLoginUseCase } from './login.use-case';
import { makeRegisterUseCase } from './register.use-case';
import { makeRefreshTokenUseCase } from './refresh-token.use-case';
import { UserRepository } from '../../domain/auth/repositories/user.repository';
import { UserEntity } from '../../domain/auth/entities/user.entity';

vi.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));

vi.mock('../../infrastructure/http/utils/jwt', () => ({
    signAccessToken: vi.fn(() => 'mock-access-token'),
    signRefreshToken: vi.fn(() => 'mock-refresh-token'),
    verifyRefreshToken: vi.fn(),
}));

vi.mock('../../infrastructure/events/audit.listener', () => ({
    emitAudit: vi.fn(),
}));

vi.mock('../../domain/auth/services/auth.domain.service', () => ({
    validateCredentials: vi.fn(),
    buildNewUser: vi.fn(),
}));

// import sau khi mock để lấy typed mock
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../infrastructure/http/utils/jwt';
import { emitAudit } from '../../infrastructure/events/audit.listener';
import { validateCredentials, buildNewUser } from '../../domain/auth/services/auth.domain.service';

// -----------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------

const MOCK_EMAIL_VO = { _brand: 'Email' as const, value: 'user@example.com' };

const MOCK_USER: UserEntity = {
    id: 'user-uuid-1234',
    email: MOCK_EMAIL_VO,
    passwordHash: { _brand: 'HashedPassword' as const, value: '$2b$12$hashed' },
    role: 'USER',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

const makeMockRepo = (): UserRepository => ({
    findByEmail: vi.fn(),
    findById: vi.fn(),
    exists: vi.fn(),
    save: vi.fn(),
});

// -----------------------------------------------------------------------
// makeLoginUseCase
// -----------------------------------------------------------------------

describe('makeLoginUseCase()', () => {

    let repo: UserRepository;
    let login: ReturnType<typeof makeLoginUseCase>;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = makeMockRepo();
        login = makeLoginUseCase(repo);
    });

    it('đăng nhập thành công, trả về user + tokens', async () => {
        vi.mocked(repo.findByEmail).mockResolvedValue(MOCK_USER);
        vi.mocked(validateCredentials).mockResolvedValue({ success: true, value: true });

        const result = await login({ email: 'user@example.com', password: 'Password1' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.accessToken).toBe('mock-access-token');
            expect(result.value.refreshToken).toBe('mock-refresh-token');
            expect(result.value.user).toBeDefined();
        }
    });

    it('trả về lỗi khi email không tồn tại', async () => {
        vi.mocked(repo.findByEmail).mockResolvedValue(null);

        const result = await login({ email: 'notfound@example.com', password: 'Password1' });

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toBe('Email hoặc mật khẩu không đúng');
    });

    it('trả về lỗi khi password sai', async () => {
        vi.mocked(repo.findByEmail).mockResolvedValue(MOCK_USER);
        vi.mocked(validateCredentials).mockResolvedValue({
            success: false,
            error: 'Email hoặc mật khẩu không đúng',
        });

        const result = await login({ email: 'user@example.com', password: 'WrongPass' });

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toBe('Email hoặc mật khẩu không đúng');
    });

    it('gọi findByEmail với đúng email', async () => {
        vi.mocked(repo.findByEmail).mockResolvedValue(null);

        await login({ email: 'user@example.com', password: 'Password1' });

        expect(repo.findByEmail).toHaveBeenCalledWith('user@example.com');
        expect(repo.findByEmail).toHaveBeenCalledTimes(1);
    });

    it('gọi validateCredentials với đúng password và user', async () => {
        vi.mocked(repo.findByEmail).mockResolvedValue(MOCK_USER);
        vi.mocked(validateCredentials).mockResolvedValue({ success: true, value: true });

        await login({ email: 'user@example.com', password: 'Password1' });

        expect(validateCredentials).toHaveBeenCalledWith('Password1', MOCK_USER);
    });

    it('gọi signAccessToken và signRefreshToken với đúng payload', async () => {
        vi.mocked(repo.findByEmail).mockResolvedValue(MOCK_USER);
        vi.mocked(validateCredentials).mockResolvedValue({ success: true, value: true });

        await login({ email: 'user@example.com', password: 'Password1' });

        const expectedPayload = {
            userId: MOCK_USER.id,
            email: MOCK_USER.email.value,
            role: MOCK_USER.role,
        };
        expect(signAccessToken).toHaveBeenCalledWith(expectedPayload);
        expect(signRefreshToken).toHaveBeenCalledWith(expectedPayload);
    });

    it('emit audit event auth.login sau khi đăng nhập thành công', async () => {
        vi.mocked(repo.findByEmail).mockResolvedValue(MOCK_USER);
        vi.mocked(validateCredentials).mockResolvedValue({ success: true, value: true });

        await login({ email: 'user@example.com', password: 'Password1' });

        expect(emitAudit).toHaveBeenCalledWith({
            action: 'auth.login',
            userId: MOCK_USER.id,
            meta: { email: MOCK_USER.email.value, role: MOCK_USER.role },
        });
    });

    it('không emit audit khi đăng nhập thất bại (email không tồn tại)', async () => {
        vi.mocked(repo.findByEmail).mockResolvedValue(null);

        await login({ email: 'notfound@example.com', password: 'Password1' });

        expect(emitAudit).not.toHaveBeenCalled();
    });

    it('không emit audit khi đăng nhập thất bại (sai password)', async () => {
        vi.mocked(repo.findByEmail).mockResolvedValue(MOCK_USER);
        vi.mocked(validateCredentials).mockResolvedValue({
            success: false,
            error: 'Email hoặc mật khẩu không đúng',
        });

        await login({ email: 'user@example.com', password: 'WrongPass' });

        expect(emitAudit).not.toHaveBeenCalled();
    });

    it('không gọi signToken khi xác thực thất bại', async () => {
        vi.mocked(repo.findByEmail).mockResolvedValue(null);

        await login({ email: 'notfound@example.com', password: 'Password1' });

        expect(signAccessToken).not.toHaveBeenCalled();
        expect(signRefreshToken).not.toHaveBeenCalled();
    });

});

// -----------------------------------------------------------------------
// makeRegisterUseCase
// -----------------------------------------------------------------------

describe('makeRegisterUseCase()', () => {

    let repo: UserRepository;
    let register: ReturnType<typeof makeRegisterUseCase>;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = makeMockRepo();
        register = makeRegisterUseCase(repo);
    });

    it('đăng ký thành công, trả về user + tokens', async () => {
        vi.mocked(repo.exists).mockResolvedValue(false);
        vi.mocked(buildNewUser).mockResolvedValue({ success: true, value: MOCK_USER });
        vi.mocked(repo.save).mockResolvedValue(MOCK_USER);

        const result = await register({ email: 'user@example.com', password: 'Password1' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.accessToken).toBe('mock-access-token');
            expect(result.value.refreshToken).toBe('mock-refresh-token');
            expect(result.value.user).toBeDefined();
        }
    });

    it('trả về lỗi khi email đã tồn tại', async () => {
        vi.mocked(repo.exists).mockResolvedValue(true);

        const result = await register({ email: 'user@example.com', password: 'Password1' });

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toBe('Email đã được sử dụng');
    });

    it('trả về lỗi khi buildNewUser thất bại (password yếu)', async () => {
        vi.mocked(repo.exists).mockResolvedValue(false);
        vi.mocked(buildNewUser).mockResolvedValue({
            success: false,
            error: 'Mật khẩu tối thiểu 8 ký tự',
        });

        const result = await register({ email: 'user@example.com', password: 'weak' });

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toBe('Mật khẩu tối thiểu 8 ký tự');
    });

    it('gọi repo.exists với đúng email', async () => {
        vi.mocked(repo.exists).mockResolvedValue(true);

        await register({ email: 'user@example.com', password: 'Password1' });

        expect(repo.exists).toHaveBeenCalledWith('user@example.com');
        expect(repo.exists).toHaveBeenCalledTimes(1);
    });

    it('gọi buildNewUser với đúng command', async () => {
        vi.mocked(repo.exists).mockResolvedValue(false);
        vi.mocked(buildNewUser).mockResolvedValue({ success: true, value: MOCK_USER });
        vi.mocked(repo.save).mockResolvedValue(MOCK_USER);

        await register({ email: 'user@example.com', password: 'Password1' });

        expect(buildNewUser).toHaveBeenCalledWith({
            email: 'user@example.com',
            password: 'Password1',
        });
    });

    it('gọi repo.save với user từ buildNewUser', async () => {
        vi.mocked(repo.exists).mockResolvedValue(false);
        vi.mocked(buildNewUser).mockResolvedValue({ success: true, value: MOCK_USER });
        vi.mocked(repo.save).mockResolvedValue(MOCK_USER);

        await register({ email: 'user@example.com', password: 'Password1' });

        expect(repo.save).toHaveBeenCalledWith(MOCK_USER);
        expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('gọi signToken với payload từ saved user', async () => {
        vi.mocked(repo.exists).mockResolvedValue(false);
        vi.mocked(buildNewUser).mockResolvedValue({ success: true, value: MOCK_USER });
        vi.mocked(repo.save).mockResolvedValue(MOCK_USER);

        await register({ email: 'user@example.com', password: 'Password1' });

        const expectedPayload = {
            userId: MOCK_USER.id,
            email: MOCK_USER.email.value,
            role: MOCK_USER.role,
        };
        expect(signAccessToken).toHaveBeenCalledWith(expectedPayload);
        expect(signRefreshToken).toHaveBeenCalledWith(expectedPayload);
    });

    it('emit audit event auth.register sau khi đăng ký thành công', async () => {
        vi.mocked(repo.exists).mockResolvedValue(false);
        vi.mocked(buildNewUser).mockResolvedValue({ success: true, value: MOCK_USER });
        vi.mocked(repo.save).mockResolvedValue(MOCK_USER);

        await register({ email: 'user@example.com', password: 'Password1' });

        expect(emitAudit).toHaveBeenCalledWith({
            action: 'auth.register',
            userId: MOCK_USER.id,
            meta: { email: MOCK_USER.email.value, role: MOCK_USER.role },
        });
    });

    it('không gọi repo.save khi email đã tồn tại', async () => {
        vi.mocked(repo.exists).mockResolvedValue(true);

        await register({ email: 'user@example.com', password: 'Password1' });

        expect(repo.save).not.toHaveBeenCalled();
    });

    it('không gọi repo.save khi buildNewUser thất bại', async () => {
        vi.mocked(repo.exists).mockResolvedValue(false);
        vi.mocked(buildNewUser).mockResolvedValue({
            success: false,
            error: 'Cần ít nhất 1 chữ hoa',
        });

        await register({ email: 'user@example.com', password: 'password1' });

        expect(repo.save).not.toHaveBeenCalled();
    });

    it('không emit audit khi đăng ký thất bại', async () => {
        vi.mocked(repo.exists).mockResolvedValue(true);

        await register({ email: 'user@example.com', password: 'Password1' });

        expect(emitAudit).not.toHaveBeenCalled();
    });

    it('không gọi signToken khi đăng ký thất bại', async () => {
        vi.mocked(repo.exists).mockResolvedValue(true);

        await register({ email: 'user@example.com', password: 'Password1' });

        expect(signAccessToken).not.toHaveBeenCalled();
        expect(signRefreshToken).not.toHaveBeenCalled();
    });

});

// -----------------------------------------------------------------------
// makeRefreshTokenUseCase
// -----------------------------------------------------------------------

describe('makeRefreshTokenUseCase()', () => {

    let repo: UserRepository;
    let refreshToken: ReturnType<typeof makeRefreshTokenUseCase>;

    const MOCK_TOKEN_PAYLOAD = {
        userId: MOCK_USER.id,
        email: MOCK_USER.email.value,
        role: MOCK_USER.role,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        repo = makeMockRepo();
        refreshToken = makeRefreshTokenUseCase(repo);
    });

    it('refresh thành công, trả về accessToken và refreshToken mới', async () => {
        vi.mocked(verifyRefreshToken).mockReturnValue(MOCK_TOKEN_PAYLOAD);
        vi.mocked(repo.findById).mockResolvedValue(MOCK_USER);

        const result = await refreshToken({ refreshToken: 'valid-refresh-token' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.accessToken).toBe('mock-access-token');
            expect(result.value.refreshToken).toBe('mock-refresh-token');
        }
    });

    it('trả về lỗi khi token không hợp lệ (verifyRefreshToken throw)', async () => {
        vi.mocked(verifyRefreshToken).mockImplementation(() => {
            throw new Error('invalid token');
        });

        const result = await refreshToken({ refreshToken: 'bad-token' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe('Refresh token không hợp lệ hoặc đã hết hạn');
        }
    });

    it('trả về lỗi khi token hết hạn (verifyRefreshToken throw)', async () => {
        vi.mocked(verifyRefreshToken).mockImplementation(() => {
            throw new Error('jwt expired');
        });

        const result = await refreshToken({ refreshToken: 'expired-token' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe('Refresh token không hợp lệ hoặc đã hết hạn');
        }
    });

    it('trả về lỗi khi user không còn tồn tại trong DB', async () => {
        vi.mocked(verifyRefreshToken).mockReturnValue(MOCK_TOKEN_PAYLOAD);
        vi.mocked(repo.findById).mockResolvedValue(null);

        const result = await refreshToken({ refreshToken: 'valid-refresh-token' });

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toBe('User không tồn tại');
    });

    it('gọi verifyRefreshToken với đúng token', async () => {
        vi.mocked(verifyRefreshToken).mockReturnValue(MOCK_TOKEN_PAYLOAD);
        vi.mocked(repo.findById).mockResolvedValue(MOCK_USER);

        await refreshToken({ refreshToken: 'valid-refresh-token' });

        expect(verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('gọi findById với đúng userId từ payload', async () => {
        vi.mocked(verifyRefreshToken).mockReturnValue(MOCK_TOKEN_PAYLOAD);
        vi.mocked(repo.findById).mockResolvedValue(MOCK_USER);

        await refreshToken({ refreshToken: 'valid-refresh-token' });

        expect(repo.findById).toHaveBeenCalledWith(MOCK_USER.id);
        expect(repo.findById).toHaveBeenCalledTimes(1);
    });

    it('gọi signToken với payload từ user trong DB (không phải payload cũ)', async () => {
        vi.mocked(verifyRefreshToken).mockReturnValue(MOCK_TOKEN_PAYLOAD);
        vi.mocked(repo.findById).mockResolvedValue(MOCK_USER);

        await refreshToken({ refreshToken: 'valid-refresh-token' });

        const expectedPayload = {
            userId: MOCK_USER.id,
            email: MOCK_USER.email.value,
            role: MOCK_USER.role,
        };
        expect(signAccessToken).toHaveBeenCalledWith(expectedPayload);
        expect(signRefreshToken).toHaveBeenCalledWith(expectedPayload);
    });

    it('không gọi findById khi verifyRefreshToken throw', async () => {
        vi.mocked(verifyRefreshToken).mockImplementation(() => {
            throw new Error('invalid');
        });

        await refreshToken({ refreshToken: 'bad-token' });

        expect(repo.findById).not.toHaveBeenCalled();
    });

    it('không gọi signToken khi user không tồn tại', async () => {
        vi.mocked(verifyRefreshToken).mockReturnValue(MOCK_TOKEN_PAYLOAD);
        vi.mocked(repo.findById).mockResolvedValue(null);

        await refreshToken({ refreshToken: 'valid-refresh-token' });

        expect(signAccessToken).not.toHaveBeenCalled();
        expect(signRefreshToken).not.toHaveBeenCalled();
    });

});