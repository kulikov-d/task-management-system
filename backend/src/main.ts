import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyCookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fs from "fs";
import path from "path";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";
import { initSocket } from "./config/socket";
import { errorHandler } from "./common/exceptions/errorHandler";
import { authPlugin } from "./modules/auth/auth.routes";
import { projectPlugin } from "./modules/projects/project.routes";
import { taskPlugin } from "./modules/tasks/task.routes";
import { commentPlugin } from "./modules/comments/comment.routes";
import { attachmentPlugin } from "./modules/attachments/attachment.routes";
import { tagPlugin } from "./modules/tags/tag.routes";
import { analyticsPlugin } from "./modules/analytics/analytics.routes";
import { notificationPlugin } from "./modules/notifications/notification.routes";
import { auditPlugin } from "./modules/audit/audit.routes";
import { userPlugin } from "./modules/users/user.routes";
import { sprintPlugin } from "./modules/sprints/sprint.routes";
import { searchPlugin } from "./modules/search/search.routes";
import { teamPlugin } from "./modules/teams/team.routes";

async function main() {
  await connectDatabase();

  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyHelmet);
  const allowedOrigins = env.FRONTEND_URL.split(",").map((s) => s.trim());
  await fastify.register(fastifyCors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyMultipart);

  const uploadsDir = path.resolve("uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  await fastify.register(fastifyStatic, { root: uploadsDir, prefix: "/uploads" });

  fastify.get("/api/health", async (_request, _reply) => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  await fastify.register(authPlugin, { prefix: "/api/auth" });
  await fastify.register(userPlugin, { prefix: "/api/users" });
  await fastify.register(projectPlugin, { prefix: "/api/projects" });
  await fastify.register(taskPlugin, { prefix: "/api/tasks" });
  await fastify.register(commentPlugin, { prefix: "/api" });
  await fastify.register(attachmentPlugin, { prefix: "/api" });
  await fastify.register(tagPlugin, { prefix: "/api/tags" });
  await fastify.register(analyticsPlugin, { prefix: "/api/analytics" });
  await fastify.register(notificationPlugin, { prefix: "/api/notifications" });
  await fastify.register(auditPlugin, { prefix: "/api/audit" });
  await fastify.register(sprintPlugin, { prefix: "/api/sprints" });
  await fastify.register(searchPlugin, { prefix: "/api/search" });
  await fastify.register(teamPlugin, { prefix: "/api/teams" });

  fastify.setErrorHandler(errorHandler);

  initSocket(fastify.server);

  await fastify.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`✓ Server running on port ${env.PORT}`);
  console.log(`✓ Environment: ${env.NODE_ENV}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
