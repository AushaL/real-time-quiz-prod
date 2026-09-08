import {
  CheckCircle2Icon,
  ImageIcon,
  MusicIcon,
  TypeIcon,
  XCircleIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { QUESTION_TYPE_LABEL } from "../../lib/quiz";
import type { IQuestion } from "../../types";

const QUESTION_TYPE_ICON: Record<string, LucideIcon> = {
  text: TypeIcon,
  image: ImageIcon,
  audio: MusicIcon,
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export const QuizQuestionCard = ({
  question,
  selectedOption,
  submitted,
  onSelect,
}: {
  question: IQuestion;
  selectedOption: number | null;
  submitted: boolean;
  onSelect: (index: number) => void;
}) => {
  const QuestionIcon = QUESTION_TYPE_ICON[question.questionType] ?? TypeIcon;
  const typeLabel =
    QUESTION_TYPE_LABEL[question.questionType] ?? question.questionType;

  return (
    <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug text-foreground">
          {question.questionText}
        </h2>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <QuestionIcon className="size-3.5" />
          {typeLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-4 md:flex-row">
        {question.mediaUrl && (
          <div className="shrink-0 md:w-2/5">
            {question.questionType === "image" ? (
              <div className="flex max-h-56 w-full items-center justify-center rounded-xl border border-border bg-white p-4 sm:max-h-64">
                <img
                  src={question.mediaUrl}
                  alt={question.questionText}
                  className="max-h-48 max-w-full object-contain sm:max-h-56"
                />
              </div>
            ) : question.questionType === "audio" ? (
              <audio controls src={question.mediaUrl} className="w-full" />
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-3">
                <ImageIcon className="size-5 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs text-muted-foreground">
                  {question.mediaUrl}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2">
          {question.options.map((option, optionIndex) => {
            const isCorrectOption = optionIndex === question.correctAnswerIndex;
            const isSelected = optionIndex === selectedOption;

            return (
              <button
                key={optionIndex}
                type="button"
                disabled={submitted}
                onClick={() => onSelect(optionIndex)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-base transition-colors",
                  !submitted && "cursor-pointer",
                  !submitted &&
                    (isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-foreground hover:border-muted-foreground/40"),
                  submitted &&
                    isCorrectOption &&
                    "border-emerald-600/40 bg-emerald-600/10 text-emerald-700",
                  submitted &&
                    isSelected &&
                    !isCorrectOption &&
                    "border-destructive/40 bg-destructive/10 text-destructive",
                  submitted &&
                    !isCorrectOption &&
                    !isSelected &&
                    "border-border bg-background opacity-60"
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-md text-sm font-semibold",
                    submitted && isCorrectOption
                      ? "bg-emerald-600 text-white"
                      : submitted && isSelected && !isCorrectOption
                        ? "bg-destructive text-white"
                        : isSelected && !submitted
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                  )}
                >
                  {OPTION_LETTERS[optionIndex] ?? optionIndex + 1}
                </span>
                <span className="flex-1">{option}</span>
                {submitted && isCorrectOption && (
                  <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600" />
                )}
                {submitted && isSelected && !isCorrectOption && (
                  <XCircleIcon className="size-5 shrink-0 text-destructive" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
};
