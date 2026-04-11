import { UserEntity } from "../entities/user.entity";

export type UserRepository = {
    findById: (id: string) => Promise<UserEntity | null>;
    findByEmail: (email: string) => Promise<UserEntity | null>;
    save: (user: UserEntity) => Promise<UserEntity>;
    exists: (email: string) => Promise<boolean>;
}