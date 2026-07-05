-- AlterEnum
-- This migration updates the Role enum by removing 'viewer'
-- First, update all existing 'viewer' records to 'developer'
UPDATE "User" SET "role" = 'developer' WHERE "role" = 'viewer';
UPDATE "ProjectMember" SET "role" = 'developer' WHERE "role" = 'viewer';

-- Recreate the enum without 'viewer'
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('admin', 'lead', 'developer');

-- Update column types and defaults
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "ProjectMember" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";
ALTER TABLE "ProjectMember" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'developer';
ALTER TABLE "ProjectMember" ALTER COLUMN "role" SET DEFAULT 'developer';
DROP TYPE "Role_old";
