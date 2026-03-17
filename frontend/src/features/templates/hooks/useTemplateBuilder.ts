import { useState } from 'react';
import type { GameTemplate, ValidationError} from '../types/template.types';

export const useTemplateBuilder = <T extends GameTemplate>(initialData?: T) => {
  const [gameData, setGameData] = useState<T | undefined>(initialData);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const validateOwnGame = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.name?.trim()) {
      errors.push({ field: 'name', message: 'Название игры обязательно' });
    }

    if (!data.categories || data.categories.length === 0) {
      errors.push({ field: 'categories', message: 'Добавьте хотя бы одну категорию' });
    } else {
      data.categories.forEach((category: any, catIndex: number) => {
        if (!category.name?.trim()) {
          errors.push({ 
            field: `categories[${catIndex}].name`, 
            message: `Название категории ${catIndex + 1} обязательно` 
          });
        }

        category.questions.forEach((question: any, qIndex: number) => {
          if (!question.question?.trim()) {
            errors.push({ 
              field: `categories[${catIndex}].questions[${qIndex}].question`, 
              message: `Вопрос ${qIndex + 1} в категории ${catIndex + 1} обязателен` 
            });
          }
          if (!question.answer?.trim()) {
            errors.push({ 
              field: `categories[${catIndex}].questions[${qIndex}].answer`, 
              message: `Ответ на вопрос ${qIndex + 1} в категории ${catIndex + 1} обязателен` 
            });
          }
        });
      });
    }

    return errors;
  };

  const validateQuizGame = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.name?.trim()) {
      errors.push({ field: 'name', message: 'Название игры обязательно' });
    }

    if (!data.questions || data.questions.length === 0) {
      errors.push({ field: 'questions', message: 'Добавьте хотя бы один вопрос' });
    } else {
      data.questions.forEach((question: any, index: number) => {
        if (!question.question?.trim()) {
          errors.push({ 
            field: `questions[${index}].question`, 
            message: `Вопрос ${index + 1} обязателен` 
          });
        }
        if (!question.answer?.trim()) {
          errors.push({ 
            field: `questions[${index}].answer`, 
            message: `Ответ на вопрос ${index + 1} обязателен` 
          });
        }
      });
    }

    return errors;
  };

  const validate = (data: T): boolean => {
    let validationErrors: ValidationError[] = [];

    if (data.type === 'own') {
      validationErrors = validateOwnGame(data);
    } else if (data.type === 'quiz') {
      validationErrors = validateQuizGame(data);
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const saveTemplate = async (data: T): Promise<boolean> => {
    if (!validate(data)) {
      return false;
    }

    setIsSaving(true);
    try {
      // Здесь будет API вызов для сохранения
      console.log('Saving template:', data);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Имитация задержки
      return true;
    } catch (error) {
      console.error('Error saving template:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    gameData,
    setGameData,
    errors,
    isSaving,
    validate,
    saveTemplate
  };
};