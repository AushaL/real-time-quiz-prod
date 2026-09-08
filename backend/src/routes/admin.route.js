import { Router } from "express";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import {
  checkAdmin,
  createQuiz,
  deleteQuiz,
} from "../controller/admin.controller.js";

const router = Router();

router.use(protectRoute, requireAdmin);

router.get("/check", checkAdmin);
router.post("/quiz", createQuiz);
router.delete("/quiz/:id", deleteQuiz);

export default router;
