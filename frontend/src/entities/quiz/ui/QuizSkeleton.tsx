export const QuizSkeleton = () => (
  <div className="flex flex-col gap-4">
    <div className="h-5 w-40 animate-pulse rounded bg-muted/60" />
    <div className="h-44 animate-pulse rounded-2xl border border-border bg-muted/50" />
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl border border-border bg-muted/50"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/50" />
    </div>
  </div>
);
