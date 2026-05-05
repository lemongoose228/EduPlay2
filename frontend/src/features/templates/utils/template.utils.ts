import type {
  OwnGameCategory,
  OwnGameQuestion,
  QuizQuestion,
  StationConnectionTemplate,
  StationNodeTemplate,
  WheelCategory,
  WheelQuestion,
} from '../types/template.types';
import { TEMPLATE_CONSTANTS } from '../types/template.types';

export const createEmptyCategory = (index: number): OwnGameCategory => ({
  id: `cat-${Date.now()}-${index}-${Math.random()}`,
  name: `Категория ${index + 1}`,
  questions: TEMPLATE_CONSTANTS.QUESTION_VALUES.map(value => ({
    value,
    question: '',
    answer: ''
  }))
});

export const createEmptyQuizQuestion = (): QuizQuestion => ({
  id: `q-${Date.now()}-${Math.random()}`,
  question: '',
  answer: '',
  points: 100,
  imageUrl: '',
});

export const createEmptyWheelQuestion = (): WheelQuestion => ({
  id: `wheel-q-${Date.now()}-${Math.random()}`,
  question: '',
  answer: '',
  imageUrl: '',
});

export const createEmptyWheelCategory = (index: number): WheelCategory => ({
  id: `wheel-cat-${Date.now()}-${index}-${Math.random()}`,
  name: `Тема ${index + 1}`,
  questions: [createEmptyWheelQuestion()],
});

export const calculateTotalQuestions = (categories: OwnGameCategory[]): number => {
  return categories.reduce((total, category) => total + category.questions.length, 0);
};

export const validateQuestion = (question: OwnGameQuestion | QuizQuestion): boolean => {
  return question.question.trim() !== '' && question.answer.trim() !== '';
};

export const formatTemplateForSave = (template: any) => {
  return {
    ...template,
    updatedAt: new Date().toISOString(),
    createdAt: template.createdAt || new Date().toISOString()
  };
};

import type { CrocodileTerm } from '../types/template.types';

export const createEmptyTerm = (): CrocodileTerm => ({
  id: `term-${Date.now()}-${Math.random()}`,
  term: '',
  isGuessed: false
});

export const createEmptyCrocodileGame = () => ({
  name: '',
  type: 'crocodile' as const,
  terms: [createEmptyTerm()],
  timePerTerm: TEMPLATE_CONSTANTS.DEFAULT_TIME_PER_TERM
});

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const createEmptyStationNode = (index: number): StationNodeTemplate => ({
  id: `station-${Date.now()}-${index}-${Math.random()}`,
  name: `Станция ${index + 1}`,
  task: '',
  shape: 'circle',
  color: '#6b8cff',
  imageUrl: '',
});

export const buildStationConnections = (nodes: StationNodeTemplate[]): StationConnectionTemplate[] => {
  if (nodes.length <= 1) return [];
  return nodes.slice(0, -1).map((node, idx) => ({ from: node.id, to: nodes[idx + 1].id }));
};