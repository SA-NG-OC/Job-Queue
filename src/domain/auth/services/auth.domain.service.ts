import { v4 as uuidv4 } from 'uuid'
import { Result, ok, err } from '../../shared/result';
import { createEmail } from '../value-objects/email.vo';
import { createPassword, hashPassword, verifyPassword, fromHashedString } from '../value-objects/password.vo';
import { UserEntity, createUserEntity, UserRole } from '../entities/user.entity';

export type CreateUserInput = {
    email: string;
    password: string;
    role?: UserRole;
};

export const buildNewUser = async (
    input: CreateUserInput
): Promise<Result<UserEntity>> => {
    const emailResult = createEmail(input.email);
    if (!emailResult.success) return err(emailResult.error);

    const passwordResult = createPassword(input.password);
    if (!passwordResult.success) return err(passwordResult.error);

    const hashedPassword = await hashPassword(passwordResult.value);

    return ok(
        createUserEntity(uuidv4(), {
            email: emailResult.value,
            passwordHash: hashedPassword,
            role: input.role ?? 'USER',
            createdAt: new Date(),
            updatedAt: new Date(),
        })
    );
};

export const validateCredentials = async (
    rawPassword: string,
    user: UserEntity
): Promise<Result<true>> => {
    const isValid = await verifyPassword(rawPassword, user.passwordHash);
    if (!isValid) return err('Email hoặc mật khẩu không đúng');
    return ok(true);
};