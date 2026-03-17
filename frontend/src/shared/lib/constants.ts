export const GAME_CONSTANTS = {
  MAX_CATEGORIES: 6,
  MIN_CATEGORIES: 1,
  QUESTIONS_PER_CATEGORY: 5,
  QUESTION_VALUES: [100, 200, 300, 400, 500],
  
  MAX_TEAMS: 8,
  MIN_TEAMS: 2,
  MAX_PLAYERS_PER_TEAM: 4,
  
  DEFAULT_TIME_PER_QUESTION: 30,
  MIN_TIME_PER_QUESTION: 5,
  MAX_TIME_PER_QUESTION: 120
};

export const SESSION_STATUS = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  PAUSED: 'paused',
  FINISHED: 'finished'
} as const;

export const GAME_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
} as const;

export const TEMPLATE_TYPES = {
  OWN: 'own',
  QUIZ: 'quiz'
} as const;