// src/scripts/seed.ts
import { z } from "zod";

/** ==== Config ==== */
const BASE = process.env.SEED_BASE_URL ?? "http://localhost:3000";

/** ==== Common response schemas (JSON format control) ==== */
const DecisionSchema = z.union([
    z.object({ decision: z.literal("PROCESS_NOTIFICATION") }).strict(),
    z
        .object({
            decision: z.literal("DO_NOT_NOTIFY"),
            reason: z.enum(["DND_ACTIVE", "USER_UNSUBSCRIBED_FROM_EVENT"]),
        })
        .strict(),
]);

const ApiErrorSchema = z
    .object({
        error: z.string(),
        field: z.string().optional(),
        details: z.string().optional(),
    })
    .strict();

type Decision = z.infer<typeof DecisionSchema>;
type ApiError = z.infer<typeof ApiErrorSchema>;

/** For GET /preferences response validation (strict JSON shape) */
const HhmmRx = /^([01]\d|2[0-3]):[0-5]\d$/;
const EventKey = /^[a-zA-Z0-9_.]+$/;

const DndSchema = z
    .object({
        start: z.string().regex(HhmmRx),
        end: z.string().regex(HhmmRx),
    })
    .strict();

const EventFlagSchema = z.object({ enabled: z.boolean() }).strict();
const EventSettingsSchema = z.record(z.string().regex(EventKey), EventFlagSchema);

const PreferenceSchema = z
    .object({
        dnd: z.union([DndSchema, z.null()]),
        eventSettings: EventSettingsSchema,
    })
    .strict();

const HealthSchema = z.object({ ok: z.boolean() }).strict();

/** ==== Tiny fetch helper that accepts JSON bodies ==== */
type JsonInit = {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown; // JSON objesi geç; içeride stringify ediyoruz
    okStatus?: number | number[]; // beklenen başarı kodları (default [200, 202])
};

async function j<T = unknown>(
    path: string,
    init: JsonInit = {},
): Promise<{ status: number; json: T | ApiError }> {
    const { okStatus, body, headers, method } = init;

    const okList = okStatus
        ? Array.isArray(okStatus)
            ? okStatus
            : [okStatus]
        : [200, 202];

    const initFetch: RequestInit = {
        method: method ?? "GET",
        headers: { "content-type": "application/json", ...(headers ?? {}) },
        // exactOptionalPropertyTypes: body yoksa property hiç eklenmesin
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };

    const res = await fetch(`${BASE}${path}`, initFetch);
    const data = (await res.json().catch(() => ({}))) as unknown;

    // Yanıt JSON formatını doğrula (status'e göre Decision veya ApiError)
    if (okList.includes(res.status)) {
        const p = DecisionSchema.safeParse(data);
        return { status: res.status, json: (p.success ? p.data : (data as any)) as any };
    } else {
        const p = ApiErrorSchema.safeParse(data);
        return { status: res.status, json: (p.success ? p.data : (data as any)) as any };
    }
}

/** ==== Assert helpers ==== */
function isApiError(v: unknown): v is ApiError {
    return !!v && typeof v === "object" && typeof (v as any).error === "string";
}
function isDecision(v: unknown): v is Decision {
    return !!v && typeof v === "object" && typeof (v as any).decision === "string";
}
function expect(cond: boolean, msg: string) {
    if (!cond) throw new Error(msg);
}
function includes(hay: string | undefined, needle: string) {
    return typeof hay === "string" && hay.includes(needle);
}
/** details varsa regex ile gevşek doğrula; yoksa geç */
function matches(opt: string | undefined, re: RegExp): boolean {
    return typeof opt === "string" ? re.test(opt) : true;
}

/** Pretty printing */
const ok = (msg: string) => console.log("✓", msg);
const failLog = (msg: string) => console.error("𐄂", msg);

/** Result summary */
let passed = 0;
let failed = 0;
async function CASE(name: string, fn: () => Promise<void>) {
    try {
        await fn();
        passed++;
        ok(name);
    } catch (e: any) {
        failed++;
        failLog(`${name} → ${e?.message ?? e}`);
    }
}

/** ==== Main seed flow ==== */
async function main() {
    console.log(`→ Seeding against ${BASE}`);

    // --- Health ---
    await CASE("GET /health", async () => {
        const r = await fetch(`${BASE}/health`);
        const raw = (await r.json().catch(() => ({}))) as unknown;
        const parsed = HealthSchema.safeParse(raw);
        expect(r.ok && parsed.success && parsed.data.ok === true, "health payload mismatch");
    });

    // --- Preferences: positive seeds ---
    await CASE("POST /preferences/usr_1 (unsubscribe item_shipped)", async () => {
        const r = await j<{ ok: true; userId: string } | ApiError>(`/preferences/usr_1`, {
            method: "POST",
            body: { dnd: null, eventSettings: { item_shipped: { enabled: false } } },
            okStatus: 200,
        });
        expect(r.status === 200, "status != 200");
        expect(!isApiError(r.json), "unexpected ApiError");
    });

    await CASE("POST /preferences/usr_2 (DND 22:00–07:00)", async () => {
        const r = await j<{ ok: true; userId: string } | ApiError>(`/preferences/usr_2`, {
            method: "POST",
            body: {
                dnd: { start: "22:00", end: "07:00" },
                eventSettings: { item_shipped: { enabled: true } },
            },
            okStatus: 200,
        });
        expect(r.status === 200, "status != 200");
        expect(!isApiError(r.json), "unexpected ApiError");
    });

    await CASE("POST /preferences/usr_3 (allow path)", async () => {
        const r = await j<{ ok: true; userId: string } | ApiError>(`/preferences/usr_3`, {
            method: "POST",
            body: { dnd: null, eventSettings: { item_shipped: { enabled: true } } },
            okStatus: 200,
        });
        expect(r.status === 200, "status != 200");
        expect(!isApiError(r.json), "unexpected ApiError");
    });

    // --- Preferences: read-back & schema check ---
    await CASE("GET /preferences/usr_2 (validate JSON schema)", async () => {
        const res = await fetch(`${BASE}/preferences/usr_2`);
        expect(res.status === 200, "status != 200");
        const raw = (await res.json().catch(() => ({}))) as unknown;
        const parsed = PreferenceSchema.safeParse(raw);
        expect(parsed.success, "preference shape invalid");
        // boundary sanity checks
        const dnd = parsed.success ? parsed.data.dnd : null;
        expect(!!dnd && dnd.start === "22:00", "dnd.start mismatch");
    });

    // --- Events: decisions (+ parse failure) ---
    await CASE("POST /events no prefs → 202 PROCESS_NOTIFICATION", async () => {
        const r = await j<Decision | ApiError>(`/events`, {
            method: "POST",
            body: {
                eventId: "evt_0",
                userId: "usr_no_pref",
                eventType: "item_shipped",
                timestamp: "2025-07-28T12:00:00Z",
            },
            okStatus: [200, 202],
        });
        expect(r.status === 202, "status != 202");
        expect(isDecision(r.json) && r.json.decision === "PROCESS_NOTIFICATION", "decision mismatch");
    });

    await CASE(
        "POST /events usr_1 unsubscribed → 200 DO_NOT_NOTIFY(USER_UNSUBSCRIBED_FROM_EVENT)",
        async () => {
            const r = await j<Decision | ApiError>(`/events`, {
                method: "POST",
                body: {
                    eventId: "evt_1",
                    userId: "usr_1",
                    eventType: "item_shipped",
                    timestamp: "2025-07-28T12:00:00Z",
                },
                okStatus: [200, 202],
            });
            expect(r.status === 200, "status != 200");
            expect(
                isDecision(r.json) &&
                r.json.decision === "DO_NOT_NOTIFY" &&
                (r.json as any).reason === "USER_UNSUBSCRIBED_FROM_EVENT",
                "reason mismatch",
            );
        },
    );

    await CASE("POST /events usr_2 within DND → 200 DO_NOT_NOTIFY(DND_ACTIVE)", async () => {
        const r = await j<Decision | ApiError>(`/events`, {
            method: "POST",
            body: {
                eventId: "evt_2",
                userId: "usr_2",
                eventType: "item_shipped",
                timestamp: "2025-07-28T23:30:00Z",
            },
            okStatus: [200, 202],
        });
        expect(r.status === 200, "status != 200");
        expect(
            isDecision(r.json) &&
            r.json.decision === "DO_NOT_NOTIFY" &&
            (r.json as any).reason === "DND_ACTIVE",
            "reason mismatch",
        );
    });

    await CASE("POST /events usr_2 boundary @07:00 → 202 allow (end-exclusive)", async () => {
        const r = await j<Decision | ApiError>(`/events`, {
            method: "POST",
            body: {
                eventId: "evt_2b",
                userId: "usr_2",
                eventType: "item_shipped",
                timestamp: "2025-07-29T07:00:00Z",
            },
            okStatus: [200, 202],
        });
        expect(r.status === 202, "status != 202"); // 07:00 end-exclusive → allow
    });

    await CASE("POST /events usr_2 boundary @22:00 → 200 block (start-inclusive)", async () => {
        const r = await j<Decision | ApiError>(`/events`, {
            method: "POST",
            body: {
                eventId: "evt_2c",
                userId: "usr_2",
                eventType: "item_shipped",
                timestamp: "2025-07-28T22:00:00Z",
            },
            okStatus: [200, 202],
        });
        expect(r.status === 200, "status != 200"); // 22:00 start-inclusive → block
    });

    await CASE("POST /events usr_3 allow path → 202 PROCESS_NOTIFICATION", async () => {
        const r = await j<Decision | ApiError>(`/events`, {
            method: "POST",
            body: {
                eventId: "evt_3",
                userId: "usr_3",
                eventType: "item_shipped",
                timestamp: "2025-07-28T12:00:00Z",
            },
            okStatus: [200, 202],
        });
        expect(r.status === 202, "status != 202");
    });

    await CASE(
        "POST /events parse fail (format ok, tarih geçersiz) → 400 INVALID_TIMESTAMP",
        async () => {
            const r = await j<ApiError>(`/events`, {
                method: "POST",
                body: {
                    eventId: "evt_bad_parse",
                    userId: "usr_3",
                    eventType: "item_shipped",
                    timestamp: "2025-13-40T25:61:00Z",
                },
                okStatus: [200, 202],
            });
            expect(r.status === 400, "status != 400");
            expect(isApiError(r.json) && r.json.error === "INVALID_TIMESTAMP", "error code mismatch");
        },
    );

    // --- Events: validation (schema/regex) failures ---
    await CASE("POST /events missing userId → 400 VALIDATION_ERROR", async () => {
        const r = await j<ApiError>(`/events`, {
            method: "POST",
            body: { eventId: "evt_miss", eventType: "item_shipped", timestamp: "2025-07-28T12:00:00Z" },
            okStatus: [200, 202],
        });
        expect(r.status === 400, "status != 400");
        expect(isApiError(r.json) && r.json.error === "VALIDATION_ERROR", "error code mismatch");
        expect(isApiError(r.json) && r.json.field === "userId", "field mismatch");
    });

    await CASE("POST /events invalid eventType key → 400 VALIDATION_ERROR", async () => {
        const r = await j<ApiError>(`/events`, {
            method: "POST",
            body: {
                eventId: "evt_bad_ev",
                userId: "usr_3",
                eventType: "item-shipped",
                timestamp: "2025-07-28T12:00:00Z",
            },
            okStatus: [200, 202],
        });
        expect(r.status === 400, "status != 400");
        expect(isApiError(r.json) && r.json.error === "VALIDATION_ERROR", "error code mismatch");
        // details farklı mesajlar dönebilir; varsa 'invalid' kelimesini arıyoruz
        const details = isApiError(r.json) ? r.json.details : undefined;
        expect(matches(details, /invalid/i), "details mismatch");
    });

    await CASE("POST /events invalid timestamp format → 400 VALIDATION_ERROR", async () => {
        const r = await j<ApiError>(`/events`, {
            method: "POST",
            body: {
                eventId: "evt_bad_fmt",
                userId: "usr_3",
                eventType: "item_shipped",
                timestamp: "not-a-date",
            },
            okStatus: [200, 202],
        });
        expect(r.status === 400, "status != 400");
        expect(isApiError(r.json) && r.json.error === "VALIDATION_ERROR", "error code mismatch");
        expect(isApiError(r.json) && r.json.field === "timestamp", "field mismatch");
    });

    await CASE("POST /events lowercase 'z' → 400 VALIDATION_ERROR", async () => {
        const r = await j<ApiError>(`/events`, {
            method: "POST",
            body: {
                eventId: "evt_bad_z",
                userId: "usr_3",
                eventType: "item_shipped",
                timestamp: "2025-07-28T12:00:00z",
            },
            okStatus: [200, 202],
        });
        expect(r.status === 400, "status != 400");
        expect(isApiError(r.json) && r.json.error === "VALIDATION_ERROR", "error code mismatch");
    });

    await CASE("POST /events extra property (strict) → 400 VALIDATION_ERROR", async () => {
        const r = await j<ApiError>(`/events`, {
            method: "POST",
            body: {
                eventId: "evt_x",
                userId: "usr_3",
                eventType: "item_shipped",
                timestamp: "2025-07-28T12:00:00Z",
                extra: 1,
            },
            okStatus: [200, 202],
        });
        expect(r.status === 400, "status != 400");
        expect(isApiError(r.json) && r.json.error === "VALIDATION_ERROR", "error code mismatch");
    });

    // --- Preferences: validation failures (schema / regex / strict / empty) ---
    await CASE("POST /preferences missing body → 400 VALIDATION_ERROR", async () => {
        const r = await j<ApiError>(`/preferences/bad_1`, { method: "POST", body: {}, okStatus: 200 });
        expect(r.status === 400, "status != 400");
        expect(isApiError(r.json) && r.json.error === "VALIDATION_ERROR", "error code mismatch");
        expect(isApiError(r.json) && r.json.field === "eventSettings", "field mismatch");
    });

    await CASE(
        "POST /preferences empty eventSettings → 400 VALIDATION_ERROR (cannot be empty)",
        async () => {
            const r = await j<ApiError>(`/preferences/bad_2`, {
                method: "POST",
                body: { dnd: null, eventSettings: {} },
                okStatus: 200,
            });
            expect(r.status === 400, "status != 400");
            expect(isApiError(r.json) && r.json.error === "VALIDATION_ERROR", "error code mismatch");
            const details = isApiError(r.json) ? r.json.details : undefined;
            expect(matches(details, /cannot be empty/i), "details mismatch");
        },
    );

    await CASE("POST /preferences invalid event key → 400 VALIDATION_ERROR", async () => {
        const r = await j<ApiError>(`/preferences/bad_3`, {
            method: "POST",
            body: { dnd: null, eventSettings: { "bad key": { enabled: true } } },
            okStatus: 200,
        });
        expect(r.status === 400, "status != 400");
        expect(isApiError(r.json) && r.json.error === "VALIDATION_ERROR", "error code mismatch");
        const details = isApiError(r.json) ? r.json.details : undefined;
        // detay varsa 'invalid' içerdiğini kabul ediyoruz (z.record key regex mesajı değişken olabilir)
        expect(matches(details, /invalid/i), "details mismatch");
    });

    await CASE(
        "POST /preferences event flag extra property (strict) → 400 VALIDATION_ERROR",
        async () => {
            const r = await j<ApiError>(`/preferences/bad_4`, {
                method: "POST",
                body: { dnd: null, eventSettings: { item_shipped: { enabled: true, extra: 1 } } },
                okStatus: 200,
            });
            expect(r.status === 400, "status != 400");
            expect(isApiError(r.json) && r.json.error === "VALIDATION_ERROR", "error code mismatch");
        },
    );

    await CASE("POST /preferences dnd.start invalid HH:MM → 400 VALIDATION_ERROR", async () => {
        const r = await j<ApiError>(`/preferences/bad_5`, {
            method: "POST",
            body: {
                dnd: { start: "7:00", end: "07:00" },
                eventSettings: { item_shipped: { enabled: true } },
            },
            okStatus: 200,
        });
        expect(r.status === 400, "status != 400");
        expect(isApiError(r.json) && r.json.field === "dnd.start", "field mismatch for dnd.start");
    });

    await CASE("POST /preferences dnd.end invalid HH:MM → 400 VALIDATION_ERROR", async () => {
        const r = await j<ApiError>(`/preferences/bad_6`, {
            method: "POST",
            body: {
                dnd: { start: "22:00", end: "24:00" },
                eventSettings: { item_shipped: { enabled: true } },
            },
            okStatus: 200,
        });
        expect(r.status === 400, "status != 400");
        expect(isApiError(r.json) && r.json.field === "dnd.end", "field mismatch for dnd.end");
    });

    await CASE("POST /preferences dnd start=end → 400 VALIDATION_ERROR (equal window)", async () => {
        const r = await j<ApiError>(`/preferences/bad_7`, {
            method: "POST",
            body: {
                dnd: { start: "10:00", end: "10:00" },
                eventSettings: { item_shipped: { enabled: true } },
            },
            okStatus: 200,
        });
        expect(r.status === 400, "status != 400");
        expect(isApiError(r.json), "no ApiError payload");
        const field = (r.json as ApiError).field;
        // Zod path köke göre dönebildiği için hem "dnd.end" hem "end" kabul
        expect(field === "dnd.end" || field === "end", "field mismatch for equal window");
        const details = (r.json as ApiError).details;
        expect(matches(details, /start and end cannot be equal/i), "details mismatch");
    });

    await CASE("POST /preferences eventSettings wrong type → 400 VALIDATION_ERROR", async () => {
        const r = await j<ApiError>(`/preferences/bad_8`, {
            method: "POST",
            body: { dnd: null, eventSettings: "oops" },
            okStatus: 200,
        });
        expect(r.status === 400, "status != 400");
        expect(isApiError(r.json) && r.json.error === "VALIDATION_ERROR", "error code mismatch");
    });

    await CASE(
        "POST /preferences extra top-level property (strict) → 400 VALIDATION_ERROR",
        async () => {
            const r = await j<ApiError>(`/preferences/bad_9`, {
                method: "POST",
                body: { dnd: null, eventSettings: { item_shipped: { enabled: true } }, foo: 1 },
                okStatus: 200,
            });
            expect(r.status === 400, "status != 400");
            expect(isApiError(r.json) && r.json.error === "VALIDATION_ERROR", "error code mismatch");
        },
    );

    await CASE("POST /preferences omit dnd (valid) → 200", async () => {
        const r = await j<{ ok: true; userId: string } | ApiError>(`/preferences/usr_omit_dnd`, {
            method: "POST",
            body: { eventSettings: { invoice_generated: { enabled: true } } },
            okStatus: 200,
        });
        expect(r.status === 200, "status != 200");
        expect(!isApiError(r.json), "unexpected ApiError");
    });

    await CASE("POST /events type not present in prefs (allow) → 202", async () => {
        const r = await j<Decision | ApiError>(`/events`, {
            method: "POST",
            body: {
                eventId: "evt_not_present",
                userId: "usr_omit_dnd",
                eventType: "another_event",
                timestamp: "2025-07-28T12:00:00Z",
            },
            okStatus: [200, 202],
        });
        expect(r.status === 202, "status != 202");
        expect(isDecision(r.json) && r.json.decision === "PROCESS_NOTIFICATION", "decision mismatch");
    });

    await CASE("GET /preferences/usr_1 (read-back + flag check)", async () => {
        const res = await fetch(`${BASE}/preferences/usr_1`);
        expect(res.status === 200, "status != 200");
        const raw = (await res.json().catch(() => ({}))) as unknown;
        const p = PreferenceSchema.safeParse(raw);
        expect(p.success, "preference shape invalid");
        const flag = p.success ? p.data.eventSettings["item_shipped"] : undefined;
        expect(!!flag && flag.enabled === false, "usr_1 flag mismatch");
    });

    // Summary
    console.log(`\n✔ seed completed. Passed: ${passed}, Failed: ${failed}`);
    if (failed > 0) throw new Error("Some seed cases failed");
}

main().catch((e) => {
    console.error("seed failed:", e);
    process.exit(1);
});
