// tests/dnd.negatives.test.ts
import { describe, it, expect } from "vitest";
import { timeToMinutes, isWithinDnd } from "../src/domain/dnd.js";

describe("DND negatives", () => {
    it("timeToMinutes throws on invalid HH:MM", () => {
        expect(() => timeToMinutes("25:61")).toThrow(/INVALID_HHMM/);
        expect(() => timeToMinutes("aa:bb")).toThrow(/INVALID_HHMM/);
    });

    it("isWithinDnd returns false when DND values are invalid", () => {
        expect(isWithinDnd({ start: "99:99", end: "07:00" }, new Date("2025-01-01T00:00:00Z"))).toBe(false);
    });
});
