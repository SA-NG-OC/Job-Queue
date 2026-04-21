import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { UserRepository } from './user.repository';
import { UserEntity, createUserEntity } from '../entities/user.entity';
import { createEmail } from '../value-objects/email.vo';
import { fromHashedString } from '../value-objects/password.vo';

const toEntity = (row: typeof users.$inferSelect): UserEntity => {
    const emailResult = createEmail(row.email);
    if (!emailResult.success)
        throw new Error('Corrupt email in DB');
    return createUserEntity(row.id, {
        email: emailResult.value,
        passwordHash: fromHashedString(row.passwordHash),
        role: row.role,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    });
}

export const userDrizzleRepository: UserRepository = {
    findById: async (id) => {
        const row = await db.query.users.findFirst({ where: eq(users.id, id) });
        return row ? toEntity(row) : null;
    },

    findByEmail: async (email) => {
        const row = await db.query.users.findFirst({ where: eq(users.email, email) });
        return row ? toEntity(row) : null;
    },

    save: async (user) => {
        const [row] = await db
            .insert(users)
            .values({
                id: user.id,
                email: user.email.value,
                passwordHash: user.passwordHash.value,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            })
            .returning();
        return toEntity(row);
    },

    exists: async (email) => {
        const row = await db.query.users.findFirst({ where: eq(users.email, email) });
        return !!row;
    },

}