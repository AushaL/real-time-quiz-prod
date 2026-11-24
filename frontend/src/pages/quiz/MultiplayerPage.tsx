import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/react";
import { TopBar } from "@widgets/header";
import { RoomView } from "@features/multiplayer";
import { useMultiplayerStore } from "@entities/room";

const MultiplayerPage = () => {
  const { quizId } = useParams();
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const createRoom = useMultiplayerStore((s) => s.createRoom);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !isLoaded || !user || !quizId) return;
    initialized.current = true;

    (async () => {
      const token = await getToken();
      if (!token) return;
      await createRoom(quizId, {
        token,
        getToken,
        userId: user.id,
        name: user.fullName ?? undefined,
        avatarUrl: user.imageUrl ?? undefined,
      });
    })();
  }, [isLoaded, user, quizId, getToken, createRoom]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="p3-grid pointer-events-none absolute inset-0 opacity-60" />
      <TopBar />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 py-4 sm:py-6">
        <RoomView />
      </main>
    </div>
  );
};

export default MultiplayerPage;
