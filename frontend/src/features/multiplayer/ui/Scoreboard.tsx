import { CrownIcon, WifiOffIcon } from "lucide-react";
import { cn } from "@shared/lib/utils";
import type { IRoom, IRoomPlayer } from "@entities/room";

export const Scoreboard = ({
  players,
  room,
  myId,
}: {
  players: IRoomPlayer[];
  room: IRoom;
  myId: string | null;
}) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((player, index) => (
        <div
          key={player.id}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2",
            player.id === myId
              ? "border-primary/40 bg-primary/5"
              : "border-border bg-card",
          )}
        >
          <span className="w-5 shrink-0 text-center text-sm font-semibold text-muted-foreground">
            {index + 1}
          </span>

          <div className="relative">
            {player.avatarUrl ? (
              <img
                src={player.avatarUrl}
                alt={player.name}
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <span className="grid size-8 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                {player.name.charAt(0).toUpperCase()}
              </span>
            )}
            {!player.connected && (
              <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-background text-muted-foreground">
                <WifiOffIcon className="size-3" />
              </span>
            )}
          </div>

          <span className="flex-1 truncate text-sm font-medium text-foreground">
            {player.name}
            {player.id === myId && (
              <span className="ml-1 text-xs text-muted-foreground">(вы)</span>
            )}
          </span>

          {room.hostId === player.id && (
            <CrownIcon className="size-4 shrink-0 text-accent" />
          )}

          <span className="shrink-0 text-sm font-bold text-foreground">
            {player.score}
          </span>
        </div>
      ))}
    </div>
  );
};
