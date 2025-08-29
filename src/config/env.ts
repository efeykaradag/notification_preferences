// src/config/env.ts
import { z } from "zod";

const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
});

export type Env = z.infer<typeof EnvSchema>;

/** Doğrulanmış ortam değişkenleri */
export const env: Env = EnvSchema.parse(process.env);

/** Kısayollar */
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
export const isDev  = env.NODE_ENV === "development";
