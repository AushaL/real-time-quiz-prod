import { memo } from "react";
import { MonitorPlayIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@shared/ui";
import { cn } from "@shared/lib/utils";
import {
  getDifficulty,
  getQuizType,
  MODE_LABEL,
  QUIZ_TYPE_BADGE,
  QUIZ_TYPE_LABEL,
} from "@entities/quiz";
import type { IQuiz } from "@entities/quiz";

interface AdminQuizCardProps {
  quiz: IQuiz;
  onEdit: (quiz: IQuiz) => void;
  onDelete: (id: string, title: string) => void;
  onLaunchOffline: (quiz: IQuiz) => void;
}

const AdminQuizCard = ({
  quiz,
  onEdit,
  onDelete,
  onLaunchOffline,
}: AdminQuizCardProps) => {
  const difficulty = getDifficulty(quiz.difficulty);
  const quizType = getQuizType(quiz);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-foreground">
          {quiz.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
          {quiz.description}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1",
            QUIZ_TYPE_BADGE[quizType]
          )}
        >
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
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
          {MODE_LABEL[quiz.mode] ?? quiz.mode}
        </span>
        <span className="text-xs text-muted-foreground">
          {quiz.questions?.length ?? 0} вопр.
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onLaunchOffline(quiz)}
      >
        <MonitorPlayIcon className="size-3.5" />
        Офлайн
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(quiz)}
      >
        <PencilIcon className="size-3.5" />
        Изменить
      </Button>

      <Button
        variant="destructive"
        size="sm"
        onClick={() => onDelete(quiz._id, quiz.title)}
      >
        <Trash2Icon className="size-3.5" />
        Удалить
      </Button>
    </div>
  );
};

export default memo(AdminQuizCard);
