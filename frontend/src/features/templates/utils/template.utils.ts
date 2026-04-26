import type {
  OwnGameCategory,
  OwnGameQuestion,
  QuizQuestion,
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
  points: 100
});

export const createEmptyWheelQuestion = (): WheelQuestion => ({
  id: `wheel-q-${Date.now()}-${Math.random()}`,
  question: '',
  answer: '',
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