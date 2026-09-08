import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";
import { useQuizStore } from "../../stores/useQuizStore";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import QuizCard from "./QuizCard";

const PAGE_SIZE = 9;

function pluralize(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

const QuizList = () => {
  const { quizzes, isLoading, error, fetchQuizzes, filters } = useQuizStore();
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes, filters]);

  const totalPages = useMemo(
    () => Math.ceil(quizzes.length / PAGE_SIZE),
    [quizzes.length]
  );

  const currentQuizzes = useMemo(
    () => quizzes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [quizzes, page]
  );

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages || 1);
  }, [page, totalPages]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-border bg-muted/50"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
        <p className="text-base font-semibold text-foreground">
          Не удалось загрузить квизы
        </p>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <Button onClick={fetchQuizzes} variant="outline" size="sm">
          <RefreshCwIcon className="size-4" />
          Повторить
        </Button>
      </div>
    );
  }

  if (quizzes.length === 0) {
    const hasActiveFilters =
      filters.difficulty != null || filters.type != null || filters.mode != null;
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <Loader2Icon className="size-6 text-muted-foreground" />
        <p className="text-base font-semibold text-foreground">
          {hasActiveFilters ? "Ничего не нашлось" : "Квизов пока нет"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters
            ? "Под такие фильтры ничего не попало — попробуй ослабить условия."
            : "Загляни позже — скоро здесь появятся новые испытания."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {quizzes.length}{" "}
          {pluralize(quizzes.length, ["квиз", "квиза", "квизов"])}
        </p>

        {totalPages > 1 && (
          <nav
            aria-label="Пагинация"
            className="flex items-center gap-1"
          >
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Предыдущая страница"
            >
              <ChevronLeftIcon />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <Button
                key={pageNum}
                variant={pageNum === page ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => setPage(pageNum)}
                aria-current={pageNum === page ? "page" : undefined}
                aria-label={`Страница ${pageNum}`}
                className={cn(
                  "size-7 min-w-7 rounded-lg text-xs font-medium",
                  pageNum === page && "pointer-events-none"
                )}
              >
                {pageNum}
              </Button>
            ))}

            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Следующая страница"
            >
              <ChevronRightIcon />
            </Button>
          </nav>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {currentQuizzes.map((quiz) => (
          <QuizCard key={quiz._id} quiz={quiz} />
        ))}
      </div>
    </div>
  );
};

export default QuizList;
