import { describe, it, expect } from "vitest";
import {
    PreferenceBodySchema,
    EventPayloadSchema,
    EventSettingsSchema,
} from "../src/schema";

describe("Schema validation", () => {
    it("PreferenceBodySchema: accepts valid object", () => {
        const data = {
            dnd: { start: "22:00", end: "07:00" },
            eventSettings: { item_shipped: { enabled: true }, invoice_generated: { enabled: false } },
        };
        const r = PreferenceBodySchema.safeParse(data);
        expect(r.success).toBe(true);
    });

    it("PreferenceBodySchema: rejects empty eventSettings", () => {
        const r = PreferenceBodySchema.safeParse({ dnd: null, eventSettings: {} });
        expect(r.success).toBe(false);
    });

    it("EventSettingsSchema: rejects invalid keys", () => {
        const r = EventSettingsSchema.safeParse({ "bad key": { enabled: true } } as any);
        expect(r.success).toBe(false);
    });

    it("EventPayloadSchema: accepts valid payload", () => {
        const r = EventPayloadSchema.safeParse({
            eventId: "evt_1",
            userId: "usr_1",
            eventType: "item_shipped",
            timestamp: "2025-07-28T23:00:00Z",
        });
        expect(r.success).toBe(true);
    });

    it("EventPayloadSchema: rejects invalid timestamp", () => {
        const r = EventPayloadSchema.safeParse({
            eventId: "evt_1",
            userId: "usr_1",
            eventType: "item_shipped",
            timestamp: "not-a-date",
        });
        expect(r.success).toBe(false);
    });
});
