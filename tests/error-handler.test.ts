import request from "supertest";
import { describe, it, expect } from "vitest";
import express from "express";
import { notFound, errorHandler } from "../src/middlewares/error-handler.js";

describe("Global error & 404 handlers", () => {
    it("notFound returns 404 ApiError", async () => {
        const app = express();
        app.use(notFound);
        app.use(errorHandler);
        const res = await request(app).get("/nope");
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "NOT_FOUND" });
    });

    it("errorHandler returns 500 ApiError by default", async () => {
        const app = express();
        app.get("/boom", (_req, _res, next) => next(new Error("boom")));
        app.use(errorHandler);
        const res = await request(app).get("/boom");
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("INTERNAL_ERROR");
    });

    it("errorHandler respects custom statusCode/code", async () => {
        const app = express();
        app.get("/custom", (_req, _res, next) => {
            next({ statusCode: 418, code: "I_AM_A_TEAPOT", message: "short & stout" });
        });
        app.use(errorHandler);
        const res = await request(app).get("/custom");
        expect(res.status).toBe(418);
        expect(res.body).toEqual({ error: "I_AM_A_TEAPOT", details: "short & stout" });
    });
});
