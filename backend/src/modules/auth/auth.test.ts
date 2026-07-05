import { describe, it, expect } from "vitest";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = "test-secret-key-that-is-at-least-32-chars";
const JWT_REFRESH_SECRET = "test-refresh-secret-key-that-is-32c";

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

async function generateTokens(user: { id: string; email: string; role: string }) {
  const accessToken = await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(encodeSecret(JWT_SECRET));

  const refreshToken = await new SignJWT({
    userId: user.id,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodeSecret(JWT_REFRESH_SECRET));

  return { accessToken, refreshToken };
}

async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, encodeSecret(JWT_SECRET));
  return payload as unknown as { userId: string; email: string; role: string };
}

async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, encodeSecret(JWT_REFRESH_SECRET));
  return payload as unknown as { userId: string; type: string };
}

describe("Auth - JWT Tokens", () => {
  const user = { id: "user-123", email: "test@test.com", role: "admin" };

  it("should generate access and refresh tokens", async () => {
    const { accessToken, refreshToken } = await generateTokens(user);
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
    expect(typeof accessToken).toBe("string");
    expect(typeof refreshToken).toBe("string");
  });

  it("should verify access token correctly", async () => {
    const { accessToken } = await generateTokens(user);
    const payload = await verifyAccessToken(accessToken);
    expect(payload.userId).toBe(user.id);
    expect(payload.email).toBe(user.email);
    expect(payload.role).toBe(user.role);
  });

  it("should verify refresh token correctly", async () => {
    const { refreshToken } = await generateTokens(user);
    const payload = await verifyRefreshToken(refreshToken);
    expect(payload.userId).toBe(user.id);
    expect(payload.type).toBe("refresh");
  });

  it("should reject invalid token", async () => {
    await expect(verifyAccessToken("invalid.token.here")).rejects.toThrow();
  });

  it("should reject wrong secret", async () => {
    const { accessToken } = await generateTokens(user);
    const wrongKey = new TextEncoder().encode("wrong-secret");
    await expect(jwtVerify(accessToken, wrongKey)).rejects.toThrow();
  });

  it("should reject expired token", async () => {
    const token = await new SignJWT({ userId: "1" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("0s")
      .sign(encodeSecret(JWT_SECRET));
    await expect(verifyAccessToken(token)).rejects.toThrow();
  });
});
