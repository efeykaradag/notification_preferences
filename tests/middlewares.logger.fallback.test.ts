// tests/middlewares.logger.fallback.test.ts
import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { logger } from "../src/middlewares/logger.js";

describe("logger fallback path", () => {
    const origEnv = process.env.NODE_ENV;
    const origStringify = JSON.stringify;

    beforeAll(() => {
        process.env.NODE_ENV = "development"; // logger aktif
        JSON.stringify = () => { throw new Error("boom"); };
    });

    afterAll(() => {
        process.env.NODE_ENV = origEnv;
        JSON.stringify = origStringify;
    });

    it("falls back to plain log line when stringify fails", async () => {
        const app = express();
        app.use(logger);
        app.get("/ping", (_req, res) => {
            // content-length string branch'ini de çalıştır
            res.setHeader("content-length", "4");
            res.send("pong");
        });

        const spy = vi.spyOn(console, "log").mockImplementation(() => {});
        const res = await request(app).get("/ping");
        expect(res.status).toBe(200);
        expect(spy).toHaveBeenCalled(); // fallback satırı
        spy.mockRestore();
    });
});
