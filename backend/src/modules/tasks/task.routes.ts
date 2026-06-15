import { Router } from "express";
import { authenticate } from "../../common/guards/auth.guard";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  changeStatus,
  moveTask,
  addTagToTask,
  removeTagFromTask,
} from "./task.service";

const router = Router();

router.use(authenticate);

router.get("/", listTasks);
router.get("/:id", getTask);
router.post("/", createTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);
router.put("/:id/assign", assignTask);
router.put("/:id/status", changeStatus);
router.put("/:id/move", moveTask);
router.post("/:id/tags", addTagToTask);
router.delete("/:id/tags/:tagId", removeTagFromTask);

export { router as taskRouter };
