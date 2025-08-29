import type { Request } from "express";

export type TypedRequest<
    P = Record<string, string>,
    ResBody = unknown,
    ReqBody = unknown,
    ReqQuery = Record<string, string | string[]>
> = Request<P, ResBody, ReqBody, ReqQuery>;
