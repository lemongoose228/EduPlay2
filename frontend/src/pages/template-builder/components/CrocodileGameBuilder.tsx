import React, { useState } from 'react';
import type { CrocodileTemplate, CrocodileTerm } from '../../../features/templates/types/template.types';
import { Button } from '../../../shared/ui/Button/Button';
import { Input } from '../../../shared/ui/Input/Input';
import { Card } from '../../../shared/ui/Card/Card';
import { createEmptyTerm } from '../../../features/templates/utils/template.utils';
import './CrocodileGameBuilder.css';

interface CrocodileGameBuilderProps {
  initialData?: CrocodileTemplate;
  onSave: (data: CrocodileTemplate) => void;
  onCancel: () => void;
}

export const CrocodileGameBuilder: React.FC<CrocodileGameBuilderProps> = ({
  initialData,
  onSave,
  onCancel
}) => {
  const [gameName, setGameName] = useState(initialData?.name || '');
  const [terms, setTerms] = useState<CrocodileTerm[]>(
    initialData?.terms || [createEmptyTerm()]
  );
  const [timePerTerm, setTimePerTerm] = useState(initialData?.timePerTerm || 30);

  const addTerm = () => {
    if (terms.length < 50) {
      setTerms([...terms, createEmptyTerm()]);
    }
  };

  const removeTerm = (termId: string) => {
    if (terms.length > 1) {
      setTerms(terms.filter(t => t.id !== termId));
    }
  };

  const updateTerm = (termId: string, value: string) => {
    setTerms(terms.map(term =>
      term.id === termId ? { ...term, term: value } : term
    ));
  };

  const validateGame = (): boolean => {
    if (!gameName.trim()) {
      alert('Введите название игры');
      return false;
    }

    const emptyTerms = terms.filter(t => !t.term.trim());
    if (emptyTerms.length > 0) {
      alert('Заполните все термины');
      return false;
    }

    if (terms.length < 3) {
      alert('Добавьте минимум 3 термина');
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateGame()) return;

    const gameData: CrocodileTemplate = {
      ...initialData,
      name: gameName,
      type: 'crocodile',
      terms: terms.filter(t => t.term.trim()),
      timePerTerm,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(gameData);
  };

  return (
    <div className="crocodile-game-builder">
      <div className="builder-header">
        <div>
          <h2 className="builder-title">Конструктор "Крокодил"</h2>
          <p className="builder-subtitle">
            Создайте игру с терминами, которые нужно объяснять без слов
          </p>
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
            label="Время на термин (секунд)"
            type="number"
            value={timePerTerm}
            onChange={(e) => setTimePerTerm(Number(e.target.value))}
            min="10"
            max="60"
          />
        </div>
      </Card>

      <div className="terms-section">
        <div className="section-header">
          <div>
            <h3 className="section-title">Термины ({terms.length})</h3>
            <p className="section-description">
              Добавьте термины, которые нужно будет объяснять (минимум 3, максимум 50)
            </p>
          </div>
          <Button variant="outline" onClick={addTerm} disabled={terms.length >= 50}>
            + Добавить термин
          </Button>
        </div>

        <div className="terms-list">
          {terms.map((term, index) => (
            <div key={term.id} className="term-card-wrapper">
              <Card
                title={`Термин ${index + 1}`}
                actions={
                  terms.length > 1 && (
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => removeTerm(term.id)}
                    >
                      Удалить
                    </Button>
                  )
                }
              >
                <div className="term-field">
                  <Input
                    value={term.term}
                    onChange={(e) => updateTerm(term.id, e.target.value)}
                    placeholder="Введите термин"
                  />
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <div className="builder-footer">
        <div className="terms-info">
          <span className="info-icon">📋</span>
          <span>Всего терминов: <strong>{terms.filter(t => t.term.trim()).length}</strong></span>
          <span className="info-note">(минимум 3)</span>
        </div>
        <Button onClick={handleSave}>
          Сохранить игру
        </Button>
      </div>
    </div>
  );
};