import type { ReactNode } from "react";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { DIFFICULTY, MODE_LABEL, QUIZ_TYPE_LABEL } from "../../lib/quiz";
import {
  useQuizStore,
  type IQuizFilters,
  type QuizSortBy,
  type QuizSortOrder,
} from "../../stores/useQuizStore";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "text", label: QUIZ_TYPE_LABEL.text },
  { value: "image", label: QUIZ_TYPE_LABEL.image },
  { value: "audio", label: QUIZ_TYPE_LABEL.audio },
];

const MODE_OPTIONS: { value: string; label: string }[] = [
  { value: "classic", label: MODE_LABEL.classic },
  { value: "live", label: MODE_LABEL.live },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "difficulty:asc", label: "Сложность ↑" },
  { value: "difficulty:desc", label: "Сложность ↓" },
  { value: "createdAt:asc", label: "Сначала старые" },
  { value: "createdAt:desc", label: "Сначала новые" },
];

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="relative inline-flex">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-8 cursor-pointer appearance-none rounded-lg border border-border bg-background pl-2.5 pr-8 text-sm text-foreground outline-none transition-colors hover:border-accent/40 focus:border-accent focus:ring-2 focus:ring-accent/20",
          )}
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  );
}

const QuizFilters = () => {
  const filters = useQuizStore((s) => s.filters);
  const setFilters = useQuizStore((s) => s.setFilters);
  const resetFilters = useQuizStore((s) => s.resetFilters);

  const difficultyValue =
    filters.difficulty != null ? String(filters.difficulty) : "";
  const sortValue = filters.sortBy ? `${filters.sortBy}:${filters.sortOrder}` : "";

  const hasActiveFilters =
    filters.difficulty != null ||
    filters.type != null ||
    filters.mode != null ||
    filters.sortBy != null;

  const handleSortChange = (value: string) => {
    if (!value) {
      setFilters({ sortBy: null, sortOrder: "desc" });
      return;
    }
    const [sortBy, sortOrder] = value.split(":") as [QuizSortBy, QuizSortOrder];
    setFilters({ sortBy, sortOrder });
  };

  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
      <Select
        label="Сложность"
        value={difficultyValue}
        onChange={(value) =>
          setFilters({ difficulty: value ? Number(value) : null })
        }
      >
        <option value="">Все</option>
        {DIFFICULTY.map((item, index) => (
          <option key={index + 1} value={String(index + 1)}>
            {item.label}
          </option>
        ))}
      </Select>

      <Select
        label="Тип"
        value={filters.type ?? ""}
        onChange={(value) =>
          setFilters({ type: (value || null) as IQuizFilters["type"] })
        }
      >
        <option value="">Все</option>
        {TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select
        label="Режим"
        value={filters.mode ?? ""}
        onChange={(value) =>
          setFilters({ mode: (value || null) as IQuizFilters["mode"] })
        }
      >
        <option value="">Все</option>
        {MODE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select label="Сортировка" value={sortValue} onChange={handleSortChange}>
        <option value="">Без сортировки</option>
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-3.5" />
          Сбросить
        </button>
      )}
    </div>
  );
};

export default QuizFilters;
