import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon, Loader, TrophyIcon } from "lucide-react";
import { useMultiplayerStore } from "@entities/room";
import { Button } from "@shared/ui";
import { QuizQuestionCard } from "@entities/quiz";
import { RoomLobby } from "./RoomLobby";
import { Scoreboard } from "./Scoreboard";
import { ChatPanel } from "./ChatPanel";

export const RoomView = () => {
  const navigate = useNavigate();
  const {
    connecting,
    error,
    room,
    players,
    chat,
    myId,
    currentQuestion,
    currentIndex,
    total,
    reveal,
    result,
    myAnswer,
    hasAnswered,
    startGame,
    selectOption,
    submitAnswer,
    sendChat,
    leave,
  } = useMultiplayerStore();

  const isHost = room?.hostId === myId;

  // Покидаем комнату при размонтировании.
  useEffect(() => {
    return () => leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (connecting && !room) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Подключение к комнате…</p>
        </div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-foreground">Не удалось войти</p>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          На главную
        </Button>
      </div>
    );
  }

  if (!room) return null;

  const renderMain = () => {
    if (room.status === "lobby") {
      return (
        <RoomLobby
          room={room}
          players={players}
          myId={myId}
          isHost={isHost}
          onStart={startGame}
        />
      );
    }

    if (room.status === "playing" && currentQuestion) {
      if (reveal) {
        return (
          <div className="mx-auto w-full max-w-4xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Вопрос{" "}
                <span className="font-semibold text-foreground">{currentIndex + 1}</span>{" "}
                из {total}
              </p>
            </div>

            <QuizQuestionCard
              question={currentQuestion}
              selectedOption={myAnswer}
              submitted
              revealCorrect
              correctAnswerIndex={reveal.correctIndex}
              onSelect={() => {}}
            />

            {reveal.explanation && (
              <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Пояснение: </span>
                {reveal.explanation}
              </p>
            )}

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {reveal.isLast
                ? "Подводим итоги…"
                : "Следующий вопрос откроется через пару секунд…"}
            </p>
          </div>
        );
      }

      return (
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Вопрос{" "}
              <span className="font-semibold text-foreground">{currentIndex + 1}</span>{" "}
              из {total}
            </p>
          </div>

          <QuizQuestionCard
            question={currentQuestion}
            selectedOption={myAnswer}
            submitted={hasAnswered}
            revealCorrect={false}
            onSelect={selectOption}
          />

          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
            {hasAnswered ? (
              <p className="text-sm text-muted-foreground">
                Ответ отправлен. Ожидание других игроков…
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Выбери вариант ответа</p>
            )}
            <Button size="lg" onClick={submitAnswer} disabled={myAnswer === null || hasAnswered}>
              Ответить
            </Button>
          </div>
        </div>
      );
    }

    // finished / result
    return (
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10">
            <TrophyIcon className="size-8 text-primary" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            Игра завершена!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Итоговая таблица результатов
          </p>

          <div className="mt-6">
            <Scoreboard players={result ?? players} room={room} myId={myId} />
          </div>

          <Button className="mt-6 w-full" size="lg" onClick={() => navigate("/")}>
            <ArrowLeftIcon className="size-4" />
            Вернуться к квизам
          </Button>
        </div>
      </div>
    );
  };

  const inGame = room.status === "playing";

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">{renderMain()}</div>

      <aside className="flex h-[calc(100vh-8rem)] min-h-0 flex-col gap-4 lg:sticky lg:top-24">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            {inGame ? "Счёт" : "Участники"}
          </h3>
          <Scoreboard players={players} room={room} myId={myId} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card p-3">
          <h3 className="mb-1 px-1 text-sm font-semibold text-muted-foreground">
            Чат
          </h3>
          <ChatPanel messages={chat} myId={myId} onSend={sendChat} />
        </div>
      </aside>
    </div>
  );
};
