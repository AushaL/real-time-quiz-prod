import { MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "@shared/lib/utils";
import type { IOfflineTeam } from "@entities/team";

export const OfflineScoreboard = ({
  teams,
  showControls = false,
  onAdjust,
}: {
  teams: IOfflineTeam[];
  showControls?: boolean;
  onAdjust?: (id: string, delta: number) => void;
}) => {
  const sorted = [...teams].sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Команд пока нет
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((team, index) => (
        <div
          key={team.id}
          className={cn(
            "flex items-center gap-2.5 rounded-lg border px-3 py-2",
            index === 0
              ? "border-accent/40 bg-accent/5"
              : "border-border bg-card",
          )}
        >
          <span className="w-4 shrink-0 text-center text-sm font-semibold text-muted-foreground">
            {index + 1}
          </span>

          <span
            className="size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
            style={{ backgroundColor: team.color }}
          />

          <span className="flex-1 truncate text-sm font-medium text-foreground">
            {team.name.trim() || "Без названия"}
          </span>

          <span className="shrink-0 text-sm font-bold text-foreground">
            {team.score}
          </span>

          {showControls && onAdjust && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onAdjust(team.id, -1)}
                disabled={team.score <= 0}
                className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                aria-label="Снять очко"
              >
                <MinusIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onAdjust(team.id, 1)}
                className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Начислить очко"
              >
                <PlusIcon className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
