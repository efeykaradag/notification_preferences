import { describe, it, expect } from "vitest";
import { isWithinDnd } from "../src/domain/dnd.js";

const at = (iso: string) => new Date(iso);

describe("DND window", () => {
    it("returns false when dnd is null/undefined", () => {
        expect(isWithinDnd(null, at("2025-01-01T12:00:00Z"))).toBe(false);
        expect(isWithinDnd(undefined, at("2025-01-01T12:00:00Z"))).toBe(false);
    });

    it("same start/end is treated as disabled", () => {
        expect(isWithinDnd({ start: "10:00", end: "10:00" }, at("2025-01-01T10:00:00Z"))).toBe(false);
    });

    it("daytime window 09:00-17:00 includes 12:00, excludes 08:59/17:00", () => {
        const dnd = { start: "09:00", end: "17:00" };
        expect(isWithinDnd(dnd, at("2025-01-01T12:00:00Z"))).toBe(true);
        expect(isWithinDnd(dnd, at("2025-01-01T08:59:00Z"))).toBe(false);
        expect(isWithinDnd(dnd, at("2025-01-01T17:00:00Z"))).toBe(false);
    });

    it("overnight window 22:00-07:00 includes 23:30 and 02:00, excludes 21:00 and 08:00", () => {
        const dnd = { start: "22:00", end: "07:00" };
        expect(isWithinDnd(dnd, at("2025-01-01T23:30:00Z"))).toBe(true);
        expect(isWithinDnd(dnd, at("2025-01-02T02:00:00Z"))).toBe(true);
        expect(isWithinDnd(dnd, at("2025-01-01T21:00:00Z"))).toBe(false);
        expect(isWithinDnd(dnd, at("2025-01-02T08:00:00Z"))).toBe(false);
    });
});
