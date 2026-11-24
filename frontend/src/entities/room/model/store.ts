import { create } from "zustand";
import type { Socket } from "socket.io-client";
import { connectSocket, disconnectSocket } from "@shared/api/socket";
import type { IChatMessage, IReveal, IRoom, IRoomPlayer } from "./types";
import type { IQuestionPublic } from "@entities/quiz";

export interface ISocketAuth {
  token: string;
  /** Refreshes the Clerk token before a reconnect handshake. */
  getToken?: () => Promise<string | null>;
  userId: string;
  name?: string;
  avatarUrl?: string;
}

interface IRoomResponse {
  ok: boolean;
  message?: string;
  code?: string;
  room?: IRoom;
  players?: IRoomPlayer[];
  chat?: IChatMessage[];
  question?: IQuestionPublic;
  myAnswer?: number;
  reveal?: IReveal | null;
  result?: IRoomPlayer[];
}

interface IMultiplayerStore {
  connected: boolean;
  connecting: boolean;
  error: string | null;

  code: string | null;
  room: IRoom | null;
  players: IRoomPlayer[];
  chat: IChatMessage[];
  myId: string | null;

  currentQuestion: IQuestionPublic | null;
  currentIndex: number;
  total: number;
  reveal: IReveal | null;
  result: IRoomPlayer[] | null;

  myAnswer: number | null;
  hasAnswered: boolean;

  createRoom: (quizId: string, auth: ISocketAuth) => Promise<void>;
  joinRoom: (code: string, auth: ISocketAuth) => Promise<void>;
  startGame: () => void;
  selectOption: (index: number) => void;
  submitAnswer: () => void;
  sendChat: (text: string) => void;
  leave: () => void;
  reset: () => void;
}

type SetState = (updater: (state: IMultiplayerStore) => Partial<IMultiplayerStore>) => void;
type GetState = () => IMultiplayerStore;

let socket: Socket | null = null;

// Matches the backend's CHAT_LIMIT. Without a cap the client array grows for
// the whole session, while the server only keeps the last 100 messages.
const CHAT_LIMIT = 100;

function emptyRoomState() {
  return {
    connected: false,
    connecting: false,
    error: null,
    code: null,
    room: null,
    players: [] as IRoomPlayer[],
    chat: [] as IChatMessage[],
    myId: null,
    currentQuestion: null,
    currentIndex: 0,
    total: 0,
    reveal: null,
    result: null,
    myAnswer: null,
    hasAnswered: false,
  };
}

function applyRoom(res: IRoomResponse, set: SetState) {
  if (!res.room || !res.players) return;

  const room = res.room;
  const players = res.players;
  const chat = res.chat ?? [];
  const code = res.code ?? room.code;

  if (room.status === "lobby") {
    set(() => ({
      connected: true,
      connecting: false,
      error: null,
      code,
      room,
      players,
      chat,
      currentQuestion: null,
      currentIndex: 0,
      total: 0,
      reveal: null,
      result: null,
      myAnswer: null,
      hasAnswered: false,
    }));
    return;
  }

  set(() => ({
    connected: true,
    connecting: false,
    error: null,
    code,
    room,
    players,
    chat,
    currentIndex: room.currentQuestionIndex,
    total: room.total,
    ...(res.question !== undefined ? { currentQuestion: res.question } : {}),
    ...(res.reveal !== undefined ? { reveal: res.reveal } : {}),
    ...(res.result !== undefined ? { result: res.result } : {}),
    myAnswer: res.myAnswer ?? null,
    hasAnswered: res.myAnswer !== undefined && res.myAnswer !== null,
  }));
}

function bindSocket(s: Socket, set: SetState, get: GetState) {
  s.on("connect", () => {
    set(() => ({ connected: true, connecting: false }));

    // Reconnected after a deploy, a network drop or Vercel's connection cap:
    // take the same seat back and restore the current question.
    const code = get().code;
    if (!code) return;

    s.emit("room:join", { code }, (res: IRoomResponse) => {
      if (res?.ok) {
        applyRoom(res, set);
        return;
      }
      set(() => ({
        ...emptyRoomState(),
        error: res?.message ?? "Не удалось восстановить комнату",
      }));
    });
  });

  s.on("connect_error", () =>
    set(() => ({ connecting: false, error: "Не удалось подключиться к серверу" })),
  );

  s.on("room:update", (payload: { code: string; room: IRoom; players: IRoomPlayer[] }) => {
    set(() => ({
      code: payload.code,
      room: payload.room,
      players: payload.players,
    }));
  });

  s.on(
    "game:question",
    (payload: { index: number; question: IQuestionPublic; total: number }) => {
      set(() => ({
        currentIndex: payload.index,
        currentQuestion: payload.question,
        total: payload.total,
        reveal: null,
        result: null,
        myAnswer: null,
        hasAnswered: false,
      }));
    },
  );

  s.on("game:reveal", (payload: IReveal) => {
    set(() => ({ reveal: payload, players: payload.players }));
  });

  s.on("game:result", (payload: { players: IRoomPlayer[] }) => {
    set(() => ({ result: payload.players }));
  });

  s.on("chat:message", (message: IChatMessage) => {
    set((state) => ({
      chat: [...state.chat, message].slice(-CHAT_LIMIT),
    }));
  });

  s.on("disconnect", () => set(() => ({ connected: false })));
}

export const useMultiplayerStore = create<IMultiplayerStore>((set, get) => {
  const ensureSocket = (auth: ISocketAuth) => {
    if (!socket) {
      socket = connectSocket({
        token: auth.token,
        getToken: auth.getToken,
        name: auth.name,
        avatarUrl: auth.avatarUrl,
      });
      bindSocket(socket, set, get);
    }
    return socket;
  };

  return {
    ...emptyRoomState(),

    async createRoom(quizId, auth) {
      set(() => ({ connecting: true, error: null, myId: auth.userId }));
      const s = ensureSocket(auth);
      s.emit("room:create", { quizId }, (res: IRoomResponse) => {
        if (!res.ok) {
          set(() => ({ connecting: false, error: res.message ?? "Не удалось создать комнату" }));
          return;
        }
        applyRoom(res, set);
      });
    },

    async joinRoom(code, auth) {
      set(() => ({ connecting: true, error: null, myId: auth.userId }));
      const s = ensureSocket(auth);
      s.emit("room:join", { code }, (res: IRoomResponse) => {
        if (!res.ok) {
          set(() => ({ connecting: false, error: res.message ?? "Не удалось войти в комнату" }));
          return;
        }
        applyRoom(res, set);
      });
    },

    startGame() {
      socket?.emit("game:start", (res: { ok: boolean; message?: string }) => {
        if (!res?.ok) {
          set(() => ({ error: res?.message ?? "Не удалось начать игру" }));
        }
      });
    },

    selectOption(index) {
      if (get().hasAnswered) return;
      set(() => ({ myAnswer: index }));
    },

    submitAnswer() {
      const { myAnswer, currentIndex, hasAnswered } = get();
      if (myAnswer === null || hasAnswered) return;
      set(() => ({ hasAnswered: true }));
      socket?.emit("game:answer", { questionIndex: currentIndex, answerIndex: myAnswer });
    },

    sendChat(text) {
      socket?.emit("chat:send", { text });
    },

    leave() {
      socket?.emit("room:leave");
      disconnectSocket();
      socket = null;
      set(() => emptyRoomState());
    },

    reset() {
      set(() => emptyRoomState());
    },
  };
});
