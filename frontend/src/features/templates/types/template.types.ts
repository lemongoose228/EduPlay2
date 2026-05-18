export interface OwnGameQuestion {
  value: number;
  question: string;
  answer: string;
  isAnswered?: boolean;
}

export interface OwnGameCategory {
  id: string;
  name: string;
  questions: OwnGameQuestion[];
}

export interface OwnGameTemplate {
  id?: string;
  name: string;
  type: 'own';
  categories: OwnGameCategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WheelQuestion {
  id: string;
  question: string;
  answer: string;
  imageUrl?: string;
}

export interface WheelCategory {
  id: string;
  name: string;
  questions: WheelQuestion[];
}

export interface WheelTemplate {
  id?: string;
  name: string;
  type: 'wheel';
  categories: WheelCategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  answer: string;
  options?: string[];
  points: number;
  imageUrl?: string;
}

export interface QuizTemplate {
  id?: string;
  name: string;
  type: 'quiz';
  questions: QuizQuestion[];
  timePerQuestion?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StationNodeTemplate {
  id: string;
  name: string;
  task: string;
  shape: 'circle' | 'star' | 'heart' | 'triangle' | 'square';
  color: string;
  imageUrl?: string;
}

export interface StationConnectionTemplate {
  from: string;
  to: string;
}

export interface StationTemplate {
  id?: string;
  name: string;
  type: 'station';
  layout: 'line';
  stations: StationNodeTemplate[];
  connections: StationConnectionTemplate[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TicTacToeQuestion {
  id: string;
  question: string;
  answer?: string;
}

export interface TicTacToeTemplate {
  id?: string;
  name: string;
  type: 'tictactoe';
  questions: TicTacToeQuestion[];
  createdAt?: string;
  updatedAt?: string;
}

export type GameTemplate =
  | OwnGameTemplate
  | QuizTemplate
  | CrocodileTemplate
  | WheelTemplate
  | StationTemplate
  | TicTacToeTemplate;

export interface ValidationError {
  field: string;
  message: string;
}

export const TEMPLATE_CONSTANTS = {
  MAX_CATEGORIES: 6,
  MIN_CATEGORIES: 1,
  QUESTIONS_PER_CATEGORY: 5,
  QUESTION_VALUES: [100, 200, 300, 400, 500],
  DEFAULT_TIME_PER_QUESTION: 30,
  MIN_TIME_PER_QUESTION: 5,
  MAX_TIME_PER_QUESTION: 120,
  DEFAULT_TIME_PER_TERM: 30,
  MIN_TIME_PER_TERM: 10,
  MAX_TIME_PER_TERM: 60,
  MAX_TERMS: 50,
  MIN_TERMS: 3,
  MIN_STATIONS: 3,
  MAX_STATIONS: 20,
  TICTACTOE_QUESTION_COUNT: 9,
};

export interface CrocodileTerm {
  id: string;
  term: string;
  isGuessed?: boolean;
}

export interface CrocodileTemplate {
  id?: string;
  name: string;
  type: 'crocodile';
  terms: CrocodileTerm[];
  timePerTerm: number;
  createdAt?: string;
  updatedAt?: string;
}

