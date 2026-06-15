import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { createServer } from "http";
import fs from "fs";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";
import { initSocket } from "./config/socket";
import { errorHandler } from "./common/exceptions/errorHandler";
import { startDeadlineScheduler } from "./modules/scheduler/deadline.scheduler";
import { authRouter } from "./modules/auth/auth.routes";
import { projectRouter } from "./modules/projects/project.routes";
import { taskRouter } from "./modules/tasks/task.routes";
import { commentRouter } from "./modules/comments/comment.routes";
import { attachmentRouter } from "./modules/attachments/attachment.routes";
import { tagRouter } from "./modules/tags/tag.routes";
import { analyticsRouter } from "./modules/analytics/analytics.routes";
import { notificationRouter } from "./modules/notifications/notification.routes";
import { auditRouter } from "./modules/audit/audit.routes";
import { userRouter } from "./modules/users/user.routes";

async function main() {
  await connectDatabase();

  const app = express();
  const server = createServer(app);

  initSocket(server);

  app.use(helmet());
  const allowedOrigins = env.FRONTEND_URL.split(",").map((s) => s.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads", { recursive: true });
  }
  app.use("/uploads", express.static("uploads"));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/projects", projectRouter);
  app.use("/api/tasks", taskRouter);
  app.use("/api", commentRouter);
  app.use("/api", attachmentRouter);
  app.use("/api/tags", tagRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/audit", auditRouter);

  app.use(errorHandler);

  server.listen(env.PORT, () => {
    console.log(`✓ Server running on port ${env.PORT}`);
    console.log(`✓ Environment: ${env.NODE_ENV}`);
    startDeadlineScheduler();
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
