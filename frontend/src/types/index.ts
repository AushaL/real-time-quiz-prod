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

export interface IPlayer {
  fullName: string;
  imageUrl: string;
  clerkId: string;
}

export interface IQuizSession {
  quizId: string;
  playerId: string;
  startedAt: Date;
  endedAt?: Date;
  questions: IQuestion[];
}
