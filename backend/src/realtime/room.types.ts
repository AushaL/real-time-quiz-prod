export type RoomStatus = "lobby" | "playing" | "finished";

export interface PlayerInfo {
  name: string;
  avatarUrl?: string;
}

export interface RoomRecord {
  code: string;
  quizId: string;
  hostId: string;
  status: RoomStatus;
  currentQuestionIndex: number;
  total: number;
  maxPlayers: number;
  revealed: boolean;
}

export interface RoomPlayer {
  id: string;
  name: string;
  avatarUrl: string;
  connected: boolean;
  score: number;
}

export interface ChatMessage {
  playerId: string;
  name: string;
  avatarUrl: string;
  text: string;
  createdAt: string;
}

/** Question shape sent to players before the answer is revealed. */
export interface PublicQuestion {
  questionText: string;
  questionType: string;
  mediaUrl?: string;
  options: string[];
}

export interface StoredQuestion extends PublicQuestion {
  correctAnswerIndex: number;
  explanation?: string;
}

export interface RevealResult {
  id: string;
  correct: boolean;
}

export interface RevealPayload {
  questionIndex: number;
  correctIndex: number;
  explanation?: string;
  results: RevealResult[];
  players: RoomPlayer[];
  isLast: boolean;
}

export interface RoomState {
  code: string;
  room: RoomRecord;
  players: RoomPlayer[];
  chat: ChatMessage[];
}

export interface JoinSnapshot extends RoomState {
  /** Present when the room is already playing (or finished). */
  question?: PublicQuestion;
  /** The player's own answer for the current question, if any. */
  myAnswer?: number;
  reveal?: RevealPayload | null;
  result?: RoomPlayer[];
}

export interface AnswerResult {
  allAnswered: boolean;
  answered?: number;
  total?: number;
}
