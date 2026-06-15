import { Router } from "express";
import { authenticate } from "../../common/guards/auth.guard";
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
} from "./comment.service";

const router = Router();

router.use(authenticate);

router.get("/tasks/:taskId/comments", listComments);
router.post("/tasks/:taskId/comments", createComment);
router.put("/comments/:id", updateComment);
router.delete("/comments/:id", deleteComment);

export { router as commentRouter };
