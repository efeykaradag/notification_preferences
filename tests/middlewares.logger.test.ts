import express from "express";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { logger } from "../src/middlewares/logger.js";

describe("logger middleware", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeAll(() => {
        process.env.NODE_ENV = "development"; // log aktif
    });

    afterAll(() => {
        process.env.NODE_ENV = originalEnv;
    });

    it("logs a JSON line on finish", async () => {
        const app = express();
        app.use(logger);
        app.get("/ping", (_req, res) => res.send("pong"));

        const spy = vi.spyOn(console, "log").mockImplementation(() => {});
        const res = await request(app).get("/ping");

        expect(res.status).toBe(200);
        expect(spy).toHaveBeenCalled();
        // istersen JSON doğrula
        const arg = spy.mock.calls.at(0)?.[0];
        expect(() => JSON.parse(String(arg))).not.toThrow();

        spy.mockRestore();
    });
});
