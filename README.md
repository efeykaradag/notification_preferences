# Event‑Driven Notification Orchestrator

A small **Node.js + TypeScript** service that stores user notification preferences and decides whether an incoming event **should trigger a notification**.

> Built to match the *NodeJS Internship task* requirements. Extras include: strict validation with **Zod**, unified error shape, **DND** edge‑case tests, and typed Express handlers.

---

##  Features

* **Preferences API**: `GET /preferences/:userId`, `POST /preferences/:userId` (in‑memory store)
* **Event Decision API**: `POST /events` → returns `PROCESS_NOTIFICATION` or `DO_NOT_NOTIFY`
* **DND (Do Not Disturb)** logic with **overnight windows** (e.g., `22:00–07:00`)
* **Validation** with Zod (HH\:MM, ISO‑UTC, event type key)
* **Consistent errors**: `{ error, code?, field?, details? }`
* **Unit tests** for DND core + edge cases (**Vitest**)
* **TypeScript‑first** routing & middlewares

---

##  Project Structure

```
notification_preferences/
├─ src/
│  ├─ server.ts                  # Express app bootstrap
│  ├─ http.ts                    # (if used) HTTP helpers
│  ├─ constants.ts               # DECISION / REASON / ERROR enums
│  ├─ types.ts                   # ApiError, Decision, Preference types
│  ├─ schema.ts                  # Zod schemas (HH:MM, ISO‑UTC, payloads)
│  ├─ store/memory.ts            # In‑memory Map<string, Preference>
│  ├─ domain/dnd.ts              # DND core logic (HH:MM parsing, checks)
│  ├─ routes/
│  │  ├─ preferences.router.ts   # GET/POST /preferences/:userId
│  │  └─ events.router.ts        # POST /events
│  ├─ middlewares/
│  │  ├─ validate.ts             # Zod validators (body/query/params)
│  │  └─ error-handler.ts        # 404 + global error handler
│  ├─ utils/responses.ts         # sendError / sendDecision helpers
│  └─ scripts/seed.ts            # optional seeded data
├─ tests/
│  ├─ dnd.test.ts                # core DND tests
│  ├─ dnd.negatives.test.ts      # negative tests
│  └─ dnd.edgecases.test.ts      # start=end, boundaries, invalid HH:MM
├─ package.json
├─ tsconfig.json
└─ vitest.config.ts
```

---

## 🛠️ Tech

* **Node.js** (v20+)
* **TypeScript**, **Express 5**, **Zod**, **Vitest** (+ supertest)

### Requirements

* Node **20+** and npm

---

## Getting Started

```bash
# 1) Install deps
npm install

# 2) Dev mode (TS, auto-reload)
npm run dev

# 3) Build + run
npm run build && npm start

# 4) Tests & coverage
npm test
npm run test:cov

# 5) (Optional) Seed sample data
npm run seed
```

> Default port: `3000` (set `PORT` env to override).

---

##  Data Model

### Preference Object

```json
{
  "dnd": { "start": "22:00", "end": "07:00" },
  "eventSettings": {
    "item_shipped": { "enabled": true },
    "invoice_generated": { "enabled": true }
  }
}
```

### Event Payload

```json
{
  "eventId": "evt_12345",
  "userId": "usr_abcde",
  "eventType": "item_shipped",
  "timestamp": "2025-07-28T23:00:00Z"
}
```

---

##  DND Semantics (UTC)

* Time strings are **UTC HH\:MM** (`00:00–23:59`).
* **Start inclusive**, **End exclusive**.
* **Overnight windows** are supported (e.g., `22:00–07:00`).
* `start === end` → **disabled** (no DND).
* **Invalid HH\:MM** → safe **fail‑open** (treat as no DND).

### Examples

* `22:00–07:00` → **DND** at `23:30` and `02:00`; **not DND** at `21:00` or `07:00`.
* `09:00–17:00` → **DND** at `09:00` through `16:59`; **not DND** at `17:00`.

---

##  Testing & Coverage

* Test runner: **Vitest**
* Run: `npm test`
* Coverage: `npm run test:cov`
* Edge cases covered (see `tests/dnd.edgecases.test.ts`):

    * `start === end` → ineffective
    * Overnight boundaries (start inclusive, end exclusive)
    * Same‑day boundaries
    * Invalid `start` / `end` HH\:MM → fail‑open

`vitest.config.ts` sets strict thresholds (e.g., \~90% lines/functions, \~85% branches).

---

##  API Reference

### POST `/preferences/:userId`

**Description**: Create/replace preferences for a user.

**Body**

```json
{
  "dnd": { "start": "22:00", "end": "07:00" },
  "eventSettings": { "item_shipped": { "enabled": true } }
}
```

**Responses**

* `200 OK`

  ```json
  { "ok": true, "userId": "usr_abcde" }
  ```
* `400 VALIDATION_ERROR` (invalid body)

  ```json
  { "error":"VALIDATION_ERROR", "code":"INVALID_VALUE", "field":"dnd.start", "details":"must match HH:MM (00–23:59)" }
  ```

**Example (cURL)**

```bash
curl -X POST http://localhost:3000/preferences/usr_abcde \
  -H "Content-Type: application/json" \
  -d '{
        "dnd": { "start": "22:00", "end": "07:00" },
        "eventSettings": { "item_shipped": { "enabled": true } }
      }'
```

---

### GET `/preferences/:userId`

**Description**: Fetch preferences for a user.

**Responses**

* `200 OK`

  ```json
  {
    "dnd": { "start": "22:00", "end": "07:00" },
    "eventSettings": { "item_shipped": { "enabled": true } }
  }
  ```
* `404 NOT_FOUND`

  ```json
  { "error":"NOT_FOUND", "details":"User preferences not found" }
  ```

**Example (cURL)**

```bash
curl http://localhost:3000/preferences/usr_abcde
```

---

### POST `/events`

**Description**: Decide whether a notification should be processed for the event.

**Body**

```json
{
  "eventId":"evt_1",
  "userId":"usr_abcde",
  "eventType":"item_shipped",
  "timestamp":"2025-07-28T23:00:00Z"
}
```

**Success Responses**

* **Allowed** → `202 Accepted`

  ```json
  { "decision":"PROCESS_NOTIFICATION" }
  ```
* **Blocked** → `200 OK`

  ```json
  { "decision":"DO_NOT_NOTIFY", "reason":"DND_ACTIVE" }
  ```

  or

  ```json
  { "decision":"DO_NOT_NOTIFY", "reason":"USER_UNSUBSCRIBED_FROM_EVENT" }
  ```

**Validation Errors**

* `400 INVALID_TIMESTAMP`

  ```json
  { "error":"INVALID_TIMESTAMP", "code":"INVALID_FORMAT", "field":"timestamp", "details":"timestamp must be ISO-8601 UTC like 2025-01-01T00:00:00Z" }
  ```
* `400 VALIDATION_ERROR` (general body problems)

  ```json
  { "error":"VALIDATION_ERROR", "code":"INVALID_VALUE", "field":"eventType", "details":"Invalid event key" }
  ```

**Example (cURL)**

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
        "eventId":"evt_1",
        "userId":"usr_abcde",
        "eventType":"item_shipped",
        "timestamp":"2025-07-28T23:00:00Z"
      }'
```

---

##  Decision Logic

```
Look up preferences by userId
  ├─ If no preferences → treat missing as fail‑open for eventSettings? (implementation: require explicit prefs)
  ├─ If eventType is disabled → DO_NOT_NOTIFY (USER_UNSUBSCRIBED_FROM_EVENT)
  ├─ If DND active at event timestamp → DO_NOT_NOTIFY (DND_ACTIVE)
  └─ Else → PROCESS_NOTIFICATION (202)
```

> **Note**: In this implementation, missing `eventSettings[eventType]` is treated as **disabled** by default (safer). Adjust to your product policy if needed.

---

## Error Model (Unified)

All errors share this shape:

```ts
interface ApiError {
  error: string;                 // e.g., "VALIDATION_ERROR", "INVALID_TIMESTAMP", "NOT_FOUND"
  code?: string;                 // e.g., "INVALID_TYPE", "INVALID_FORMAT", "EXTRA_PROPERTY"
  field?: string;                // e.g., "timestamp", "dnd.start"
  details?: string;              // human-friendly explanation
}
```

### Examples

```json
{ "error":"NOT_FOUND", "details":"User preferences not found" }
```

```json
{ "error":"VALIDATION_ERROR", "code":"EXTRA_PROPERTY", "details":"Unrecognized key(s): foo" }
```

---

##  Design Notes

* **Type‑level safety** over `any`; typed `Request` aliases for routes, Zod‑driven DTOs
* **Zod first**: all inputs pass through schemas → better DX & testability
* **sendError/sendDecision** helpers to standardize responses
* **DND correctness**: inclusive/exclusive boundaries, overnight windows, edge‑cases

---

##  What’s Next (nice to have)

* OpenAPI (Swagger) doc generation from Zod schemas
* E2E tests with supertest for all endpoints & error paths
* Pluggable persistence layer (swap in a DB repository later)
* Rate limiting on `/events`

---

##  Appendix: Sample Requests

```bash
# Save preferences
http POST :3000/preferences/usr_1 \
  dnd:='{"start":"22:00","end":"07:00"}' \
  eventSettings:='{"item_shipped":{"enabled":true}}'

# Get preferences
http :3000/preferences/usr_1

# Event decision
http POST :3000/events \
  eventId=evt_1 userId=usr_1 eventType=item_shipped timestamp=2025-07-28T23:00:00Z
```

---

**Author**: Efe Yiğit Karadağ

**License**: MIT Licence
