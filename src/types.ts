/** DND window (UTC, HH:MM) */
export interface DndWindow {
    start: string; // "HH:MM" 00:00–23:59
    end: string;   // "HH:MM" 00:00–23:59
}

export interface EventFlag {
    enabled: boolean;
}

/** Map of eventType -> flag */
export type EventSettings = Record<string, EventFlag>;

/** Stored user preference */
export interface Preference {
    dnd: DndWindow | null;
    eventSettings: EventSettings;
}

/** Request body for POST /preferences/:userId */
export interface PreferenceRequestBody {
    dnd?: DndWindow | null;
    eventSettings: EventSettings;
}

/** Event payload for POST /events */
export interface EventPayload {
    eventId: string;
    userId: string;
    eventType: string;
    /** ISO8601 (UTC, ends with 'Z') */
    timestamp: string;
}

/** Decision response shape */
export type Decision =
    | { decision: "PROCESS_NOTIFICATION" }
    | {
    decision: "DO_NOT_NOTIFY";
    reason: "DND_ACTIVE" | "USER_UNSUBSCRIBED_FROM_EVENT";
};

/** Uniform API error payload */
export interface ApiError {
    error: string;
    code?: string;
    field?: string;
    details?: string;
}
