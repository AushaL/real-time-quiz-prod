import { Router } from "express";
import {
  getAllQuizzes,
  getQuizById,
} from "../controller/quizzes.controller.js";

const router = Router();

router.get("/", getAllQuizzes);
router.get("/:quizeId", getQuizById);

export default router;
