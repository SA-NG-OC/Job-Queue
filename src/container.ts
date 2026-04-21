import { userDrizzleRepository } from './domain/auth/repositories/user.drizzle.repository';
import { makeRegisterUseCase } from './application/auth/register.use-case';
import { makeLoginUseCase } from './application/auth/login.use-case';
import { makeRefreshTokenUseCase } from './application/auth/refresh-token.use-case';
import { makeCreateJobUseCase } from './application/job/create-job.use-case';
import { makeGetJobByIdUseCase, makeGetJobsUseCase } from './application/job/get-jobs.use-case';
import { makeCancelJobUseCase } from './application/job/cancel-job.use-case';
import { makeRetryJobUseCase } from './application/job/retry-job.use-case';
import { jobDrizzleRepository } from './domain/job/repositories/job.drizzle.repository';

// Wire repositories
const userRepo = userDrizzleRepository;
const jobRepo = jobDrizzleRepository;

// Auth use case
export const registerUseCase = makeRegisterUseCase(userRepo);
export const loginUseCase = makeLoginUseCase(userRepo);
export const refreshTokenUseCase = makeRefreshTokenUseCase(userRepo);

// Job use case
export const createJobUseCase = makeCreateJobUseCase(jobRepo);
export const getJobsUseCase = makeGetJobsUseCase(jobRepo);
export const getJobByIdUseCase = makeGetJobByIdUseCase(jobRepo);
export const cancelJobUseCase = makeCancelJobUseCase(jobRepo);
export const retryJobUseCase = makeRetryJobUseCase(jobRepo);