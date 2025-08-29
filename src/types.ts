// src/types.ts

/**
 * Do Not Disturb window (UTC, HH:MM)
 */
export interface DndWindow {
    /** "HH:MM" 00:00–23:59 (UTC) */
    start: string;
    /** "HH:MM" 00:00–23:59 (UTC) */
    end: string;
}

/** Per-event flag */
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
    /** ISO8601 (UTC, must end with 'Z') */
    timestamp: string;
}

/** Decision response shape */
export type Decision =
    | { decision: "PROCESS_NOTIFICATION" }
    | {
    decision: "DO_NOT_NOTIFY";
    reason: "DND_ACTIVE" | "USER_UNSUBSCRIBED_FROM_EVENT";
};

/**
 * Uniform API error payload.
 * `error` is the broad category; `code` is an optional, more specific sub-code.
 */
export interface ApiError {
    error: string;           // e.g. "VALIDATION_ERROR", "INVALID_TIMESTAMP", "NOT_FOUND"
    code?: string;           // e.g. "INVALID_TYPE", "INVALID_FORMAT", "MISSING_FIELD", "EXTRA_PROPERTY"
    field?: string;          // e.g. "timestamp", "eventSettings", "dnd.start"
    details?: string;        // human-friendly explanation
}
