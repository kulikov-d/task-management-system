import { PrismaClient } from "@prisma/client";
import { env } from "./env";

export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("✓ Database connected");
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
