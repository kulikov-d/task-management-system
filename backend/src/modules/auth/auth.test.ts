import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "test-secret-key-that-is-at-least-32-chars";
const JWT_REFRESH_SECRET = "test-refresh-secret-key-that-is-32c";

function generateTokens(user: { id: string; email: string; role: string }) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "15m" } as any
  );
  const refreshToken = jwt.sign(
    { userId: user.id, type: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" } as any
  );
  return { accessToken, refreshToken };
}

function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
}

function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; type: string };
}

describe("Auth - JWT Tokens", () => {
  const user = { id: "user-123", email: "test@test.com", role: "admin" };

  it("should generate access and refresh tokens", () => {
    const { accessToken, refreshToken } = generateTokens(user);
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
    expect(typeof accessToken).toBe("string");
    expect(typeof refreshToken).toBe("string");
  });

  it("should verify access token correctly", () => {
    const { accessToken } = generateTokens(user);
    const payload = verifyAccessToken(accessToken);
    expect(payload.userId).toBe(user.id);
    expect(payload.email).toBe(user.email);
    expect(payload.role).toBe(user.role);
  });

  it("should verify refresh token correctly", () => {
    const { refreshToken } = generateTokens(user);
    const payload = verifyRefreshToken(refreshToken);
    expect(payload.userId).toBe(user.id);
    expect(payload.type).toBe("refresh");
  });

  it("should reject invalid token", () => {
    expect(() => verifyAccessToken("invalid.token.here")).toThrow();
  });

  it("should reject wrong secret", () => {
    const { accessToken } = generateTokens(user);
    expect(() => jwt.verify(accessToken, "wrong-secret")).toThrow();
  });

  it("should reject expired token", () => {
    const token = jwt.sign({ userId: "1" }, JWT_SECRET, { expiresIn: "0s" });
    expect(() => verifyAccessToken(token)).toThrow();
  });
});
