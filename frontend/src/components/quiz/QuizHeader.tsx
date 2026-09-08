import {
  GaugeIcon,
  HelpCircleIcon,
  ListChecksIcon,
  TypeIcon,
  ZapIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { getDifficulty, MODE_LABEL, VARIANT_LABEL } from "../../lib/quiz";
import type { IQuiz } from "../../types";
import { StatTile } from "./StatTile";

export const QuizHeader = ({ quiz }: { quiz: IQuiz }) => {
  const difficulty = getDifficulty(quiz.difficulty);
  const isLive = quiz.mode === "live";

  return (
    <header className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ring-1",
            isLive
              ? "bg-accent/10 text-accent ring-accent/25"
              : "bg-muted text-muted-foreground ring-border"
          )}
        >
          {isLive && <ZapIcon className="size-3.5" />}
          {MODE_LABEL[quiz.mode] ?? quiz.mode}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1",
            difficulty.badge
          )}
        >
          {difficulty.label}
        </span>
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
          {VARIANT_LABEL[quiz.variant] ?? quiz.variant}
        </span>
      </div>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {quiz.title}
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{quiz.description}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={HelpCircleIcon}
          label="Вопросы"
          value={String(quiz.questions.length)}
        />
        <StatTile icon={GaugeIcon} label="Сложность" value={difficulty.label} />
        <StatTile
          icon={isLive ? ZapIcon : ListChecksIcon}
          label="Режим"
          value={MODE_LABEL[quiz.mode] ?? quiz.mode}
        />
        <StatTile
          icon={TypeIcon}
          label="Формат"
          value={VARIANT_LABEL[quiz.variant] ?? quiz.variant}
        />
      </div>
    </header>
  );
};
