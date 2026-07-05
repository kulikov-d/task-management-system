import { FastifyError } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./AppError";

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  _request: any,
  reply: any
) {
  if (error instanceof AppError) {
    reply.code(error.statusCode).send({
      message: error.message,
      statusCode: error.statusCode,
    });
    return;
  }

  if (error instanceof ZodError) {
    reply.code(400).send({
      message: "Validation error",
      statusCode: 400,
      errors: error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  const statusCode = (error as any).statusCode || 500;
  console.error(`Unhandled error (${statusCode}):`, error.message);
  reply.code(statusCode).send({
    message: statusCode === 500 ? "Internal server error" : error.message,
    statusCode,
  });
}
