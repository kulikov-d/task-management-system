import { Router } from "express";
import { authenticate } from "../../common/guards/auth.guard";
import { listTags, createTag, deleteTag } from "./tag.service";

const router = Router();

router.use(authenticate);

router.get("/", listTags);
router.post("/", createTag);
router.delete("/:id", deleteTag);

export { router as tagRouter };
