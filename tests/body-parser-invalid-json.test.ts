// tests/body-parser-invalid-json.test.ts
import request from "supertest";
import { describe, it, expect } from "vitest";
import { app } from "../src/server.js";

describe("Invalid JSON body", () => {
    it("returns 400 VALIDATION_ERROR on malformed JSON", async () => {
        const res = await request(app)
            .post("/events")
            .set("content-type", "application/json")
            .send('{"eventId": "x", "userId": "u", "eventType": "e", "timestamp": }'); // bozuk

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");
        expect(res.body.details).toBe("Invalid JSON body");
    });
});
