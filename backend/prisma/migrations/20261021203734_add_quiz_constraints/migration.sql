-- Enforce the domain rules that the old Mongoose schema validated.
ALTER TABLE "questions" ALTER COLUMN "options" SET NOT NULL;

ALTER TABLE "quizzes"
  ADD CONSTRAINT "quizzes_difficulty_check"
  CHECK ("difficulty" BETWEEN 1 AND 4);

ALTER TABLE "questions"
  ADD CONSTRAINT "questions_position_check"
  CHECK ("position" >= 0);

ALTER TABLE "questions"
  ADD CONSTRAINT "questions_correct_answer_index_check"
  CHECK (
    "correctAnswerIndex" >= 0
    AND "correctAnswerIndex" < COALESCE(array_length("options", 1), 0)
  );
