import { Quiz } from "../models/quiz.model.js";

const DIFFICULTY_VALUES = [1, 2, 3, 4];

const QUIZ_TYPES = ["text", "image", "audio"];
const MODES = ["classic", "live", "offline"];
const SORT_FIELDS = ["difficulty", "createdAt"];

const toList = (value) =>
  typeof value === "string" && value.trim() !== ""
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export const getAllQuizzes = async (req, res, next) => {
  try {
    const filter = {};

    const difficulty = toList(req.query.difficulty)
      .map(Number)
      .filter((value) => DIFFICULTY_VALUES.includes(value));
    if (difficulty.length) filter.difficulty = { $in: difficulty };

    const type = toList(req.query.type).filter((value) =>
      QUIZ_TYPES.includes(value),
    );
    if (type.length) filter["questions.questionType"] = { $in: type };

    const mode = toList(req.query.mode).filter((value) =>
      MODES.includes(value),
    );
    if (mode.length) filter.mode = { $in: mode };

    const sortBy = SORT_FIELDS.includes(req.query.sortBy)
      ? req.query.sortBy
      : null;
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    let query = Quiz.find(filter);
    if (sortBy) {
      query = query.sort({ [sortBy]: sortOrder });
    }

    const quizzes = await query;
    res.status(200).json(quizzes);
  } catch (err) {
    next(err);
  }
};

export const getQuizById = async (req, res, next) => {
  try {
    const { quizeId } = req.params;
    const quiz = await Quiz.findById(quizeId).populate("questions");

    if (!quiz) {
      res.status(404).json({ message: "Quiz not found" });
    }
    res.status(200).json(quiz);
  } catch (error) {
    next(error);
  }
};
