import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation error',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ message: 'A record with that value already exists' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Record not found' });
      return;
    }
  }

  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status;
    const httpStatus = status && status >= 400 && status < 600 ? status : 500;

    // Only log server errors — 4xx are expected operational failures
    if (httpStatus >= 500) {
      console.error(err.stack);
    }

    res.status(httpStatus).json({ message: err.message || 'Internal server error' });
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
}
