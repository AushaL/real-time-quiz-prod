import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon, RefreshCwIcon } from "lucide-react";
import { useQuizStore } from "../../stores/useQuizStore";
import { Button } from "../../components/ui/button";
import TopBar from "../../components/ui/TopBar";
import { QuizHeader } from "../../components/quiz/QuizHeader";
import { QuizStartCard } from "../../components/quiz/QuizStartCard";
import { QuizPlayer } from "../../components/quiz/QuizPlayer";
import { QuizSkeleton } from "../../components/quiz/QuizSkeleton";

const QuizPage = () => {
  const { quizId } = useParams();
  const { currentQuiz, isLoading, error, fetchQuizById } = useQuizStore();
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (quizId) fetchQuizById(quizId);
  }, [quizId, fetchQuizById]);

  useEffect(() => {
    setHasStarted(false);
  }, [quizId]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="p3-grid pointer-events-none absolute inset-0 opacity-60" />
      <TopBar />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 py-4 sm:py-6">
        {isLoading && <QuizSkeleton />}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center">
            <p className="text-lg font-semibold text-foreground">
              Не удалось загрузить квиз
            </p>
            <p className="max-w-md text-sm text-muted-foreground">{error}</p>
            <Button
              onClick={() => quizId && fetchQuizById(quizId)}
              variant="outline"
              size="sm"
            >
              <RefreshCwIcon className="size-4" />
              Повторить
            </Button>
          </div>
        )}

        {!isLoading && !error && currentQuiz && (
          <>
            <Link
              to="/"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" />
              Назад к квизам
            </Link>

            {!hasStarted ? (
              <>
                <QuizHeader quiz={currentQuiz} />
                <div className="mx-auto mt-8 w-full max-w-md">
                  <QuizStartCard
                    quiz={currentQuiz}
                    onStart={() => setHasStarted(true)}
                  />
                </div>
              </>
            ) : (
              <QuizPlayer quiz={currentQuiz} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default QuizPage;
