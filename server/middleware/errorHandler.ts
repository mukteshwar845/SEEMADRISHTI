import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  // If already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      timestamp,
    });
    return;
  }

  // Handle SQLite constraint violations
  if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
    res.status(400).json({
      success: false,
      error: 'Foreign key constraint violated: referenced entity does not exist',
      timestamp,
    });
    return;
  }

  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    res.status(409).json({
      success: false,
      error: 'Unique constraint violated: entity with this ID or unique key already exists',
      timestamp,
    });
    return;
  }

  if (err.message && err.message.includes('CHECK constraint failed')) {
    res.status(400).json({
      success: false,
      error: `Validation check failed: ${err.message}`,
      timestamp,
    });
    return;
  }

  // SyntaxError from JSON body parsing
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'Malformed JSON payload in request body',
      timestamp,
    });
    return;
  }

  // Unexpected internal errors
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp,
  });
}
