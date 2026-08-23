import type { NextFunction, Request, Response } from 'express';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (err.name === 'MongoServerError' && err.code === 11000) {
    res.status(409).json({
      success: false,
      message: 'Duplicate record. This entry already exists.',
      fields: err.keyValue,
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({ success: false, message: 'Invalid identifier format.' });
    return;
  }

  res.status(status).json({ success: false, message });
}
