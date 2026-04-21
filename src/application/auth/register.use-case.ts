import { Result, ok, err } from '../../domain/shared/result';
import { UserRepository } from '../../domain/auth/repositories/user.repository';
import { buildNewUser } from '../../domain/auth/services/auth.domain.service';
import { userToJSON } from '../../domain/auth/entities/user.entity';
import { signAccessToken, signRefreshToken } from '../../infrastructure/http/utils/jwt';

export type RegisterCommand = { email: string; password: string };

export type AuthTokensResult = {
    user: ReturnType<typeof userToJSON>;
    accessToken: string;
    refreshToken: string;
};

export const makeRegisterUseCase = (userRepo: UserRepository) => {
    return async (cmd: RegisterCommand): Promise<Result<AuthTokensResult>> => {
        const exists = await userRepo.exists(cmd.email);
        if (exists) return err('Email đã được sử dụng');

        const userResult = await buildNewUser(cmd);
        if (!userResult.success) return err(userResult.error);

        const saved = await userRepo.save(userResult.value);
        const payload = { userId: saved.id, email: saved.email.value, role: saved.role };
        return ok({
            user: userToJSON(saved),
            accessToken: signAccessToken(payload),
            refreshToken: signRefreshToken(payload),
        });
    }
}