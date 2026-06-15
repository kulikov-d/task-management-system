import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "./AppError";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validation error",
      statusCode: 400,
      errors: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  const statusCode = (err as any).statusCode || 500;
  console.error(`Unhandled error (${statusCode}):`, err.message);
  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : err.message,
    statusCode,
  });
}
