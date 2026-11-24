import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, RefreshCwIcon } from "lucide-react";
import { useQuizStore } from "@entities/quiz";
import { Button } from "@shared/ui";
import { TopBar } from "@widgets/header";
import { QuizHeader, QuizStartCard, QuizPlayer } from "@features/quiz-play";
import { QuizSkeleton } from "@entities/quiz";

const QuizPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { currentQuiz, isLoading, error, fetchQuizById } = useQuizStore();
  // Keyed by quiz id instead of resetting state in an effect: navigating to a
  // different quiz automatically renders the start screen again.
  const [startedQuizId, setStartedQuizId] = useState<string | null>(null);
  const hasStarted = quizId != null && startedQuizId === quizId;

  useEffect(() => {
    if (quizId) fetchQuizById(quizId);
  }, [quizId, fetchQuizById]);

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
                    onStart={() => setStartedQuizId(quizId ?? null)}
                    onCreateRoom={() =>
                      quizId && navigate(`/quizzes/${quizId}/multiplayer`)
                    }
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
