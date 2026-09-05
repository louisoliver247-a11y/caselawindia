import type { NextFunction, Request, Response } from "express";
export class HttpError extends Error { constructor(public status: number, message: string, public details?: unknown) { super(message); } }
export const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { handler(req, res).catch(next); };
export const ok = <T>(res: Response, data: T, meta?: Record<string, unknown>) => res.json({ data, ...(meta ? { meta } : {}) });
