import { create } from "zustand";
import { axiosInstance } from "@shared/api/axios";
import { apiErrorMessage } from "@shared/api/errors";
import type { IQuiz } from "@entities/quiz";
import type { IOfflineTeam } from "./types";
import { TEAM_COLORS } from "./constants";

export type OfflineStatus = "setup" | "playing" | "finished";

interface IOfflineHostStore {
  quiz: IQuiz | null;
  isLoading: boolean;
  error: string | null;
  status: OfflineStatus;
  currentIndex: number;
  revealed: boolean;
  teams: IOfflineTeam[];

  loadQuiz: (id: string) => Promise<void>;
  reset: () => void;
  addTeam: () => void;
  removeTeam: (id: string) => void;
  renameTeam: (id: string, name: string) => void;
  setTeamColor: (id: string, color: string) => void;
  adjustScore: (id: string, delta: number) => void;
  start: () => void;
  reveal: () => void;
  next: () => void;
  restart: () => void;
}

const newId = () =>
  `team-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// Автоматически подбираем первый свободный цвет для новой команды.
const nextColor = (teams: IOfflineTeam[]) => {
  const used = new Set(teams.map((team) => team.color));
  const free = TEAM_COLORS.find((color) => !used.has(color.hex));
  return (free ?? TEAM_COLORS[teams.length % TEAM_COLORS.length]).hex;
};

export const useOfflineHostStore = create<IOfflineHostStore>((set, get) => ({
  quiz: null,
  isLoading: false,
  error: null,
  status: "setup",
  currentIndex: 0,
  revealed: false,
  teams: [],

  async loadQuiz(id) {
    set({ isLoading: true, error: null, quiz: null });
    try {
      const response = await axiosInstance.get(`/api/quizzes/${id}`);
      set({ quiz: response.data });
    } catch (error) {
      set({ error: apiErrorMessage(error, "Не удалось загрузить квиз") });
    } finally {
      set({ isLoading: false });
    }
  },

  reset() {
    set({
      quiz: null,
      isLoading: false,
      error: null,
      status: "setup",
      currentIndex: 0,
      revealed: false,
      teams: [],
    });
  },

  addTeam() {
    const team: IOfflineTeam = {
      id: newId(),
      name: "",
      color: nextColor(get().teams),
      score: 0,
    };
    set((state) => ({ teams: [...state.teams, team] }));
  },

  removeTeam(id) {
    set((state) => ({ teams: state.teams.filter((team) => team.id !== id) }));
  },

  renameTeam(id, name) {
    set((state) => ({
      teams: state.teams.map((team) =>
        team.id === id ? { ...team, name } : team,
      ),
    }));
  },

  setTeamColor(id, color) {
    set((state) => ({
      teams: state.teams.map((team) =>
        team.id === id ? { ...team, color } : team,
      ),
    }));
  },

  adjustScore(id, delta) {
    set((state) => ({
      teams: state.teams.map((team) =>
        team.id === id
          ? { ...team, score: Math.max(0, team.score + delta) }
          : team,
      ),
    }));
  },

  start() {
    set({ status: "playing", currentIndex: 0, revealed: false });
  },

  reveal() {
    set({ revealed: true });
  },

  next() {
    const { quiz, currentIndex } = get();
    const total = quiz?.questions.length ?? 0;
    if (currentIndex >= total - 1) {
      set({ status: "finished" });
    } else {
      set({ currentIndex: currentIndex + 1, revealed: false });
    }
  },

  restart() {
    set((state) => ({
      status: "setup",
      currentIndex: 0,
      revealed: false,
      teams: state.teams.map((team) => ({ ...team, score: 0 })),
    }));
  },
}));
