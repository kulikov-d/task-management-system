import { Request, Response, NextFunction } from "express";
import { register, login, refreshToken, getMe } from "./auth.service";
import { env } from "../../config/env";

function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth",
  });
}

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = req.body;
    const result = await register(email, password, name);
    setRefreshTokenCookie(res, result.refreshToken);
    res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    setRefreshTokenCookie(res, result.refreshToken);
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      res.status(401).json({ message: "Refresh token required" });
      return;
    }
    const result = await refreshToken(token);
    setRefreshTokenCookie(res, result.refreshToken);
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const user = await getMe(userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export function logoutHandler(_req: Request, res: Response) {
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.json({ message: "Logged out" });
}
