import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  HelpCircleIcon,
  ImageIcon,
  ListChecksIcon,
  MusicIcon,
  TypeIcon,
  ZapIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  getDifficulty,
  getQuizType,
  MODE_LABEL,
  QUIZ_TYPE_BADGE,
  QUIZ_TYPE_LABEL,
} from "../../lib/quiz";
import type { IQuiz } from "../../types";

const TYPE_ICON = {
  text: TypeIcon,
  image: ImageIcon,
  audio: MusicIcon,
} as const;

const QuizCard = ({ quiz }: { quiz: IQuiz }) => {
  const isLive = quiz.mode === "live";
  const difficulty = getDifficulty(quiz.difficulty);
  const quizType = getQuizType(quiz);
  const TypeIcon = TYPE_ICON[quizType as keyof typeof TYPE_ICON] ?? TYPE_ICON.text;
  const questionCount = quiz.questions?.length ?? 0;

  return (
    <Link
      to={`/quizzes/${quiz._id}`}
      className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-lg ring-1",
            isLive
              ? "bg-accent/10 text-accent ring-accent/25"
              : "bg-muted text-muted-foreground ring-border"
          )}
        >
          {isLive ? (
            <ZapIcon className="size-4" />
          ) : (
            <ListChecksIcon className="size-4" />
          )}
        </span>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ring-1",
            isLive
              ? "bg-accent/10 text-accent ring-accent/25"
              : "bg-muted text-muted-foreground ring-border"
          )}
        >
          {isLive && (
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
          )}
          {MODE_LABEL[quiz.mode] ?? quiz.mode}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground">
          {quiz.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {quiz.description}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1",
            QUIZ_TYPE_BADGE[quizType]
          )}
        >
          <TypeIcon className="size-3.5" />
          {QUIZ_TYPE_LABEL[quizType] ?? quizType}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1",
            difficulty.badge
          )}
        >
          {difficulty.label}
        </span>
        <div className="flex items-center gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-1.5 rounded-full",
                i < quiz.difficulty ? difficulty.dot : "bg-border"
              )}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <HelpCircleIcon className="size-3.5" />
          {questionCount} {questionCount === 1 ? "вопрос" : "вопросов"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors group-hover:text-primary">
          Начать
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
};

export default QuizCard;
