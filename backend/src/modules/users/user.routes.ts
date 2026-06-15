import { Router } from "express";
import { authenticate } from "../../common/guards/auth.guard";
import { listUsers, getUser } from "./user.service";

const router = Router();

router.use(authenticate);

router.get("/", listUsers);
router.get("/:id", getUser);

export { router as userRouter };
