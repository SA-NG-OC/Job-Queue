import bcrypt, { compare } from 'bcryptjs'
import { Result, ok, err } from '../../shared/result'

export type HashedPassword = { readonly _brand: 'HashedPassword', readonly value: string };
export type UnhashedPassword = { readonly _brand: 'UnhashedPassword', readonly value: string };

export const createPassword = (raw: string): Result<UnhashedPassword> => {
    if (raw.length < 8) return err('Mật khẩu tối thiểu 8 ký tự');
    if (!/[A-Z]/.test(raw)) return err('Cần ít nhất 1 chữ hoa');
    if (!/[0-9]/.test(raw)) return err('Cần ít nhất 1 số');
    return ok({ _brand: 'UnhashedPassword', value: raw } as UnhashedPassword);
}

export const hashPassword = async (password: UnhashedPassword): Promise<HashedPassword> => {
    const hashed = await bcrypt.hash(password.value, 12);
    return { _brand: 'HashedPassword', value: hashed } as HashedPassword;
}

export const fromHashedString = (hashed: string): HashedPassword => ({ _brand: 'HashedPassword', value: hashed } as HashedPassword);
export const verifyPassword = (raw: string, hashed: HashedPassword): Promise<boolean> => bcrypt.compare(raw, hashed.value);