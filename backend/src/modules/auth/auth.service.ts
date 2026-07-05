import { SignJWT, jwtVerify } from "jose";
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

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

async function generateTokens(user: { id: string; email: string; role: string }): Promise<TokenPair> {
  const accessToken = await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(encodeSecret(env.JWT_SECRET));

  const refreshToken = await new SignJWT({
    userId: user.id,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
    .sign(encodeSecret(env.JWT_REFRESH_SECRET));

  return { accessToken, refreshToken };
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, encodeSecret(env.JWT_SECRET));
  return payload as unknown as JwtPayload;
}

async function verifyRefreshToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, encodeSecret(env.JWT_REFRESH_SECRET));
  return payload as unknown as { userId: string };
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

  const tokens = await generateTokens(user);

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

  const tokens = await generateTokens(user);

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
  const payload = await verifyRefreshToken(token);

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true, avatar: true },
  });

  if (!user) {
    throw new AppError("User not found", 401);
  }

  const tokens = await generateTokens(user);

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
