import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { sendError, sendDecision } from "../src/utils/responses.js";

describe("responses helpers", () => {
    it("sendError without optional fields", async () => {
        const app = express();
        app.get("/e1", (_req, res) => sendError(res, "VALIDATION_ERROR"));

        const res = await request(app).get("/e1");
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "VALIDATION_ERROR" });
    });

    it("sendError with field/details and custom status", async () => {
        const app = express();
        app.get("/e2", (_req, res) => sendError(res, "INVALID_TIMESTAMP", {
            field: "timestamp",
            details: "bad",
            status: 422
        }));

        const res = await request(app).get("/e2");
        expect(res.status).toBe(422);
        expect(res.body).toEqual({ error: "INVALID_TIMESTAMP", field: "timestamp", details: "bad" });
    });

    it("sendDecision 202", async () => {
        const app = express();
        app.get("/d", (_req, res) => sendDecision(res, { decision: "PROCESS_NOTIFICATION" }, 202));

        const res = await request(app).get("/d");
        expect(res.status).toBe(202);
        expect(res.body).toEqual({ decision: "PROCESS_NOTIFICATION" });
    });
});
