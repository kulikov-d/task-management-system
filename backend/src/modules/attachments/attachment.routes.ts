import { Router } from "express";
import { authenticate } from "../../common/guards/auth.guard";
import {
  upload,
  listAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
} from "./attachment.service";

const router = Router();

router.use(authenticate);

router.get("/tasks/:taskId/attachments", listAttachments);
router.post("/tasks/:taskId/attachments", upload.single("file"), uploadAttachment);
router.get("/attachments/:id/download", downloadAttachment);
router.delete("/attachments/:id", deleteAttachment);

export { router as attachmentRouter };
