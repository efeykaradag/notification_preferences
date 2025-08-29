// src/routes/preferences.router.ts
import { Router, type Response, type Request } from "express";
import { z } from "zod";

import { memoryStore } from "../store/memory.js";
import { PreferenceBodySchema } from "../schema.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { sendError } from "../utils/responses.js";
import { ERROR } from "../constants.js";
import type { Preference, ApiError, PreferenceRequestBody } from "../types.js";

type TypedRequest<P, ResBody, ReqBody, ReqQuery = Record<string, string | string[]>> =
    Request<P, ResBody, ReqBody, ReqQuery>;

export const preferencesRouter = Router();

// URL param doğrulama (userId zorunlu)
const UserIdParamsSchema = z.object({
    userId: z.string().min(1, "userId is required"),
});

/** GET /preferences/:userId */
preferencesRouter.get(
    "/:userId",
    validateParams(UserIdParamsSchema),
    getPreferencesHandler
);

/** POST /preferences/:userId */
preferencesRouter.post(
    "/:userId",
    validateParams(UserIdParamsSchema),
    validateBody(PreferenceBodySchema),
    upsertPreferencesHandler
);

// ---- Handlers ----

function getPreferencesHandler(
    req: TypedRequest<{ userId: string }, Preference | ApiError, never>,
    res: Response<Preference | ApiError>
) {
    const pref = memoryStore.get(req.params.userId);
    if (!pref) {
        return sendError(res, ERROR.NOT_FOUND, { status: 404 });
    }
    return res.status(200).json(pref);
}

function upsertPreferencesHandler(
    req: TypedRequest<{ userId: string }, { ok: true; userId: string } | ApiError, PreferenceRequestBody>,
    res: Response<{ ok: true; userId: string } | ApiError>
) {
    const { userId } = req.params;
    const body = req.body;

    const pref: Preference = {
        dnd: body.dnd ?? null,
        eventSettings: body.eventSettings,
    };

    memoryStore.set(userId, pref);
    return res.status(200).json({ ok: true, userId });
}
