export type SessionStatus = 'waiting' | 'active' | 'paused' | 'finished';

export type GameType =
  | 'own'
  | 'quiz'
  | 'crocodile'
  | 'wheel'
  | 'station'
  | 'tictactoe';

export interface SessionQuestion {
  id: string;
  value: number;
  question: string;
  answer: string;
  imageUrl?: string;
  isAnswered?: boolean;
}

export interface SessionCategory {
  id: string;
  name: string;
  questions: SessionQuestion[];
}

export interface SessionPlayer {
  id?: string;
  userId?: string;
  teamId?: string;
  name: string;
  isHost?: boolean;
}

export interface SessionTeam {
  id: string;
  name: string;
  score: number;
  players: SessionPlayer[];
}

export interface AnsweredQuestion {
  categoryId: string;
  questionId: string;
  userId?: string;
  teamId?: string;
  isCorrect?: boolean;
  submittedAnswer?: string;
  scored?: boolean;
}

export interface CrocodileState {
  termOrder: string[];
  currentTermId: string | null;
  turnEndsAt: string | null;
  termResults: Array<{ termId: string; result: 'guessed' | 'missed' }>;
}

export interface TicTacToeState {
  setupComplete: boolean;
  team1Id: string;
  team2Id: string;
  team1Symbol: 'cross' | 'circle' | 'heart' | 'star';
  team2Symbol: 'cross' | 'circle' | 'heart' | 'star';
  currentTurnTeamId: string;
  cells: Array<{
    index: number;
    questionId: string;
    occupiedByTeamId: string | null;
  }>;
  removedQuestionIds: string[];
  selectedCellIndex: number | null;
  winnerTeamId: string | null;
  isDraw?: boolean;
}

export interface SessionSettings {
  maxTeams: number;
  maxPlayersPerTeam: number;
  timePerQuestion: number;
  timePerTerm?: number;
  allowNegativeScores: boolean;
}

export interface GameSession {
  id: string;
  game: {
    title: string;
    type: GameType;
    categories: SessionCategory[];
    settings?: {
      timePerQuestion?: number;
      timePerTerm?: number;
      allowNegativeScores?: boolean;
    };
  };
  teams: SessionTeam[];
  status: SessionStatus;
  hostId: string;
  currentQuestionIndex?: number;
  answeredQuestions: AnsweredQuestion[];
  inviteCode: string;
  multiplayer?: boolean | null;
  settings: SessionSettings;
  crocodileState?: CrocodileState | null;
  tictactoeState?: TicTacToeState | null;
  questionStartedAt?: string | null;
  startedAt?: string;
  finishedAt?: string;
}

export interface CreateSessionDto {
  gameId: string;
  settings: Partial<SessionSettings>;
}

export interface SessionResult {
  sessionId: string;
  gameId: string;
  teams: SessionTeam[];
  duration: number;
  finishedAt: string;
}

/** @deprecated Use SessionTeam */
export type Team = SessionTeam;

/** @deprecated Use SessionPlayer */
export type Player = SessionPlayer;
