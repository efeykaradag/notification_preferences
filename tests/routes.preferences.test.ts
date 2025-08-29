import request from "supertest";
import { describe, it, beforeEach, expect } from "vitest";
import { app } from "../src/server";
import { memoryStore } from "../src/store/memory";

describe("Preferences routes", () => {
    beforeEach(() => {
        memoryStore.clear();
    });

    it("GET /preferences/:userId -> 404 when not found", async () => {
        const res = await request(app).get("/preferences/unknown");
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "NOT_FOUND" });
    });

    it("POST /preferences/:userId -> 200 stores preference", async () => {
        const res = await request(app)
            .post("/preferences/usr_1")
            .send({
                dnd: { start: "22:00", end: "07:00" },
                eventSettings: { item_shipped: { enabled: true }, invoice_generated: { enabled: true } },
            });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true, userId: "usr_1" });

        const getRes = await request(app).get("/preferences/usr_1");
        expect(getRes.status).toBe(200);
        expect(getRes.body).toMatchObject({
            dnd: { start: "22:00", end: "07:00" },
            eventSettings: { item_shipped: { enabled: true }, invoice_generated: { enabled: true } },
        });
    });

    it("POST /preferences/:userId -> 400 on validation error", async () => {
        const res = await request(app)
            .post("/preferences/usr_1")
            .send({ dnd: { start: "25:00", end: "07:00" }, eventSettings: { abc: { enabled: true } } }); // invalid HH:MM
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");
    });
});
