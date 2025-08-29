import type { RequestHandler } from "express";
import type { ZodSchema, ZodError, ZodIssue } from "zod";
import type { ApiError } from "../types.js";

/** field/details’i sadece tanımlıysa ekle (exactOptionalPropertyTypes uyumlu) */
function optField(field?: string) {
    return field ? { field } : {};
}
function optDetails(details?: string) {
    return details && details.length > 0 ? { details } : {};
}

/** Zod issue → { code, field?, details? } (basit ve sağlam) */
function mapIssue(issue: ZodIssue): Pick<ApiError, "code" | "field" | "details"> {
    const field = issue.path && issue.path.length ? issue.path.join(".") : undefined;

    switch (issue.code) {
        case "invalid_type":
            // Mesaj Zod tarafından sağlanıyorsa onu kullan; yoksa özet bir açıklama
            return {
                code: "INVALID_TYPE",
                ...optField(field),
                ...optDetails(issue.message || "Invalid type"),
            };

        case "unrecognized_keys":
            return {
                code: "EXTRA_PROPERTY",
                ...optField(field),
                ...optDetails(issue.message || "Unrecognized key(s)"),
            };

        case "too_small":
        case "too_big":
            return {
                code: "OUT_OF_RANGE",
                ...optField(field),
                ...optDetails(issue.message || "Value out of allowed range"),
            };


        default:
            // Diğer tüm varyantlar (ör. string/format/date/custom vs.)
            return {
                code: "INVALID_VALUE",
                ...optField(field),
                ...optDetails(issue.message || "Validation error"),
            };
    }
}

/** Body validator: başarılıysa parse edilmiş T’yi req.body’ye yazar. */
export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            const err: ZodError = parsed.error;
            const issue = err.issues[0];
            const payload: ApiError = {
                error: "VALIDATION_ERROR",
                ...(issue ? mapIssue(issue) : {}),
            };
            return res.status(400).json(payload);
        }
        (req as unknown as { body: T }).body = parsed.data;
        next();
    };
}

/** Query validator: başarılıysa parse edilen T’yi req.query’e yazar. */
export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.query);
        if (!parsed.success) {
            const err: ZodError = parsed.error;
            const issue = err.issues[0];
            const payload: ApiError = {
                error: "VALIDATION_ERROR",
                ...(issue ? mapIssue(issue) : {}),
            };
            return res.status(400).json(payload);
        }
        (req as unknown as { query: T }).query = parsed.data;
        next();
    };
}

/** Params validator: başarılıysa parse edilen T’yi req.params’a yazar. */
export function validateParams<T>(schema: ZodSchema<T>): RequestHandler {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.params);
        if (!parsed.success) {
            const err: ZodError = parsed.error;
            const issue = err.issues[0];
            const payload: ApiError = {
                error: "VALIDATION_ERROR",
                ...(issue ? mapIssue(issue) : {}),
            };
            return res.status(400).json(payload);
        }
        (req as unknown as { params: T }).params = parsed.data;
        next();
    };
}
