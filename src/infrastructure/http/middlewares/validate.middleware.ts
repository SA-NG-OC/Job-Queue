import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';

export const validate =
    (schema: ZodObject) =>
        (req: Request, res: Response, next: NextFunction): void => {
            try {
                const parsed = schema.parse({
                    body: req.body,
                    params: req.params,
                    query: req.query,
                });

                if (parsed.body) Object.assign(req.body, parsed.body);
                if (parsed.params) Object.assign(req.params, parsed.params);
                if (parsed.query) Object.assign(req.query, parsed.query);

                next();
            } catch (err) {
                if (err instanceof ZodError) {
                    res.status(400).json({
                        message: 'Validation failed',
                        errors: err.issues.map((e) => ({
                            field: e.path
                                .filter((p): p is string | number =>
                                    (typeof p === 'string' || typeof p === 'number') &&
                                    p !== 'body' && p !== 'params' && p !== 'query'
                                )
                                .join('.'),
                            message: e.message,
                        })),
                    });
                    return;
                }
                next(err);
            }
        };