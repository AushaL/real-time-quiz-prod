import { useUser } from "@clerk/react";
import QuizList from "../../layout/components/QuizList";
import QuizFilters from "../../layout/components/QuizFilters";

const HomeDashboard = () => {
  const { user } = useUser();

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

        <QuizFilters />
      </div>

      <QuizList />
    </div>
  );
};

export default HomeDashboard;
