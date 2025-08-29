// src/constants.ts

/** Typo-safe sabitler (string literal unions) */
export const DECISION = {
    PROCESS_NOTIFICATION: 'PROCESS_NOTIFICATION',
    DO_NOT_NOTIFY: 'DO_NOT_NOTIFY',
} as const;

export const REASON = {
    DND_ACTIVE: 'DND_ACTIVE',
    USER_UNSUBSCRIBED_FROM_EVENT: 'USER_UNSUBSCRIBED_FROM_EVENT',
} as const;

export const ERROR = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_TIMESTAMP: 'INVALID_TIMESTAMP',
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/** Türetilmiş tipler (opsiyonel, autocomplete için kullanışlı) */
export type DecisionValue = (typeof DECISION)[keyof typeof DECISION];
export type ReasonValue   = (typeof REASON)[keyof typeof REASON];
export type ErrorCode     = (typeof ERROR)[keyof typeof ERROR];
