import type { RequestHandler } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";
import { ZodError, type ZodType } from "zod";

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

/** Type-safe validator middleware */
export function validate<
    P extends ParamsDictionary = ParamsDictionary,
    Q extends ParsedQs = ParsedQs,
    B = unknown
>(schemas: Schemas<P, Q, B>): RequestHandler<P, any, B, Q> {
    return (req, res, next) => {
        try {
            if (schemas.params) req.params = schemas.params.parse(req.params) as P;
            if (schemas.query) req.query = schemas.query.parse(req.query) as Q;
            if (schemas.body) req.body = schemas.body.parse(req.body) as B;
            next();
        } catch (err) {
            if (err instanceof ZodError) return res.status(400).json(zodToApiError(err));
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                code: "INVALID_REQUEST",
                details: "Request validation failed.",
            });
        }
    };
}

/** Convenience wrappers */
export const validateBody = <B,>(schema: ZodSchema<B>) =>
    validate<ParamsDictionary, ParsedQs, B>({ body: schema });

export const validateQuery = <Q extends ParsedQs>(schema: ZodSchema<Q>) =>
    validate<ParamsDictionary, Q, unknown>({ query: schema });

export const validateParams = <P extends ParamsDictionary>(schema: ZodSchema<P>) =>
    validate<P, ParsedQs, unknown>({ params: schema });

export default validate;
