import { Router } from "express";
import { authenticate, authorize } from "../../common/guards/auth.guard";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  updateMemberRole,
} from "./project.service";

const router = Router();

router.use(authenticate);

router.get("/", listProjects);
router.get("/:id", getProject);
router.post("/", authorize("lead", "admin"), createProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);
router.post("/:id/members", addMember);
router.put("/:id/members/:userId", updateMemberRole);
router.delete("/:id/members/:userId", removeMember);

export { router as projectRouter };
