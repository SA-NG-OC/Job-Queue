import { Result, ok, err } from '../../domain/shared/result';
import { UserRepository } from '../../domain/auth/repositories/user.repository';
import { validateCredentials } from '../../domain/auth/services/auth.domain.service';
import { userToJSON } from '../../domain/auth/entities/user.entity';
import { signAccessToken, signRefreshToken } from '../../infrastructure/http/utils/jwt';

export type LoginCommand = { email: string; password: string };

export const makeLoginUseCase =
    (userRepo: UserRepository) =>
        async (cmd: LoginCommand): Promise<Result<{ user: object; accessToken: string; refreshToken: string }>> => {
            const user = await userRepo.findByEmail(cmd.email);

            // Trả cùng 1 message để tránh user enumeration attack
            if (!user) return err('Email hoặc mật khẩu không đúng');

            const credResult = await validateCredentials(cmd.password, user);
            if (!credResult.success) return err(credResult.error);

            const payload = { userId: user.id, email: user.email.value, role: user.role };

            return ok({
                user: userToJSON(user),
                accessToken: signAccessToken(payload),
                refreshToken: signRefreshToken(payload),
            });
        };