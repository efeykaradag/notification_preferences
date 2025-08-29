import { describe, it, expect } from "vitest";
import { isWithinDnd } from "../src/domain/dnd.js";

describe("DND edge cases", () => {
    it("start === end → inactive (false)", () => {
        const event = new Date("2025-07-28T12:00:00Z");
        const res = isWithinDnd({ start: "10:00", end: "10:00" }, event);
        expect(res).toBe(false);
    });

    it("invalid HH:MM → inactive (false) [bad start]", () => {
        const event = new Date("2025-07-28T12:00:00Z");
        const res = isWithinDnd({ start: "7:00", end: "08:00" }, event);
        expect(res).toBe(false);
    });

    it("invalid HH:MM → inactive (false) [bad end]", () => {
        const event = new Date("2025-07-28T12:00:00Z");
        const res = isWithinDnd({ start: "07:00", end: "24:00" }, event);
        expect(res).toBe(false);
    });

    it("overnight window: start-inclusive", () => {
        const at2200 = new Date("2025-07-28T22:00:00Z");
        const res = isWithinDnd({ start: "22:00", end: "07:00" }, at2200);
        expect(res).toBe(true);
    });

    it("overnight window: end-exclusive", () => {
        const at0700 = new Date("2025-07-29T07:00:00Z");
        const res = isWithinDnd({ start: "22:00", end: "07:00" }, at0700);
        expect(res).toBe(false);
    });
});
