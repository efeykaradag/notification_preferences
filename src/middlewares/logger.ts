
// src/middlewares/logger.ts
import type { RequestHandler } from "express";

/**
 * HTTP logger (basit, bağımsız)
 * - Test ortamında log yazmaz.
 * - Yanıt tamamlandığında tek satır JSON log üretir.
 */
export const logger: RequestHandler = (req, res, next) => {
    if (process.env.NODE_ENV === "test") return next();

    const started = process.hrtime.bigint();
    const { method, originalUrl } = req;
    const requestId = (res.locals.requestId as string | undefined) ?? "-";

    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
        const contentLengthHeader = res.getHeader("content-length");
        const contentLength =
            typeof contentLengthHeader === "string"
                ? Number(contentLengthHeader)
                : (contentLengthHeader as number | undefined) ?? 0;

        const log = {
            level: "info",
            msg: "http_request",
            requestId,
            method,
            url: originalUrl,
            status: res.statusCode,
            durationMs: Number(durationMs.toFixed(1)),
            contentLength,
        };

        try {
            console.log(JSON.stringify(log));
        } catch {
            // JSON stringify sıkıntı çıkarırsa fallback tek satır
            console.log(`${method} ${originalUrl} -> ${res.statusCode} ${durationMs.toFixed(1)}ms`);
        }
    });

    next();
};
