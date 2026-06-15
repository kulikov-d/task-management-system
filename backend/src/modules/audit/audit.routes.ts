import { Router } from "express";
import { authenticate } from "../../common/guards/auth.guard";
import { listAuditLogs } from "./audit.service";

const router = Router();

router.use(authenticate);

router.get("/", listAuditLogs);

export { router as auditRouter };
