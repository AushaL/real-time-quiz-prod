export interface IRoomPlayer {
  id: string;
  name: string;
  avatarUrl: string;
  connected: boolean;
  score: number;
}

export interface IRoom {
  code: string;
  quizId: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  currentQuestionIndex: number;
  total: number;
  maxPlayers: number;
  revealed: boolean;
}

export interface IChatMessage {
  playerId: string;
  name: string;
  avatarUrl: string;
  text: string;
  createdAt: string;
}

export interface IRevealResult {
  id: string;
  correct: boolean;
}

export interface IReveal {
  questionIndex: number;
  correctIndex: number;
  explanation?: string;
  results: IRevealResult[];
  players: IRoomPlayer[];
  isLast: boolean;
}
