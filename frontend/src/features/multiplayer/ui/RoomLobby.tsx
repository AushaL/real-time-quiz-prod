import { useState } from "react";
import { CheckIcon, CopyIcon, PlayIcon, UsersIcon } from "lucide-react";
import type { IRoom, IRoomPlayer } from "@entities/room";
import { Button } from "@shared/ui";
import { Scoreboard } from "./Scoreboard";

export const RoomLobby = ({
  room,
  players,
  myId,
  isHost,
  onStart,
}: {
  room: IRoom;
  players: IRoomPlayer[];
  myId: string | null;
  isHost: boolean;
  onStart: () => void;
}) => {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  const canStart = isHost && players.length >= 2;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Комната ожидания</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Поделитесь кодом, чтобы другие игроки могли присоединиться.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Код комнаты</p>
            <p className="text-2xl font-bold tracking-[0.3em] text-foreground">
              {room.code}
            </p>
          </div>
          <Button size="icon-lg" variant="outline" onClick={copyCode}>
            {copied ? <CheckIcon className="size-5 text-emerald-600" /> : <CopyIcon className="size-5" />}
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <UsersIcon className="size-4" />
          <span>
            Игроков: {players.length} / {room.maxPlayers}
          </span>
        </div>

        <Button className="mt-5 w-full" size="lg" onClick={onStart} disabled={!canStart}>
          <PlayIcon className="size-4" />
          Начать игру
        </Button>
        {!canStart && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {isHost
              ? "Нужно минимум 2 игрока, чтобы начать"
              : "Ожидание, пока хост начнёт игру…"}
          </p>
        )}
      </div>

      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
          Участники
        </h3>
        <Scoreboard players={players} room={room} myId={myId} />
      </div>
    </div>
  );
};
