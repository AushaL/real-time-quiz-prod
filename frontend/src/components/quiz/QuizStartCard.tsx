import { ListChecksIcon, PlayIcon, ZapIcon } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { getDifficulty, MODE_LABEL } from "../../lib/quiz";
import type { IQuiz } from "../../types";

export const QuizStartCard = ({
  quiz,
  onStart,
}: {
  quiz: IQuiz;
  onStart?: () => void;
}) => {
  const difficulty = getDifficulty(quiz.difficulty);
  const isLive = quiz.mode === "live";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold text-foreground">Начать игру</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Проверь себя против других игроков.
      </p>

      <div className="mt-4 flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Вопросов</span>
          <span className="font-semibold text-foreground">
            {quiz.questions.length}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Сложность</span>
          <span
            className={cn(
              "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1",
              difficulty.badge
            )}
          >
            {difficulty.label}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Режим</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            {isLive ? (
              <ZapIcon className="size-4 text-accent" />
            ) : (
              <ListChecksIcon className="size-4 text-muted-foreground" />
            )}
            {MODE_LABEL[quiz.mode] ?? quiz.mode}
          </span>
        </div>
      </div>

      <Button className="mt-5 w-full" size="lg" onClick={onStart}>
        <PlayIcon className="size-4" />
        Начать квиз
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Вопросы открываются по одному после каждого ответа
      </p>
    </div>
  );
};
