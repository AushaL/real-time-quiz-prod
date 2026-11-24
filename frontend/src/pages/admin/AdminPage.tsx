import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowLeftIcon,
  LayoutDashboardIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  Trash2Icon,
} from "lucide-react";
import { TopBar } from "@widgets/header";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPortal,
  AlertDialogTitle,
} from "@shared/ui";
import { Button } from "@shared/ui";
import { useAdminStore, QuizForm, AdminQuizCard } from "@features/admin";
import type { IQuiz } from "@entities/quiz";
import { QuizFilters } from "@features/quiz-browse";

// Оценка высоты карточки (уточняется автоматически через measureElement)
const CARD_ESTIMATE = 96;
// Отступ между карточками (соответствует gap-3 = 12px)
const ITEM_GAP = 12;

const AdminPage = () => {
  const {
    isAdmin,
    checked,
    adminError,
    quizzes,
    isLoading,
    error,
    filters,
    checkAdmin,
    fetchQuizzes,
    setFilters,
    resetFilters,
    deleteQuiz,
  } = useAdminStore();

  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<IQuiz | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  useEffect(() => {
    if (isAdmin) fetchQuizzes();
  }, [isAdmin, fetchQuizzes, filters]);

  const hasActiveFilters =
    filters.difficulty != null ||
    filters.type != null ||
    filters.mode != null ||
    filters.sortBy != null;

  // Виртуализация списка квизов: рендерим только видимые карточки.
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const el = listRef.current;
      if (el) {
        setScrollMargin(el.getBoundingClientRect().top + window.scrollY);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [quizzes.length]);

  const virtualizer = useWindowVirtualizer({
    count: quizzes.length,
    getItemKey: (index) => quizzes[index]._id,
    estimateSize: () => CARD_ESTIMATE,
    gap: ITEM_GAP,
    overscan: 6,
    scrollMargin,
  });

  const openDeleteDialog = useCallback((id: string, title: string) => {
    setDeleteError(null);
    setQuizToDelete({ id, title });
  }, []);

  const openEditDialog = useCallback((quiz: IQuiz) => {
    setEditingQuiz(quiz);
    setShowForm(true);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingQuiz(null);
    setShowForm(true);
  }, []);

  const openOffline = useCallback(
    (quiz: IQuiz) => {
      navigate(`/admin/offline/${quiz._id}`);
    },
    [navigate],
  );

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingQuiz(null);
  }, []);

  const handleConfirmDelete = async () => {
    if (!quizToDelete || deleting) return;

    setDeleting(true);
    setDeleteError(null);
    const result = await deleteQuiz(quizToDelete.id);
    setDeleting(false);

    if (result.success) {
      setQuizToDelete(null);
      fetchQuizzes();
    } else {
      setDeleteError(result.message);
    }
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
            Эта страница доступна только администратору.
          </p>
          {adminError && (
            <p className="max-w-md break-words rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {adminError}
            </p>
          )}
          <Button size="lg" onClick={() => navigate("/")}>
            <ArrowLeftIcon className="size-4" />
            Вернуться на главную
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="p3-grid pointer-events-none absolute inset-0 opacity-60" />
      <TopBar />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 py-6">
        {showForm ? (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
                  {editingQuiz ? (
                    <PencilIcon className="size-5 text-accent" />
                  ) : (
                    <PlusIcon className="size-5 text-accent" />
                  )}
                  {editingQuiz ? "Редактирование квиза" : "Создание квиза"}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {editingQuiz
                    ? "Измени данные квиза и сохрани изменения."
                    : "Заполни поля, чтобы добавить новый квиз в общий список."}
                </p>
              </div>

              <Button variant="outline" onClick={closeForm}>
                <ArrowLeftIcon className="size-4" />
                Назад к списку
              </Button>
            </div>

            <QuizForm
              quiz={editingQuiz}
              onSuccess={() => {
                closeForm();
                fetchQuizzes();
              }}
            />
          </>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
                  <LayoutDashboardIcon className="size-5 text-accent" />
                  Панель администратора
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Управление квизами: просмотр, создание и удаление.
                </p>
              </div>

              <Button onClick={openCreateForm}>
                <PlusIcon className="size-4" />
                Создать квиз
              </Button>
            </div>

            <div className="mb-4">
              <QuizFilters
                filters={filters}
                setFilters={setFilters}
                resetFilters={resetFilters}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {quizzes.length} {quizzes.length === 1 ? "квиз" : "квизов"}
              </p>
              <Button variant="outline" size="sm" onClick={fetchQuizzes}>
                <RefreshCwIcon className="size-3.5" />
                Обновить
              </Button>
            </div>

            {isLoading ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-xl border border-border bg-muted/50"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center">
                <Loader2Icon className="size-6 text-muted-foreground" />
                <p className="text-base font-semibold text-foreground">
                  {hasActiveFilters ? "Ничего не нашлось" : "Квизов пока нет"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Под такие фильтры ничего не попало — попробуй ослабить условия."
                    : "Создай первый квиз, нажав «Создать квиз»."}
                </p>
              </div>
            ) : (
              <div
                ref={listRef}
                className="mt-4"
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                  width: "100%",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const quiz = quizzes[virtualItem.index];
                  return (
                    <div
                      key={virtualItem.key}
                      data-index={virtualItem.index}
                      ref={virtualizer.measureElement}
                      className="absolute left-0 top-0 w-full"
                      style={{
                        transform: `translateY(${
                          virtualItem.start - scrollMargin
                        }px)`,
                      }}
                    >
                      <AdminQuizCard
                        quiz={quiz}
                        onEdit={openEditDialog}
                        onDelete={openDeleteDialog}
                        onLaunchOffline={openOffline}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <AlertDialog
        open={quizToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setQuizToDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить квиз?</AlertDialogTitle>
              <AlertDialogDescription>
                Квиз «{quizToDelete?.title}» будет удалён безвозвратно. Это
                действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <Trash2Icon className="size-3.5" />
                )}
                {deleting ? "Удаление…" : "Удалить"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    </div>
  );
};

export default AdminPage;
