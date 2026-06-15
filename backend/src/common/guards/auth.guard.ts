import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../../modules/auth/auth.service";
import { AppError } from "../../common/exceptions/AppError";
import { userContext } from "../middleware/audit.middleware";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    req.userRole = payload.role;
    userContext.run({ userId: payload.userId }, () => next());
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError("Invalid or expired token", 401));
    }
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return next(new AppError("Authentication required", 401));
    }

    if (roles.length > 0 && !roles.includes(req.userRole)) {
      return next(
        new AppError("Insufficient permissions", 403)
      );
    }

    next();
  };
}
