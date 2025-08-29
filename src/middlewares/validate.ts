// src/middlewares/validate.ts
import type { RequestHandler } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";
import { ZodError, ZodType } from "zod";

/** Map first Zod issue to a uniform API error shape */
function zodToApiError(err: ZodError) {
    const i = err.issues[0];
    return {
        error: "VALIDATION_ERROR",
        code: String(i?.code ?? "invalid").toUpperCase(),
        field: i?.path?.join?.("."),
        details: i?.message ?? "Invalid request payload",
    };
}

type ZodSchema<T> = ZodType<T, any, any>;

type Schemas<P extends ParamsDictionary, Q extends ParsedQs, B> = {
    params?: ZodSchema<P>;
    query?: ZodSchema<Q>;
    body?: ZodSchema<B>;
};

/**
 * Type-safe validator middleware with generics for params/query/body.
 * Fixes TS2322 by making Zod schemas return the exact Express generic types.
 */
export function validate<
    P extends ParamsDictionary = ParamsDictionary,
    Q extends ParsedQs = ParsedQs,
    B = unknown
>(schemas: Schemas<P, Q, B>): RequestHandler<P, any, B, Q> {
    return (req, res, next) => {
        try {
            if (schemas.params) {
                const parsedParams = schemas.params.parse(req.params); // typed as P
                req.params = parsedParams;
            }
            if (schemas.query) {
                const parsedQuery = schemas.query.parse(req.query); // typed as Q
                req.query = parsedQuery;
            }
            if (schemas.body) {
                const parsedBody = schemas.body.parse(req.body); // typed as B
                req.body = parsedBody;
            }
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                return res.status(400).json(zodToApiError(err));
            }
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                code: "INVALID_REQUEST",
                details: "Request validation failed.",
            });
        }
    };
}

/** Convenience wrappers */
export function validateBody<B>(schema: ZodSchema<B>) {
    return validate<ParamsDictionary, ParsedQs, B>({ body: schema });
}

export function validateQuery<Q extends ParsedQs>(schema: ZodSchema<Q>) {
    return validate<ParamsDictionary, Q, unknown>({ query: schema });
}

export function validateParams<P extends ParamsDictionary>(schema: ZodSchema<P>) {
    return validate<P, ParsedQs, unknown>({ params: schema });
}

export default validate;
