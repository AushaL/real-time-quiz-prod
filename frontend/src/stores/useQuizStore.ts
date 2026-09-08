import { axiosInstance } from "../lib/axios";
import type { IQuiz } from "../types";
import { create } from "zustand";

export type QuizSortBy = "difficulty" | "createdAt";
export type QuizSortOrder = "asc" | "desc";

export interface IQuizFilters {
  difficulty: number | null;
  type: "text" | "image" | "audio" | null;
  mode: "classic" | "live" | null;
  sortBy: QuizSortBy | null;
  sortOrder: QuizSortOrder;
}

interface IQuizStore {
  quizzes: IQuiz[];
  currentQuiz: IQuiz | null;
  isLoading: boolean;
  error: string | null;
  filters: IQuizFilters;

  setFilters: (filters: Partial<IQuizFilters>) => void;
  resetFilters: () => void;
  fetchQuizzes: () => Promise<void>;
  fetchQuizById: (id: string) => Promise<void>;
}

const DEFAULT_FILTERS: IQuizFilters = {
  difficulty: null,
  type: null,
  mode: null,
  sortBy: null,
  sortOrder: "desc",
};

export const useQuizStore = create<IQuizStore>((set, get) => ({
  quizzes: [],
  currentQuiz: null,
  isLoading: false,
  error: null,
  filters: DEFAULT_FILTERS,

  setFilters(filters) {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  resetFilters() {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  async fetchQuizzes() {
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      const { filters } = get();

      if (filters.difficulty != null) params.set("difficulty", String(filters.difficulty));
      if (filters.type) params.set("type", filters.type);
      if (filters.mode) params.set("mode", filters.mode);
      if (filters.sortBy) {
        params.set("sortBy", filters.sortBy);
        params.set("sortOrder", filters.sortOrder);
      }

      const query = params.toString();
      const response = await axiosInstance.get(
        `/api/quizzes${query ? `?${query}` : ""}`
      );
      set({ quizzes: response.data });
    } catch (error: any) {
      set({ error: error.response?.data?.message ?? "Не удалось загрузить квизы" });
    } finally {
      set({ isLoading: false });
    }
  },

  async fetchQuizById(id) {
    set({ isLoading: true, error: null, currentQuiz: null });

    try {
      const response = await axiosInstance.get(`/api/quizzes/${id}`);
      set({ currentQuiz: response.data });
    } catch (error: any) {
      set({ error: error.response?.data?.message ?? "Не удалось загрузить квиз" });
    } finally {
      set({ isLoading: false });
    }
  },
}));
