import type { OwnGameCategory, OwnGameQuestion, QuizQuestion} from '../types/template.types';
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