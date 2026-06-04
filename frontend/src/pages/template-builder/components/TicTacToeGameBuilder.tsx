import React, { useState } from 'react';
import type { TicTacToeTemplate } from '../../../features/templates/types/template.types';
import { TEMPLATE_CONSTANTS } from '../../../features/templates/types/template.types';
import { createInitialTicTacToeQuestions } from '../../../features/templates/utils/template.utils';
import { Button } from '../../../shared/ui/Button/Button';
import { Input } from '../../../shared/ui/Input/Input';
import { Card } from '../../../shared/ui/Card/Card';
import { useDialogs } from '../../../shared/ui/DialogProvider';
import { QuestionImageField } from './QuestionImageField';
import './TicTacToeGameBuilder.css';

interface TicTacToeGameBuilderProps {
  initialData?: TicTacToeTemplate;
  onSave: (data: TicTacToeTemplate) => void;
  onCancel: () => void;
  afterMainInfo?: React.ReactNode;
}

export const TicTacToeGameBuilder: React.FC<TicTacToeGameBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
  afterMainInfo,
}) => {
  const { showAlert } = useDialogs();
  const [gameName, setGameName] = useState(initialData?.name || '');
  const [questions, setQuestions] = useState(
    initialData?.questions?.length === TEMPLATE_CONSTANTS.TICTACTOE_QUESTION_COUNT
      ? initialData.questions
      : createInitialTicTacToeQuestions(),
  );

  const updateQuestion = (
    questionId: string,
    field: 'question' | 'imageUrl',
    value: string,
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, [field]: value } : q)),
    );
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
    }

    return true;
  };

  const handleSave = async () => {
    if (!(await validateGame())) return;

    const gameData: TicTacToeTemplate = {
      ...initialData,
      name: gameName,
      type: 'tictactoe',
      questions: questions.map((q) => ({
        ...q,
        question: q.question.trim(),
      })),
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(gameData);
  };

  return (
    <div className="tictactoe-game-builder">
      <div className="builder-header">
        <div>
          <h2 className="builder-title">Конструктор «Крестики-нолики»</h2>
          <p className="builder-subtitle">
            Добавьте {TEMPLATE_CONSTANTS.TICTACTOE_QUESTION_COUNT} вопросов. При начале игры они
            случайно распределятся по клеткам поля
          </p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить игру</Button>
        </div>
      </div>

      <Card title="Основная информация">
        <div className="basic-info-grid">
          <Input
            label="Название игры"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="Например: Крестики-нолики по биологии"
          />
        </div>
        {afterMainInfo}
      </Card>

      <Card title={`Вопросы (${questions.length})`}>
        <div className="tictactoe-questions-list">
          {questions.map((q, index) => (
            <div key={q.id} className="tictactoe-question-item">
              <span className="tictactoe-question-label">Вопрос {index + 1}</span>
              <Input
                value={q.question}
                onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                placeholder="Введите вопрос"
              />
              <QuestionImageField
                imageUrl={q.imageUrl}
                onChange={(nextUrl) => updateQuestion(q.id, 'imageUrl', nextUrl)}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
