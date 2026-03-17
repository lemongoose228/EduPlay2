import React, { useState } from 'react';
import type { OwnGameTemplate, OwnGameCategory } from '../../../features/templates/types/template.types';
import { Button } from '../../../shared/ui/Button/Button';
import { Input } from '../../../shared/ui/Input/Input';
import { Card } from '../../../shared/ui/Card/Card';
import { Table } from '../../../shared/ui/Table/Table';
import { createEmptyCategory } from '../../../features/templates/utils/template.utils';
import './OwnGameBuilder.css';

interface OwnGameBuilderProps {
  initialData?: OwnGameTemplate;
  onSave: (data: OwnGameTemplate) => void;
  onCancel: () => void;
}

export const OwnGameBuilder: React.FC<OwnGameBuilderProps> = ({
  initialData,
  onSave,
  onCancel
}) => {
  const [gameName, setGameName] = useState(initialData?.name || '');
  const [categories, setCategories] = useState<OwnGameCategory[]>(
    initialData?.categories || [createEmptyCategory(0)]
  );

  const addCategory = () => {
    if (categories.length < 6) {
      setCategories([...categories, createEmptyCategory(categories.length)]);
    }
  };

  const removeCategory = (categoryId: string) => {
    if (categories.length > 1) {
      setCategories(categories.filter(c => c.id !== categoryId));
    }
  };

  const updateCategoryName = (categoryId: string, name: string) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId ? { ...cat, name } : cat
    ));
  };

  const updateQuestion = (
    categoryId: string,
    questionIndex: number,
    field: 'question' | 'answer',
    value: string
  ) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        const updatedQuestions = [...cat.questions];
        updatedQuestions[questionIndex] = {
          ...updatedQuestions[questionIndex],
          [field]: value
        };
        return { ...cat, questions: updatedQuestions };
      }
      return cat;
    }));
  };

  const validateGame = (): boolean => {
    if (!gameName.trim()) {
      alert('Введите название игры');
      return false;
    }

    for (const category of categories) {
      if (!category.name.trim()) {
        alert('Заполните названия всех категорий');
        return false;
      }

      for (const question of category.questions) {
        if (!question.question.trim() || !question.answer.trim()) {
          alert(`Заполните все вопросы и ответы в категории "${category.name}"`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSave = () => {
    if (!validateGame()) return;

    const gameData: OwnGameTemplate = {
      ...initialData,
      name: gameName,
      type: 'own',
      categories,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(gameData);
  };

  const getCategoryQuestionsColumns = (category: OwnGameCategory) => [
    {
      key: 'value',
      title: 'Стоимость',
      width: 100,
      render: (value: number) => <span className="value-cell">{value}</span>
    },
    {
      key: 'question',
      title: 'Вопрос',
      render: (_: any, record: any, index: number) => (
        <Input
          value={record.question}
          onChange={(e) => updateQuestion(category.id, index, 'question', e.target.value)}
          placeholder="Введите вопрос"
        />
      )
    },
    {
      key: 'answer',
      title: 'Ответ',
      render: (_: any, record: any, index: number) => (
        <Input
          value={record.answer}
          onChange={(e) => updateQuestion(category.id, index, 'answer', e.target.value)}
          placeholder="Введите ответ"
        />
      )
    }
  ];

  const totalQuestions = categories.reduce((acc, cat) => acc + cat.questions.length, 0);

  return (
    <div className="own-game-builder">
      <div className="builder-header">
        <div>
          <h2 className="builder-title">Конструктор "Своя игра"</h2>
          <p className="builder-subtitle">Создайте свою уникальную игру с категориями и вопросами</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            Сохранить игру
          </Button>
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
            <h3 className="section-title">Категории и вопросы</h3>
            <p className="section-description">
              Добавьте категории и заполните вопросы для каждой из них
            </p>
          </div>
          {categories.length < 6 && (
            <Button variant="outline" onClick={addCategory}>
              + Добавить категорию
            </Button>
          )}
        </div>

        <div className="categories-list">
          {categories.map((category, index) => (
            <Card
              key={category.id}
              title={
                <Input
                  value={category.name}
                  onChange={(e) => updateCategoryName(category.id, e.target.value)}
                  placeholder="Название категории"
                />
              }
              actions={
                categories.length > 1 && (
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => removeCategory(category.id)}
                  >
                    Удалить
                  </Button>
                )
              }
            >
              <Table
                columns={getCategoryQuestionsColumns(category)}
                data={category.questions}
              />
            </Card>
          ))}
        </div>
      </div>

      <div className="builder-footer">
        <div className="questions-info">
          <span className="info-icon">📋</span>
          <span>Всего вопросов: <strong>{totalQuestions}</strong></span>
        </div>
        <Button onClick={handleSave}>
          Сохранить игру
        </Button>
      </div>
    </div>
  );
};