import { describe, it, expect, beforeEach } from "vitest";
import { memoryStore } from "../src/store/memory.js";

describe("memoryStore", () => {
    beforeEach(() => memoryStore.clear());

    it("set/get/has/delete/clear", () => {
        const pref = { dnd: null, eventSettings: { foo: { enabled: true } } };

        expect(memoryStore.has("u1")).toBe(false);
        memoryStore.set("u1", pref);
        expect(memoryStore.has("u1")).toBe(true);
        expect(memoryStore.get("u1")).toEqual(pref);

        expect(memoryStore.delete("u1")).toBe(true);
        expect(memoryStore.get("u1")).toBeUndefined();

        memoryStore.set("u2", pref);
        memoryStore.clear();
        expect(memoryStore.has("u2")).toBe(false);
    });
});
