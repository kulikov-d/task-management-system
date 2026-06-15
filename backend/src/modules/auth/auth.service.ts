import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { AppError } from "../../common/exceptions/AppError";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function generateTokens(user: { id: string; email: string; role: string }): TokenPair {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as any
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: "refresh" },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as any
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
}

export async function register(
  email: string,
  password: string,
  name: string
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError("User with this email already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const tokens = generateTokens(user);

  return { user, ...tokens };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const tokens = generateTokens(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
    ...tokens,
  };
}

export async function refreshToken(token: string) {
  const payload = verifyRefreshToken(token);

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true, avatar: true },
  });

  if (!user) {
    throw new AppError("User not found", 401);
  }

  const tokens = generateTokens(user);

  return { user, ...tokens };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      createdAt: true,
      _count: {
        select: {
          ownedProjects: true,
          assignedTasks: true,
          authoredTasks: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
}
