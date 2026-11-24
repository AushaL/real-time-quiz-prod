import { axiosInstance } from "@shared/api/axios";
import { apiErrorMessage, apiErrorStatus } from "@shared/api/errors";
import type { IQuiz, IQuizFilters } from "@entities/quiz";
import { create } from "zustand";

export interface AdminQuestionInput {
  questionText: string;
  questionType: string;
  mediaUrl?: string;
  mediaPublicId?: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export interface AdminQuizInput {
  title: string;
  description: string;
  difficulty: number;
  variant: string;
  mode: string;
  questions: AdminQuestionInput[];
}

interface IAdminStore {
  isAdmin: boolean;
  checked: boolean;
  adminError: string | null;
  quizzes: IQuiz[];
  isLoading: boolean;
  error: string | null;
  filters: IQuizFilters;

  checkAdmin: () => Promise<void>;
  reset: () => void;
  fetchQuizzes: () => Promise<void>;
  setFilters: (filters: Partial<IQuizFilters>) => void;
  resetFilters: () => void;
  createQuiz: (input: AdminQuizInput) => Promise<{ success: boolean; message: string }>;
  updateQuiz: (id: string, input: AdminQuizInput) => Promise<{ success: boolean; message: string }>;
  deleteQuiz: (id: string) => Promise<{ success: boolean; message: string }>;
}

const DEFAULT_FILTERS: IQuizFilters = {
  difficulty: null,
  type: null,
  mode: null,
  sortBy: null,
  sortOrder: "desc",
};

export const useAdminStore = create<IAdminStore>((set, get) => ({
  isAdmin: false,
  checked: false,
  adminError: null,
  quizzes: [],
  isLoading: false,
  error: null,
  filters: DEFAULT_FILTERS,

  async checkAdmin() {
    try {
      await axiosInstance.get("/api/admin/check");
      set({ isAdmin: true, adminError: null });
    } catch (error) {
      const status = apiErrorStatus(error);
      const message = apiErrorMessage(error, "Неизвестная ошибка");
      set({ isAdmin: false, adminError: `HTTP ${status ?? "?"} — ${message}` });
    } finally {
      set({ checked: true });
    }
  },

  reset() {
    set({ isAdmin: false, checked: false, adminError: null });
  },

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

      if (filters.difficulty != null)
        params.set("difficulty", String(filters.difficulty));
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
    } catch (error) {
      set({ error: apiErrorMessage(error, "Не удалось загрузить квизы") });
    } finally {
      set({ isLoading: false });
    }
  },

  async createQuiz(input) {
    try {
      await axiosInstance.post("/api/admin/quiz", input);
      return { success: true, message: "Квиз создан" };
    } catch (error) {
      return {
        success: false,
        message: apiErrorMessage(error, "Не удалось создать квиз"),
      };
    }
  },

  async updateQuiz(id, input) {
    try {
      await axiosInstance.put(`/api/admin/quiz/${id}`, input);
      return { success: true, message: "Квиз обновлён" };
    } catch (error) {
      return {
        success: false,
        message: apiErrorMessage(error, "Не удалось обновить квиз"),
      };
    }
  },

  async deleteQuiz(id) {
    try {
      await axiosInstance.delete(`/api/admin/quiz/${id}`);
      return { success: true, message: "Квиз удалён" };
    } catch (error) {
      return {
        success: false,
        message: apiErrorMessage(error, "Не удалось удалить квиз"),
      };
    }
  },
}));
