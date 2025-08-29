import type { Preference } from "../types.js";

const store = new Map<string, Preference>();

export const memoryStore = {
    get(userId: string): Preference | undefined {
        return store.get(userId);
    },
    set(userId: string, pref: Preference): void {
        store.set(userId, pref);
    },
    has(userId: string): boolean {
        return store.has(userId);
    },
    delete(userId: string): boolean {
        return store.delete(userId);
    },
    clear(): void {
        store.clear();
    },
};
