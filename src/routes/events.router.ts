// src/routes/events.router.ts
import { Router, type Response, type Request } from "express";
import { memoryStore } from "../store/memory.js";
import { isWithinDnd } from "../domain/dnd.js";
import { EventPayloadSchema, type EventPayload } from "../schema.js";
import { validateBody } from "../middlewares/validate.js";
import { sendDecision, sendError } from "../utils/responses.js";
import { DECISION, REASON, ERROR } from "../constants.js";
import type { Decision, ApiError } from "../types.js";

type TypedRequest<P, ResBody, ReqBody, ReqQuery = Record<string, string | string[]>> =
    Request<P, ResBody, ReqBody, ReqQuery>;

export const eventsRouter = Router();

/**
 * POST /events
 * - Pref yoksa: 202 PROCESS_NOTIFICATION (fail-open)
 * - Event unsubscribed: 200 DO_NOT_NOTIFY(USER_UNSUBSCRIBED_FROM_EVENT)
 * - DND aktifte: 200 DO_NOT_NOTIFY(DND_ACTIVE)
 */
eventsRouter.post("/", validateBody(EventPayloadSchema), postEventHandler);

function postEventHandler(
    req: TypedRequest<Record<string, string>, Decision | ApiError, EventPayload>,
    res: Response<Decision | ApiError>
) {
    const { userId, eventType, timestamp } = req.body;

    // ISO biçimli olsa da Date parse edilemiyorsa
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return sendError(res, ERROR.INVALID_TIMESTAMP, {
            field: "timestamp",
            details: "Unparsable date",
            status: 400,
        });
    }

    // Preferences lookup — fail-open
    const pref = memoryStore.get(userId);
    if (!pref) {
        return sendDecision(res, { decision: DECISION.PROCESS_NOTIFICATION }, 202);
    }

    // 1) Kullanıcı bu event'ten çıkmış mı?
    const flag = pref.eventSettings[eventType]; // eventType zaten branded
    if (flag && !flag.enabled) {
        return sendDecision(res, {
            decision: DECISION.DO_NOT_NOTIFY,
            reason: REASON.USER_UNSUBSCRIBED_FROM_EVENT,
        });
    }

    // 2) DND aktif mi?
    if (pref.dnd && isWithinDnd(pref.dnd, date)) {
        return sendDecision(res, {
            decision: DECISION.DO_NOT_NOTIFY,
            reason: REASON.DND_ACTIVE,
        });
    }

    // 3) İzin ver
    return sendDecision(res, { decision: DECISION.PROCESS_NOTIFICATION }, 202);
}
