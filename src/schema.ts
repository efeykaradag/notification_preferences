import { z } from "zod";

export const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // 00:00–23:59
export const EVENT_KEY_RX = /^[a-zA-Z0-9_.]+$/;
export const ISO_UTC_RX = /^[0-9]{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export const HhmmStringSchema = z
    .string()
    .regex(HHMM_REGEX, "must match HH:MM (00–23:59)")
    .brand<"HHMM">()
    .describe("UTC time in HH:MM");
export type HhmmString = z.infer<typeof HhmmStringSchema>;

export const IsoUtcStringSchema = z
    .string()
    .regex(ISO_UTC_RX, "must be ISO8601 UTC like 2025-07-28T23:00:00Z")
    .brand<"ISO8601_UTC">()
    .describe("ISO8601 UTC timestamp (ends with 'Z')");
export type IsoUtcString = z.infer<typeof IsoUtcStringSchema>;

export const EventTypeKeySchema = z
    .string()
    .regex(EVENT_KEY_RX, "invalid event key")
    .brand<"EventTypeKey">();
export type EventTypeKey = z.infer<typeof EventTypeKeySchema>;

export const DndSchema = z
    .object({
        start: HhmmStringSchema,
        end: HhmmStringSchema,
    })
    .strict()
    .refine((v) => v.start !== v.end, {
        message: "start and end cannot be equal",
        path: ["end"],
    })
    .describe("Do Not Disturb window in UTC, HH:MM");
export type Dnd = z.infer<typeof DndSchema>;

export const EventFlagSchema = z.object({ enabled: z.boolean() }).strict();
export type EventFlag = z.infer<typeof EventFlagSchema>;

export const EventSettingsSchema = z
    .record(EventTypeKeySchema, EventFlagSchema)
    .superRefine((obj, ctx) => {
        if (Object.keys(obj).length === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "cannot be empty" });
        }
    });
export type EventSettings = z.infer<typeof EventSettingsSchema>;

export const PreferenceBodySchema = z
    .object({
        dnd: DndSchema.nullable().optional(),
        eventSettings: EventSettingsSchema,
    })
    .strict();
export type PreferenceBody = z.infer<typeof PreferenceBodySchema>;
export type PreferenceRequestBody = PreferenceBody;

export const EventPayloadSchema = z
    .object({
        eventId: z.string().trim().min(1, "eventId is required"),
        userId: z.string().trim().min(1, "userId is required"),
        eventType: z.string().trim().pipe(EventTypeKeySchema),
        timestamp: IsoUtcStringSchema,
    })
    .strict();
export type EventPayload = z.infer<typeof EventPayloadSchema>;
