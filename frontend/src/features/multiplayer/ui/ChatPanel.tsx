import { useEffect, useRef, useState } from "react";
import { SendIcon } from "lucide-react";
import { cn } from "@shared/lib/utils";
import type { IChatMessage } from "@entities/room";
import { Button } from "@shared/ui";

export const ChatPanel = ({
  messages,
  myId,
  onSend,
}: {
  messages: IChatMessage[];
  myId: string | null;
  onSend: (text: string) => void;
}) => {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto px-1 py-2">
        {messages.length === 0 && (
          <p className="px-2 text-center text-xs text-muted-foreground">
            Сообщений пока нет — напишите первым!
          </p>
        )}
        {messages.map((message, index) => {
          const isMine = message.playerId === myId;
          return (
            <div
              key={`${message.createdAt}-${index}`}
              className={cn("flex flex-col", isMine ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-1.5 text-sm",
                  isMine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {!isMine && (
                  <p className="mb-0.5 text-xs font-semibold text-accent">
                    {message.name}
                  </p>
                )}
                <p className="break-words">{message.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border pt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение…"
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring"
        />
        <Button type="submit" size="icon" disabled={!text.trim()}>
          <SendIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
};
