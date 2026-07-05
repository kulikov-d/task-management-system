import { FastifyRequest, FastifyReply } from "fastify";
import { register, login, refreshToken, getMe } from "./auth.service";
import { env } from "../../config/env";

function setRefreshTokenCookie(reply: FastifyReply, token: string) {
  reply.setCookie("refreshToken", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
}

export async function registerHandler(request: FastifyRequest, reply: FastifyReply) {
  const { email, password, name } = request.body as { email: string; password: string; name: string };
  const result = await register(email, password, name);
  setRefreshTokenCookie(reply, result.refreshToken);
  return reply.code(201).send({
    user: result.user,
    accessToken: result.accessToken,
  });
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const { email, password } = request.body as { email: string; password: string };
  const result = await login(email, password);
  setRefreshTokenCookie(reply, result.refreshToken);
  return reply.send({
    user: result.user,
    accessToken: result.accessToken,
  });
}

export async function refreshHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as any;
  const token = request.cookies?.refreshToken || body?.refreshToken;
  if (!token) {
    return reply.code(401).send({ message: "Refresh token required" });
  }
  const result = await refreshToken(token);
  setRefreshTokenCookie(reply, result.refreshToken);
  return reply.send({
    user: result.user,
    accessToken: result.accessToken,
  });
}

export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const user = await getMe(userId);
  return reply.send(user);
}

export async function logoutHandler(_request: FastifyRequest, reply: FastifyReply) {
  reply.clearCookie("refreshToken", { path: "/api/auth" });
  return reply.send({ message: "Logged out" });
}
