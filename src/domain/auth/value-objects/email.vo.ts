import { Result, ok, err } from "../../shared/result";
export type Email = { readonly _brand: 'Email', readonly value: string };

export const createEmail = (raw: string): Result<Email> => {
    const trimmed = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return err('Email không hợp lệ');
    }
    return ok({ _brand: 'Email', value: trimmed } as Email);
}