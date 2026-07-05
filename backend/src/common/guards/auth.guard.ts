import { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../../modules/auth/auth.service";
import { AppError } from "../../common/exceptions/AppError";
import { userContext } from "../../common/middleware/audit.middleware";

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    throw new AppError("Authentication required", 401);
  }

  try {
    const payload = await verifyAccessToken(token);
    request.userId = payload.userId;
    request.userRole = payload.role;
    userContext.enterWith({ userId: payload.userId });
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
}

export function authorize(...roles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.userRole) {
      throw new AppError("Authentication required", 401);
    }

    if (roles.length > 0 && !roles.includes(request.userRole)) {
      throw new AppError("Insufficient permissions", 403);
    }
  };
}
