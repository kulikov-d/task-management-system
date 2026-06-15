import { Router } from "express";
import { authenticate } from "../../common/guards/auth.guard";
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  meHandler,
  logoutHandler,
} from "./auth.controller";

const router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.get("/me", authenticate, meHandler);
router.post("/logout", logoutHandler);

export { router as authRouter };
