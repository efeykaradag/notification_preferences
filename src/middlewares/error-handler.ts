import type { RequestHandler, ErrorRequestHandler } from "express";
import type { ApiError } from "../types.js";

export const notFound: RequestHandler = (_req, res) => {
    return res.status(404).json({ error: "NOT_FOUND" } satisfies ApiError);
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);

    // Body parser JSON hatası → tek tip 400 VALIDATION_ERROR
    if ((err as any)?.type === "entity.parse.failed") {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            details: "Invalid JSON body",
        } satisfies ApiError);
    }

    const status =
        (err as any)?.statusCode ??
        (err as any)?.status; // Express bazı hatalarda `status` kullanır

    if (typeof status === "number" && (err as any)?.message) {
        return res.status(status).json({
            error: (err as any).code ?? "ERROR",
            details: (err as any).message,
        } satisfies ApiError);
    }

    return res.status(500).json({
        error: "INTERNAL_ERROR",
        details: "Unexpected server error",
    } satisfies ApiError);
};
