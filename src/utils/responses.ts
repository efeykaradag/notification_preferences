// src/utils/responses.ts
import type { Response } from "express";
import type { ApiError, Decision } from "../types.js";

/**
 * Hata yanıtını tek tip JSON formatında gönderir.
 * Optional alanlar (field/details) yalnızca değer varsa eklenir.
 */
export function sendError(
    res: Response<ApiError>,
    error: ApiError["error"],
    opts?: { field?: string; details?: string; status?: number; code?: ApiError["code"] }
) {
    const { field, details, status = 400, code } = opts ?? {};

    const payload: ApiError = {
        error,
        ...(code ? { code } : {}),
        ...(field ? { field } : {}),
        ...(details ? { details } : {}),
    };

    return res.status(status).json(payload);
}

/**
 * Karar yanıtlarını (200/202) göndermek için yardımcı.
 */
export function sendDecision(
    res: Response<Decision>,
    decision: Decision,
    status: 200 | 202 = 200
) {
    return res.status(status).json(decision);
}
