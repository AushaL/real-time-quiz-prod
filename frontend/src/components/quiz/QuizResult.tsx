import {
  CheckCircle2Icon,
  RotateCcwIcon,
  TrophyIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "../ui/button";

function getVerdict(correct: number, total: number) {
  const ratio = total === 0 ? 0 : correct / total;

  if (ratio === 1) {
    return {
      title: "Идеально!",
      text: "Безупречный результат — ни одной ошибки.",
    };
  }
  if (ratio >= 0.75) {
    return {
      title: "Отличный результат!",
      text: "Вы отлично справились с квизом.",
    };
  }
  if (ratio >= 0.5) {
    return {
      title: "Неплохо!",
      text: "Хороший результат, но есть куда расти.",
    };
  }
  return {
    title: "Стоит попробовать ещё раз",
    text: "Не расстраивайтесь — практика приведёт к успеху.",
  };
}

export const QuizResult = ({
  correct,
  wrong,
  total,
  onRestart,
}: {
  correct: number;
  wrong: number;
  total: number;
  onRestart: () => void;
}) => {
  const percentage = total === 0 ? 0 : Math.round((correct / total) * 100);
  const verdict = getVerdict(correct, total);

  return (
    <div className="mx-auto mt-8 w-full max-w-xl">
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10">
          <TrophyIcon className="size-8 text-primary" />
        </div>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
          {verdict.title}
        </h2>
        <p className="mt-2 text-muted-foreground">{verdict.text}</p>

        <p className="mt-6 text-5xl font-bold text-foreground">
          {correct}
          <span className="text-2xl text-muted-foreground">/{total}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {percentage}% правильных ответов
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-600/20 bg-emerald-600/10 p-4">
            <div className="flex items-center justify-center gap-1.5 text-emerald-600">
              <CheckCircle2Icon className="size-4" />
              <span className="text-sm font-medium">Правильных</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{correct}</p>
          </div>
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4">
            <div className="flex items-center justify-center gap-1.5 text-destructive">
              <XCircleIcon className="size-4" />
              <span className="text-sm font-medium">Неправильных</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-destructive">{wrong}</p>
          </div>
        </div>

        <Button className="mt-6" size="lg" onClick={onRestart}>
          <RotateCcwIcon className="size-4" />
          Пройти квиз ещё раз
        </Button>
      </div>
    </div>
  );
};
