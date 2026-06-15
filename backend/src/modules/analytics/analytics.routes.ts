import { Router } from "express";
import { authenticate } from "../../common/guards/auth.guard";
import {
  getBurndown,
  getVelocity,
  getTaskStats,
  getExport,
} from "./analytics.service";

const router = Router();

router.use(authenticate);

router.get("/burndown", getBurndown);
router.get("/velocity", getVelocity);
router.get("/tasks", getTaskStats);
router.get("/export", getExport);

export { router as analyticsRouter };
