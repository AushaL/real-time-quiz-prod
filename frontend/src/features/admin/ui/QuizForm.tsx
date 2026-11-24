import { useState } from "react";
import {
  ImageIcon,
  Loader2Icon,
  MusicIcon,
  PlusIcon,
  SaveIcon,
  TypeIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@shared/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/ui";
import { cn } from "@shared/lib/utils";
import { uploadQuizMedia } from "@shared/api/cloudinary";
import { DIFFICULTY, DIFFICULTY_QUESTIONS } from "@entities/quiz";
import {
  useAdminStore,
  type AdminQuestionInput,
} from "../model/useAdminStore";
import type { IQuestion, IQuiz } from "@entities/quiz";

type QuestionType = "text" | "image" | "audio";

interface QuestionDraft {
  questionText: string;
  questionType: QuestionType;
  mediaUrl?: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  file: File | null;
}

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string; icon: typeof TypeIcon }[] = [
  { value: "text", label: "Текст", icon: TypeIcon },
  { value: "image", label: "Картинка", icon: ImageIcon },
  { value: "audio", label: "Аудио", icon: MusicIcon },
];

const MODE_OPTIONS = [
  { value: "classic", label: "Классика" },
  { value: "live", label: "Live" },
  { value: "offline", label: "Офлайн" },
];

const emptyQuestion = (): QuestionDraft => ({
  questionText: "",
  questionType: "text",
  mediaUrl: undefined,
  options: ["", "", "", ""],
  correctAnswerIndex: 0,
  explanation: "",
  file: null,
});

const questionFromQuiz = (question: IQuestion): QuestionDraft => ({
  questionText: question.questionText,
  questionType: (question.questionType as QuestionType) ?? "text",
  mediaUrl: question.mediaUrl,
  options: question.options ?? [],
  correctAnswerIndex: question.correctAnswerIndex ?? 0,
  explanation: question.explanation ?? "",
  file: null,
});

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20";

const labelClass =
  "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

const QuizForm = ({
  quiz,
  onSuccess,
}: {
  quiz?: IQuiz | null;
  onSuccess: () => void;
}) => {
  const createQuiz = useAdminStore((s) => s.createQuiz);
  const updateQuiz = useAdminStore((s) => s.updateQuiz);

  const [title, setTitle] = useState(quiz?.title ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [difficulty, setDifficulty] = useState<number>(quiz?.difficulty ?? 1);
  const [variant, setVariant] = useState(quiz?.variant ?? "multiple_choice");
  const [mode, setMode] = useState(quiz?.mode ?? "classic");
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => {
    if (quiz) {
      const count =
        DIFFICULTY_QUESTIONS[quiz.difficulty] ?? quiz.questions.length;
      return Array.from({ length: count }, (_, i) =>
        quiz.questions[i] ? questionFromQuiz(quiz.questions[i]) : emptyQuestion()
      );
    }
    return Array.from({ length: DIFFICULTY_QUESTIONS[1] }, () => emptyQuestion());
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDifficultyChange = (value: number) => {
    setDifficulty(value);
    setQuestions((prev) => {
      const count = DIFFICULTY_QUESTIONS[value];
      return Array.from({ length: count }, (_, i) => prev[i] ?? emptyQuestion());
    });
  };

  const updateQuestion = (index: number, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) }
          : q
      )
    );
  };

  const addOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: [...q.options, ""] } : q
      )
    );
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const options = q.options.filter((_, j) => j !== oIndex);
        const correctAnswerIndex =
          q.correctAnswerIndex === oIndex
            ? 0
            : q.correctAnswerIndex > oIndex
              ? q.correctAnswerIndex - 1
              : q.correctAnswerIndex;
        return { ...q, options, correctAnswerIndex };
      })
    );
  };

  const validate = (): string | null => {
    if (!title.trim()) return "Введите название квиза";
    if (!description.trim()) return "Введите описание квиза";

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const num = i + 1;

      if (!q.questionText.trim()) return `Вопрос ${num}: введите текст вопроса`;
      if (q.options.length < 2) return `Вопрос ${num}: нужно минимум 2 варианта ответа`;
      if (q.options.some((o) => o.trim() === ""))
        return `Вопрос ${num}: заполните все варианты ответа`;
      if (q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length)
        return `Вопрос ${num}: выберите правильный ответ`;
      if (
        (q.questionType === "image" || q.questionType === "audio") &&
        !q.file &&
        !q.mediaUrl
      )
        return `Вопрос ${num}: прикрепите файл (${
          q.questionType === "image" ? "картинку" : "аудио"
        })`;
    }

    return null;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    setError(null);
    setStatus("Подготовка…");

    try {
      // Files go browser -> Cloudinary directly; only the resulting URLs are
      // sent to the API. This keeps requests under Vercel's 4.5 MB body limit.
      const payload: AdminQuestionInput[] = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let mediaUrl = q.mediaUrl;
        let mediaPublicId: string | undefined;

        const needsMedia = q.questionType === "image" || q.questionType === "audio";
        if (needsMedia && q.file) {
          setStatus(`Загрузка файла ${i + 1} из ${questions.length}…`);
          const uploaded = await uploadQuizMedia(q.file);
          mediaUrl = uploaded.url;
          mediaPublicId = uploaded.publicId;
        }

        payload.push({
          questionText: q.questionText,
          questionType: q.questionType,
          ...(mediaUrl ? { mediaUrl } : {}),
          ...(mediaPublicId ? { mediaPublicId } : {}),
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation,
        });
      }

      setStatus("Сохранение…");
      const input = {
        title,
        description,
        difficulty,
        variant,
        mode,
        questions: payload,
      };

      const result = quiz
        ? await updateQuiz(quiz._id, input)
        : await createQuiz(input);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.message);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (submitError) {
      setError(errorMessage(submitError));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
      setStatus(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{quiz ? "Редактирование квиза" : "Новый квиз"}</CardTitle>
          <CardDescription>
            Заполни основные данные. Количество вопросов определяется сложностью.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Название</label>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Столицы мира"
              />
            </div>
            <div>
              <label className={labelClass}>Описание</label>
              <input
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Короткое описание квиза"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Сложность</label>
              <select
                className={inputClass}
                value={difficulty}
                onChange={(e) => handleDifficultyChange(Number(e.target.value))}
              >
                {DIFFICULTY.map((item, index) => (
                  <option key={index + 1} value={index + 1}>
                    {item.label} · {DIFFICULTY_QUESTIONS[index + 1]} вопросов
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Вариант</label>
              <select
                className={inputClass}
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
              >
                <option value="multiple_choice">Тест (одиночный выбор)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Режим</label>
              <select
                className={inputClass}
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                {MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {questions.map((question, qIndex) => (
        <Card key={qIndex}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Вопрос {qIndex + 1}</CardTitle>
              <div className="flex items-center gap-1.5">
                {QUESTION_TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = question.questionType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateQuestion(qIndex, { questionType: option.value })
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="size-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Текст вопроса</label>
              <input
                className={inputClass}
                value={question.questionText}
                onChange={(e) =>
                  updateQuestion(qIndex, { questionText: e.target.value })
                }
                placeholder="Введите вопрос"
              />
            </div>

            {(question.questionType === "image" ||
              question.questionType === "audio") && (
              <div>
                <label className={labelClass}>
                  Файл{" "}
                  {question.questionType === "image" ? "изображения" : "аудио"}
                </label>
                {question.mediaUrl && !question.file && (
                  <div className="mb-2 flex items-center gap-3">
                    {question.questionType === "image" ? (
                      <img
                        src={question.mediaUrl}
                        alt="Текущее изображение"
                        className="h-16 w-16 rounded-lg object-cover ring-1 ring-border"
                      />
                    ) : (
                      <span className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                        Аудиофайл загружен
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Файл уже загружен — прикрепите новый, чтобы заменить.
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept={
                      question.questionType === "image" ? "image/*" : "audio/*"
                    }
                    onChange={(e) =>
                      updateQuestion(qIndex, {
                        file: e.target.files?.[0] ?? null,
                      })
                    }
                    className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/70"
                  />
                  {question.file && (
                    <span className="truncate text-xs text-muted-foreground">
                      {question.file.name}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div>
              <span className={labelClass}>Варианты ответа</span>
              <div className="flex flex-col gap-2">
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q-${qIndex}-correct`}
                      checked={question.correctAnswerIndex === oIndex}
                      onChange={() =>
                        updateQuestion(qIndex, { correctAnswerIndex: oIndex })
                      }
                      className="size-4 shrink-0 accent-[var(--accent)]"
                      title="Отметить как правильный ответ"
                    />
                    <input
                      className={inputClass}
                      value={option}
                      onChange={(e) =>
                        updateOption(qIndex, oIndex, e.target.value)
                      }
                      placeholder={`Вариант ${oIndex + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeOption(qIndex, oIndex)}
                      disabled={question.options.length <= 2}
                      aria-label="Удалить вариант"
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => addOption(qIndex)}
              >
                <PlusIcon className="size-3.5" />
                Добавить вариант
              </Button>
            </div>

            <div>
              <label className={labelClass}>Пояснение (необязательно)</label>
              <textarea
                className={cn(inputClass, "min-h-20 resize-y")}
                value={question.explanation}
                onChange={(e) =>
                  updateQuestion(qIndex, { explanation: e.target.value })
                }
                placeholder="Почему этот ответ правильный"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SaveIcon className="size-4" />
          )}
          {submitting
            ? status ?? "Сохранение…"
            : quiz
              ? "Сохранить изменения"
              : "Создать квиз"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Вопросов: {questions.length}
        </span>
      </div>
    </form>
  );
};

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: unknown } } }
    ).response;
    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }

  return error instanceof Error ? error.message : "Не удалось сохранить квиз";
}

export default QuizForm;
