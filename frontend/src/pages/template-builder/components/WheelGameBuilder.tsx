import React, { useState } from 'react';
import type { WheelCategory, WheelTemplate } from '../../../features/templates/types/template.types';
import {
  createEmptyWheelCategory,
  createEmptyWheelQuestion,
} from '../../../features/templates/utils/template.utils';
import { Button } from '../../../shared/ui/Button/Button';
import { Card } from '../../../shared/ui/Card/Card';
import { Input } from '../../../shared/ui/Input/Input';
import './WheelGameBuilder.css';

interface WheelGameBuilderProps {
  initialData?: WheelTemplate;
  onSave: (data: WheelTemplate) => void;
  onCancel: () => void;
}

export const WheelGameBuilder: React.FC<WheelGameBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [gameName, setGameName] = useState(initialData?.name || '');
  const [categories, setCategories] = useState<WheelCategory[]>(
    initialData?.categories || [createEmptyWheelCategory(0)],
  );

  const addCategory = () => {
    if (categories.length < 8) {
      setCategories((prev) => [...prev, createEmptyWheelCategory(prev.length)]);
    }
  };

  const removeCategory = (categoryId: string) => {
    if (categories.length > 1) {
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    }
  };

  const updateCategoryName = (categoryId: string, name: string) => {
    setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, name } : c)));
  };

  const updateQuestion = (
    categoryId: string,
    questionIndex: number,
    field: 'question' | 'answer',
    value: string,
  ) => {
    setCategories((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        const updatedQuestions = [...category.questions];
        updatedQuestions[questionIndex] = {
          ...updatedQuestions[questionIndex],
          [field]: value,
        };
        return { ...category, questions: updatedQuestions };
      }),
    );
  };

  const addQuestion = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? { ...category, questions: [...category.questions, createEmptyWheelQuestion()] }
          : category,
      ),
    );
  };

  const removeQuestion = (categoryId: string, questionId: string) => {
    setCategories((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        if (category.questions.length <= 1) return category;
        return {
          ...category,
          questions: category.questions.filter((question) => question.id !== questionId),
        };
      }),
    );
  };

  const validateGame = (): boolean => {
    if (!gameName.trim()) {
      alert('Введите название игры');
      return false;
    }

    for (const category of categories) {
      if (!category.name.trim()) {
        alert('Заполните названия всех тем');
        return false;
      }
      if (!category.questions.length) {
        alert(`Добавьте минимум один вопрос в теме "${category.name}"`);
        return false;
      }
      for (const question of category.questions) {
        if (!question.question.trim() || !question.answer.trim()) {
          alert(`Заполните все задания в теме "${category.name}"`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSave = () => {
    if (!validateGame()) return;

    onSave({
      ...initialData,
      name: gameName,
      type: 'wheel',
      categories,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="wheel-game-builder">
      <div className="builder-header">
        <div>
          <h2 className="builder-title">Конструктор "Колесо Фортуны"</h2>
          <p className="builder-subtitle">Создайте темы и задания для вращающегося колеса</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить игру</Button>
        </div>
      </div>

      <Card title="Основная информация">
        <Input
          label="Название игры"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          placeholder="Введите название игры"
        />
      </Card>

      <div className="categories-section">
        <div className="section-header">
          <div>
            <h3 className="section-title">Темы и задания</h3>
            <p className="section-description">Каждая тема станет сектором колеса</p>
          </div>
          <Button variant="outline" onClick={addCategory} disabled={categories.length >= 8}>
            + Добавить тему
          </Button>
        </div>

        <div className="categories-list">
          {categories.map((category) => (
            <Card
              key={category.id}
              title={
                <Input
                  value={category.name}
                  onChange={(e) => updateCategoryName(category.id, e.target.value)}
                  placeholder="Название темы"
                />
              }
              actions={
                categories.length > 1 ? (
                  <Button variant="danger" size="small" onClick={() => removeCategory(category.id)}>
                    Удалить
                  </Button>
                ) : undefined
              }
            >
              <div className="wheel-questions-list">
                {category.questions.map((question, index) => (
                  <div key={question.id} className="wheel-question-item">
                    <div className="wheel-question-header">
                      <span>Вопрос {index + 1}</span>
                      <Button
                        variant="danger"
                        size="small"
                        disabled={category.questions.length <= 1}
                        onClick={() => removeQuestion(category.id, question.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                    <div className="wheel-question-fields">
                      <Input
                        value={question.question}
                        onChange={(e) => updateQuestion(category.id, index, 'question', e.target.value)}
                        placeholder="Введите задание"
                      />
                      <Input
                        value={question.answer}
                        onChange={(e) => updateQuestion(category.id, index, 'answer', e.target.value)}
                        placeholder="Введите ответ"
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="small" onClick={() => addQuestion(category.id)}>
                  + Добавить вопрос
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="builder-footer">
        <div className="questions-info">
          <span className="info-icon">🎡</span>
          <span>
            Тем: <strong>{categories.length}</strong>
          </span>
        </div>
        <Button onClick={handleSave}>Сохранить игру</Button>
      </div>
    </div>
  );
};
