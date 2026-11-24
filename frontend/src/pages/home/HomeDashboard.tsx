import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/react";
import { LogInIcon } from "lucide-react";
import { QuizList, QuizFilters } from "@features/quiz-browse";
import { useQuizStore } from "@entities/quiz";
import { Button } from "@shared/ui";

const HomeDashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const filters = useQuizStore((s) => s.filters);
  const setFilters = useQuizStore((s) => s.setFilters);
  const resetFilters = useQuizStore((s) => s.resetFilters);
  const [code, setCode] = useState("");
  // Remount the list (and therefore its pagination) when filters change.
  const filterKey = [
    filters.difficulty,
    filters.type,
    filters.mode,
    filters.sortBy,
    filters.sortOrder,
  ].join("|");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim().toUpperCase();
    if (!value) return;
    navigate(`/join/${value}`);
  };

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            С возвращением,{" "}
            <span className="text-accent">{user?.firstName ?? "игрок"}</span> 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Выбери квиз и проверь свои знания.
          </p>
        </div>

        <QuizFilters
          filters={filters}
          setFilters={setFilters}
          resetFilters={resetFilters}
        />
      </div>

      <form
        onSubmit={handleJoin}
        className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-card p-2"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Код комнаты"
          maxLength={6}
          className="h-9 min-w-0 flex-1 rounded-lg bg-background px-3 text-sm uppercase tracking-widest outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <Button type="submit" disabled={!code.trim()}>
          <LogInIcon className="size-4" />
          Присоединиться
        </Button>
      </form>

      <QuizList key={filterKey} />
    </div>
  );
};

export default HomeDashboard;
