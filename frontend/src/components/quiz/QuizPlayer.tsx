import { useState } from "react";
import { ArrowRightIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import type { IQuiz } from "../../types";
import { Button } from "../ui/button";
import { QuizQuestionCard } from "./QuizQuestionCard";
import { QuizResult } from "./QuizResult";

export const QuizPlayer = ({ quiz }: { quiz: IQuiz }) => {
  const questions = quiz.questions;
  const total = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[currentIndex];
  const isLast = currentIndex === total - 1;
  const isCorrect = selectedOption === question.correctAnswerIndex;
  const answered = correctCount + wrongCount;

  const handleSubmit = () => {
    if (selectedOption === null || submitted) return;
    setSubmitted(true);
    if (isCorrect) setCorrectCount((count) => count + 1);
    else setWrongCount((count) => count + 1);
  };

  const handleNext = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setCurrentIndex((index) => index + 1);
    setSelectedOption(null);
    setSubmitted(false);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setSubmitted(false);
    setCorrectCount(0);
    setWrongCount(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <QuizResult
        correct={correctCount}
        wrong={wrongCount}
        total={total}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="mx-auto mt-4 w-full max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-40">
          <p className="text-sm font-medium text-muted-foreground">
            Вопрос{" "}
            <span className="font-semibold text-foreground">
              {currentIndex + 1}
            </span>{" "}
            из {total}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/10 px-2 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-600/20">
            <CheckCircle2Icon className="size-3.5" />
            {correctCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive ring-1 ring-destructive/20">
            <XCircleIcon className="size-3.5" />
            {wrongCount}
          </span>
        </div>
      </div>

      <QuizQuestionCard
        question={question}
        selectedOption={selectedOption}
        submitted={submitted}
        onSelect={setSelectedOption}
      />
      <div className="mt-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {submitted ? (
              <>
                <p
                  className={cn(
                    "flex items-center gap-2 text-base font-semibold",
                    isCorrect ? "text-emerald-600" : "text-destructive",
                  )}
                >
                  {isCorrect ? (
                    <CheckCircle2Icon className="size-4 shrink-0" />
                  ) : (
                    <XCircleIcon className="size-4 shrink-0" />
                  )}
                  {isCorrect ? "Правильно!" : "Неправильно"}
                </p>
                {question.explanation && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Пояснение:{" "}
                    </span>
                    {question.explanation}
                  </p>
                )}
              </>
            ) : (
              <p className="text-base text-muted-foreground">
                Выбери вариант ответа
              </p>
            )}
          </div>

          <div className="shrink-0">
            {!submitted ? (
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={selectedOption === null}
              >
                Ответить
              </Button>
            ) : (
              <Button size="lg" onClick={handleNext}>
                {isLast ? "Показать результат" : "Следующий вопрос"}
                <ArrowRightIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
