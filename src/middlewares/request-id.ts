// src/middlewares/request-id.ts
import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

export const requestId: RequestHandler = (req, res, next) => {
    const incoming =
        (req.header("x-request-id") || req.header("x-correlation-id") || "").trim();
    const id = incoming || randomUUID();

    res.setHeader("x-request-id", id);
    res.locals.requestId = id;

    next();
};