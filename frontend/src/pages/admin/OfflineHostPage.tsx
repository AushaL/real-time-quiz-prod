import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  Loader2Icon,
  MonitorPlayIcon,
  PlusIcon,
  ShieldAlertIcon,
  TrophyIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@shared/ui";
import { TopBar } from "@widgets/header";
import { QuizQuestionCard, QuizSkeleton, getDifficulty } from "@entities/quiz";
import { OfflineScoreboard } from "@features/offline";
import { useAdminStore } from "@features/admin";
import { TEAM_COLORS, useOfflineHostStore } from "@entities/team";
import { cn } from "@shared/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20";

const OfflineHostPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const { isAdmin, checked, checkAdmin } = useAdminStore();
  const {
    quiz,
    isLoading,
    error,
    status,
    currentIndex,
    revealed,
    teams,
    loadQuiz,
    reset,
    addTeam,
    removeTeam,
    renameTeam,
    setTeamColor,
    adjustScore,
    start,
    reveal,
    next,
    restart,
  } = useOfflineHostStore();

  // Команды, которым уже начислено очко за текущий вопрос.
  const [awarded, setAwarded] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  useEffect(() => {
    if (quizId) loadQuiz(quizId);
    return () => reset();
  }, [quizId, loadQuiz, reset]);

  const question = quiz?.questions[currentIndex] ?? null;
  const total = quiz?.questions.length ?? 0;
  const isLast = currentIndex >= total - 1;
  const difficulty = quiz ? getDifficulty(quiz.difficulty) : null;

  const canStart = teams.some((team) => team.name.trim() !== "");

  const handleNext = () => {
    setAwarded(new Set());
    next();
  };

  const handleAward = (id: string) => {
    if (awarded.has(id)) return;
    adjustScore(id, 1);
    setAwarded((prev) => new Set(prev).add(id));
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="p3-grid pointer-events-none absolute inset-0 opacity-60" />
        <TopBar />
        <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <ShieldAlertIcon className="size-12 text-destructive" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Доступ запрещён
          </h1>
          <p className="text-sm text-muted-foreground">
            Офлайн-режим доступен только администратору.
          </p>
          <Button size="lg" onClick={() => navigate("/admin")}>
            <ArrowLeftIcon className="size-4" />
            В админ-панель
          </Button>
        </main>
      </div>
    );
  }

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
              variant="outline"
              size="sm"
              onClick={() => quizId && loadQuiz(quizId)}
            >
              <Loader2Icon className="size-4" />
              Повторить
            </Button>
          </div>
        )}

        {!isLoading && !error && quiz && (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
                  <MonitorPlayIcon className="size-5 text-accent" />
                  Офлайн-режим
                </h1>
                <p className="mt-0.5 flex items-center gap-2 truncate text-sm text-muted-foreground">
                  {quiz.title}
                  {difficulty && (
                    <span className="inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-border">
                      {difficulty.label}
                    </span>
                  )}
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <ArrowLeftIcon className="size-4" />
                В админ-панель
              </Button>
            </div>

            {status === "setup" && (
              <div className="mx-auto w-full max-w-2xl">
                <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <UsersIcon className="size-5 text-accent" />
                    Команды
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Добавь команды из зала, выбери цвет и впиши названия. Очки
                    можно начислять прямо во время игры.
                  </p>

                  <div className="mt-5 flex flex-col gap-4">
                    {teams.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        Пока нет команд — добавь первую команду.
                      </div>
                    )}

                    {teams.map((team) => (
                      <div
                        key={team.id}
                        className="rounded-xl border border-border bg-background p-4"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-4 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                            style={{ backgroundColor: team.color }}
                          />
                          <input
                            className={inputClass}
                            value={team.name}
                            onChange={(e) => renameTeam(team.id, e.target.value)}
                            placeholder="Название команды"
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeTeam(team.id)}
                            aria-label="Удалить команду"
                          >
                            <XIcon className="size-4" />
                          </Button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          {TEAM_COLORS.map((color) => {
                            const active = team.color === color.hex;
                            return (
                              <button
                                key={color.id}
                                type="button"
                                title={color.label}
                                onClick={() => setTeamColor(team.id, color.hex)}
                                className={cn(
                                  "size-6 rounded-full transition-transform",
                                  active
                                    ? "scale-110 ring-2 ring-accent"
                                    : "ring-1 ring-inset ring-black/10 hover:scale-110",
                                )}
                                style={{ backgroundColor: color.hex }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={addTeam}>
                      <PlusIcon className="size-4" />
                      Добавить команду
                    </Button>
                    <Button
                      className="sm:flex-1"
                      size="lg"
                      disabled={!canStart}
                      onClick={start}
                    >
                      <MonitorPlayIcon className="size-4" />
                      Начать офлайн-квиз
                    </Button>
                  </div>

                  {!canStart && teams.length > 0 && (
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      Впиши название хотя бы одной команды, чтобы начать.
                    </p>
                  )}
                </div>
              </div>
            )}

            {status === "playing" && question && (
              <div className="grid w-full gap-6 lg:grid-cols-[1fr_20rem]">
                <div className="min-w-0">
                  <p className="mb-4 text-sm font-medium text-muted-foreground">
                    Вопрос{" "}
                    <span className="font-semibold text-foreground">
                      {currentIndex + 1}
                    </span>{" "}
                    из {total}
                  </p>

                  <QuizQuestionCard
                    question={question}
                    selectedOption={null}
                    submitted
                    revealCorrect={revealed}
                    correctAnswerIndex={question.correctAnswerIndex}
                    onSelect={() => {}}
                  />

                  <div className="mt-4 rounded-xl border border-border bg-card p-4 sm:p-5">
                    {!revealed ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                          Зачитай вопрос и варианты. Когда команды ответят —
                          покажи правильный ответ.
                        </p>
                        <Button size="lg" onClick={reveal}>
                          <EyeIcon className="size-4" />
                          Показать ответ
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {question.explanation && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">
                              Пояснение:{" "}
                            </span>
                            {question.explanation}
                          </p>
                        )}

                        <div>
                          <p className="mb-2 text-sm font-medium text-foreground">
                            Кто ответил верно? Нажми на команду, чтобы начислить
                            +1 очко.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {teams.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                Команд нет
                              </p>
                            )}
                            {teams.map((team) => {
                              const done = awarded.has(team.id);
                              return (
                                <button
                                  key={team.id}
                                  type="button"
                                  disabled={done}
                                  onClick={() => handleAward(team.id)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors",
                                    done
                                      ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-700"
                                      : "border-border bg-background hover:border-accent/40 hover:bg-accent/5",
                                  )}
                                >
                                  <span
                                    className="size-3 rounded-full ring-1 ring-inset ring-black/10"
                                    style={{ backgroundColor: team.color }}
                                  />
                                  {team.name.trim() || "Без названия"}
                                  {done && <CheckIcon className="size-3.5" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button size="lg" onClick={handleNext}>
                            {isLast ? "Подвести итоги" : "Следующий вопрос"}
                            <ArrowRightIcon className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <aside className="lg:sticky lg:top-24 lg:h-fit">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                      Табло
                    </h3>
                    <OfflineScoreboard
                      teams={teams}
                      showControls
                      onAdjust={adjustScore}
                    />
                  </div>
                </aside>
              </div>
            )}

            {status === "finished" && (
              <div className="mx-auto w-full max-w-xl">
                <div className="rounded-2xl border border-border bg-card p-8 text-center">
                  <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10">
                    <TrophyIcon className="size-8 text-primary" />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                    Итоги по командам
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {quiz.title}
                  </p>

                  <div className="mt-6 text-left">
                    <OfflineScoreboard teams={teams} />
                  </div>

                  <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="sm:flex-1"
                      size="lg"
                      onClick={() => navigate("/admin")}
                    >
                      <ArrowLeftIcon className="size-4" />
                      В админ-панель
                    </Button>
                    <Button variant="outline" size="lg" onClick={restart}>
                      <MonitorPlayIcon className="size-4" />
                      Заново
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default OfflineHostPage;
