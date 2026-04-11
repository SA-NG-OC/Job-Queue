export type BaseEntity = {
    id: string;
};

export function entityEquals(a: BaseEntity, b: BaseEntity): boolean {
    return a.id === b.id;
}