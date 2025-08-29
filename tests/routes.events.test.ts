import request from "supertest";
import { describe, it, beforeEach, expect } from "vitest";
import { app } from "../src/server";
import { memoryStore } from "../src/store/memory";

describe("Events route decision flow", () => {
    beforeEach(() => {
        memoryStore.clear();
    });

    it("returns 202 PROCESS_NOTIFICATION when user has no preferences (fail-open)", async () => {
        const res = await request(app)
            .post("/events")
            .send({
                eventId: "evt_1",
                userId: "usr_no_pref",
                eventType: "item_shipped",
                timestamp: "2025-07-28T12:00:00Z",
            });
        expect(res.status).toBe(202);
        expect(res.body).toEqual({ decision: "PROCESS_NOTIFICATION" });
    });

    it("returns DO_NOT_NOTIFY when user unsubscribed from event", async () => {
        // set preferences
        await request(app)
            .post("/preferences/usr_1")
            .send({
                dnd: null,
                eventSettings: { item_shipped: { enabled: false } },
            });

        const res = await request(app)
            .post("/events")
            .send({
                eventId: "evt_2",
                userId: "usr_1",
                eventType: "item_shipped",
                timestamp: "2025-07-28T12:00:00Z",
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            decision: "DO_NOT_NOTIFY",
            reason: "USER_UNSUBSCRIBED_FROM_EVENT",
        });
    });

    it("returns DO_NOT_NOTIFY when DND is active", async () => {
        await request(app)
            .post("/preferences/usr_2")
            .send({
                dnd: { start: "22:00", end: "07:00" },
                eventSettings: { item_shipped: { enabled: true } },
            });

        const res = await request(app)
            .post("/events")
            .send({
                eventId: "evt_3",
                userId: "usr_2",
                eventType: "item_shipped",
                timestamp: "2025-07-28T23:30:00Z", // within DND
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ decision: "DO_NOT_NOTIFY", reason: "DND_ACTIVE" });
    });

    it("returns 400 on unparsable timestamp", async () => {
        const res = await request(app)
            .post("/events")
            .send({
                eventId: "evt_bad",
                userId: "usr_3",
                eventType: "item_shipped",
                timestamp: "2025-13-40T25:61:00Z",
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("INVALID_TIMESTAMP");
    });
    it("returns 400 VALIDATION_ERROR on schema/regex failure", async () => {
        const res = await request(app)
            .post("/events")
            .send({
                eventId: "evt_bad_fmt",
                userId: "usr_3",
                eventType: "item_shipped",
                timestamp: "not-a-date"
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");
        expect(res.body).toEqual(expect.objectContaining({ field: "timestamp" }));
    });

});
