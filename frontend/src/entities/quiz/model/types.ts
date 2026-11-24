export interface IQuestion {
  questionText: string;
  questionType: string;
  mediaUrl?: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export interface IQuiz {
  _id: string;
  title: string;
  description: string;
  difficulty: number;
  variant: string;
  mode: string;
  questions: IQuestion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IQuizSession {
  quizId: string;
  playerId: string;
  startedAt: Date;
  endedAt?: Date;
  questions: IQuestion[];
}

// Вопрос без correctAnswerIndex — его нельзя отдавать клиенту до reveal.
export interface IQuestionPublic {
  questionText: string;
  questionType: string;
  mediaUrl?: string;
  options: string[];
  explanation?: string;
}
