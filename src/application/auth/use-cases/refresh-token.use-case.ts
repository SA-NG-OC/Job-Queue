import { Result, ok, err } from '../../../domain/shared/result';
import { UserRepository } from '../../../domain/auth/repositories/user.repository';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '../../../infrastructure/http/utils/jwt';

export type RefreshTokenCommand = { refreshToken: string };

export const makeRefreshTokenUseCase =
    (userRepo: UserRepository) =>
        async (cmd: RefreshTokenCommand): Promise<Result<{ accessToken: string; refreshToken: string }>> => {
            try {
                const payload = verifyRefreshToken(cmd.refreshToken);

                const user = await userRepo.findById(payload.userId);
                if (!user) return err('User không tồn tại');

                const newPayload = { userId: user.id, email: user.email.value, role: user.role };

                return ok({
                    accessToken: signAccessToken(newPayload),
                    refreshToken: signRefreshToken(newPayload),
                });
            } catch {
                return err('Refresh token không hợp lệ hoặc đã hết hạn');
            }
        };