import { userDrizzleRepository } from './infrastructure/database/repositories/user.drizzle.repository';
import { makeRegisterUseCase } from './application/auth/use-cases/register.use-case';
import { makeLoginUseCase } from './application/auth/use-cases/login.use-case';
import { makeRefreshTokenUseCase } from './application/auth/use-cases/refresh-token.use-case';

// Wire repositories
const userRepo = userDrizzleRepository;

// Wire use cases
export const registerUseCase = makeRegisterUseCase(userRepo);
export const loginUseCase = makeLoginUseCase(userRepo);
export const refreshTokenUseCase = makeRefreshTokenUseCase(userRepo);