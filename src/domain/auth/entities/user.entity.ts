import { BaseEntity } from "../../shared/entity.base";
import { Email } from "../value-objects/email.vo";
import { HashedPassword } from "../value-objects/password.vo";

export type UserRole = 'USER' | 'ADMIN';

export type UserEntity = BaseEntity & {
    email: Email;
    passwordHash: HashedPassword;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

export const createUserEntity = (
    id: string,
    props: Omit<UserEntity, 'id'>
): UserEntity => ({ id, ...props });

export const userToJSON = (user: UserEntity) => ({
    id: user.id,
    email: user.email.value,
    role: user.role,
    createdAt: user.createdAt,
});