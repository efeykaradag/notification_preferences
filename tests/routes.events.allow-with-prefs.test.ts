import request from "supertest";
import { describe, it, beforeEach, expect } from "vitest";
import { app } from "../src/server.js";
import { memoryStore } from "../src/store/memory.js";

describe("Events allow path with prefs", () => {
    beforeEach(() => memoryStore.clear());

    it("returns 202 when enabled=true and DND inactive", async () => {
        // upsert prefs
        await request(app).post("/preferences/u_ok").send({
            dnd: null,
            eventSettings: { item_shipped: { enabled: true } },
        });

        const res = await request(app).post("/events").send({
            eventId: "evt_ok",
            userId: "u_ok",
            eventType: "item_shipped",
            timestamp: "2025-07-28T12:00:00Z", // DND yok → allow
        });

        expect(res.status).toBe(202);
        expect(res.body).toEqual({ decision: "PROCESS_NOTIFICATION" });
    });
});
