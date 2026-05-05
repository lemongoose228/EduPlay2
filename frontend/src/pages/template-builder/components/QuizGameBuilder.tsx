import React, { useState } from 'react';
import type { QuizTemplate, QuizQuestion } from '../../../features/templates/types/template.types';
import { Button } from '../../../shared/ui/Button/Button';
import { Input } from '../../../shared/ui/Input/Input';
import { Card } from '../../../shared/ui/Card/Card';
import { createEmptyQuizQuestion } from '../../../features/templates/utils/template.utils';
import { useDialogs } from '../../../shared/ui/DialogProvider';
import { QuestionImageField } from './QuestionImageField';
import './QuizGameBuilder.css';

interface QuizGameBuilderProps {
  initialData?: QuizTemplate;
  onSave: (data: QuizTemplate) => void;
  onCancel: () => void;
}

export const QuizGameBuilder: React.FC<QuizGameBuilderProps> = ({
  initialData,
  onSave,
  onCancel
}) => {
  const { showAlert } = useDialogs();
  const [gameName, setGameName] = useState(initialData?.name || '');
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialData?.questions || [createEmptyQuizQuestion()]
  );
  const [timePerQuestion, setTimePerQuestion] = useState(initialData?.timePerQuestion || 30);

  const addQuestion = () => {
    setQuestions([...questions, createEmptyQuizQuestion()]);
  };

  const removeQuestion = (questionId: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== questionId));
    }
  };

  const updateQuestion = (
    questionId: string,
    field: keyof QuizQuestion,
    value: string | number
  ) => {
    setQuestions(questions.map(q =>
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const validateGame = async (): Promise<boolean> => {
    if (!gameName.trim()) {
      await showAlert('Введите название игры');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        await showAlert(`Заполните вопрос ${i + 1}`);
        return false;
      }
      if (!q.answer.trim()) {
        await showAlert(`Заполните ответ на вопрос ${i + 1}`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!(await validateGame())) return;

    const gameData: QuizTemplate = {
      ...initialData,
      name: gameName,
      type: 'quiz',
      questions,
      timePerQuestion,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(gameData);
  };

  return (
    <div className="quiz-game-builder">
      <div className="builder-header">
        <div>
          <h2 className="builder-title">Конструктор "Викторина"</h2>
          <p className="builder-subtitle">Создайте викторину с вопросами и ответами</p>
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
        <div className="basic-info-grid">
          <Input
            label="Название игры"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="Введите название игры"
          />
          <Input
            label="Время на вопрос (секунд)"
            type="number"
            value={timePerQuestion}
            onChange={(e) => setTimePerQuestion(Number(e.target.value))}
            min="5"
            max="120"
          />
        </div>
      </Card>

      <div className="questions-section">
        <div className="section-header">
          <div>
            <h3 className="section-title">Вопросы</h3>
            <p className="section-description">
              Добавьте вопросы и ответы для викторины
            </p>
          </div>
          <Button variant="outline" onClick={addQuestion}>
            + Добавить вопрос
          </Button>
        </div>

        <div className="questions-list">
          {questions.map((question, index) => (
            <Card
              key={question.id}
              title={`Вопрос ${index + 1}`}
              actions={
                questions.length > 1 && (
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => removeQuestion(question.id)}
                  >
                    Удалить
                  </Button>
                )
              }
            >
              <div className="question-grid">
                <div className="question-field full-width">
                  <label>Вопрос:</label>
                  <Input
                    value={question.question}
                    onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                    placeholder="Введите вопрос"
                  />
                </div>
                <div className="question-field full-width">
                  <label>Ответ:</label>
                  <Input
                    value={question.answer}
                    onChange={(e) => updateQuestion(question.id, 'answer', e.target.value)}
                    placeholder="Введите ответ"
                  />
                </div>
                <div className="question-field">
                  <label>Очки:</label>
                  <Input
                    type="number"
                    value={question.points}
                    onChange={(e) => updateQuestion(question.id, 'points', Number(e.target.value))}
                    min="100"
                    step="100"
                  />
                </div>
                <div className="question-field full-width">
                  <QuestionImageField
                    imageUrl={question.imageUrl}
                    onChange={(nextUrl) => updateQuestion(question.id, 'imageUrl', nextUrl)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="builder-footer">
        <div className="questions-info">
          <span className="info-icon">📋</span>
          <span>Всего вопросов: <strong>{questions.length}</strong></span>
        </div>
        <Button onClick={handleSave}>
          Сохранить игру
        </Button>
      </div>
    </div>
  );
};