// src/server.ts
import express from "express";
import { preferencesRouter } from "./routes/preferences.router.js";
import { eventsRouter } from "./routes/events.router.js";
import { notFound, errorHandler } from "./middlewares/error-handler.js";
import { requestId } from "./middlewares/request-id.js";
import { logger } from "./middlewares/logger.js";
import { env } from "./config/env.js";

const app = express();

// --- middleware order (prod-like) ---
app.use(requestId);
app.use(logger);
app.use(express.json({ limit: "100kb" }));

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

// Routes
app.use("/preferences", preferencesRouter);
app.use("/events", eventsRouter);

// 404 + global error
app.use(notFound);
app.use(errorHandler);

// Start
const server = app.listen(env.PORT, () => {
    console.log(`Notification Preferences service listening on :${env.PORT}`);
});

// Graceful shutdown
const shutdown = (sig: string) => {
    console.log(`${sig} received. Shutting down...`);
    server.close((err?: Error) => {
        if (err) {
            console.error("Error during close:", err);
            process.exit(1);
        }
        process.exit(0);
    });
};
["SIGINT", "SIGTERM"].forEach((s) =>
    process.on(s as NodeJS.Signals, () => shutdown(s))
);

export { app };
