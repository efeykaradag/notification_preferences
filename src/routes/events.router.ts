import { Router, type Response, type Request } from "express";
import { memoryStore } from "../store/memory.js";
import { isWithinDnd } from "../domain/dnd.js";
import { EventPayloadSchema, type EventPayload } from "../schema.js";
import { validateBody } from "../middlewares/validate.js";
import { sendDecision, sendError } from "../utils/responses.js";
import { DECISION, REASON, ERROR } from "../constants.js";
import type { Decision, ApiError } from "../types.js";

type TypedRequest<TRes, TBody> = Request<{}, TRes, TBody>;

export const eventsRouter = Router();

eventsRouter.post("/", validateBody(EventPayloadSchema), postEventHandler);

function postEventHandler(
    req: TypedRequest<Decision | ApiError, EventPayload>,
    res: Response
) {
    const { userId, eventType, timestamp } = req.body;

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return sendError(res, ERROR.INVALID_TIMESTAMP, {
            field: "timestamp",
            details: "Unparsable date",
            status: 400,
            code: "INVALID_FORMAT",
        });
    }

    const pref = memoryStore.get(userId);
    if (!pref) {
        return sendDecision(res, { decision: DECISION.PROCESS_NOTIFICATION }, 202);
    }

    const flag = pref.eventSettings[eventType];
    if (flag && !flag.enabled) {
        return sendDecision(res, {
            decision: DECISION.DO_NOT_NOTIFY,
            reason: REASON.USER_UNSUBSCRIBED_FROM_EVENT,
        });
    }

    if (pref.dnd && isWithinDnd(pref.dnd, date)) {
        return sendDecision(res, {
            decision: DECISION.DO_NOT_NOTIFY,
            reason: REASON.DND_ACTIVE,
        });
    }

    return sendDecision(res, { decision: DECISION.PROCESS_NOTIFICATION }, 202);
}
