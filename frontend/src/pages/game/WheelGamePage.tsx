import React, { useMemo, useState, useRef } from 'react';
import { Button } from '../../shared/ui/Button/Button';
import { FaCheck, FaTimes } from 'react-icons/fa';
import wheelIcon from '../../assets/wheel_icon.png';
import { QuestionContent } from './QuestionContent';
import './WheelGamePage.css';

const WHEEL_SECTOR_COLORS = [
  '#f2b8c6',
  '#bfe8d8',
  '#ffe9a8',
  '#ddd4f5',
  '#b8ebe3',
  '#ffd4bc',
  '#c9d6f5',
  '#fde8a0',
  '#d4ead4',
  '#fbcaba',
  '#e0c8f7',
  '#a8e8e4',
  '#f5d0a8',
  '#c5e3f0',
  '#e8d4c4',
  '#d8f2c2',
];

interface WheelQuestion {
  id: string;
  question: string;
  answer: string;
  imageUrl?: string;
}

interface WheelCategory {
  id: string;
  name: string;
  questions: WheelQuestion[];
}

interface WheelGamePageProps {
  title: string;
  categories: WheelCategory[];
  correctCount: number;
  answeredKeys: Set<string>;
  isHost: boolean;
  onSuccess: (categoryId: string, questionId: string) => Promise<void>;
  onFail: (categoryId: string, questionId: string) => Promise<void>;
  onFinish: () => Promise<void>;
}

export const WheelGamePage: React.FC<WheelGamePageProps> = ({
  title,
  categories,
  correctCount,
  answeredKeys,
  isHost,
  onSuccess,
  onFail,
  onFinish,
}) => {
  const [rotationDeg, setRotationDeg] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<WheelQuestion | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [selectedSectorIndex, setSelectedSectorIndex] = useState<number | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const availableCategories = useMemo(
    () =>
      categories.filter((category) =>
        category.questions.some((question) => !answeredKeys.has(`${category.id}:${question.id}`)),
      ),
    [categories, answeredKeys],
  );

  const selectedCategory = useMemo(
    () => availableCategories.find((category) => category.id === activeCategoryId) || null,
    [availableCategories, activeCategoryId],
  );

  const nextQuestionInCategory = useMemo(() => {
    if (!selectedCategory) return null;
    return (
      selectedCategory.questions.find(
        (question) => !answeredKeys.has(`${selectedCategory.id}:${question.id}`),
      ) || null
    );
  }, [selectedCategory, answeredKeys]);

  const nCategories = availableCategories.length;

  const wheelDiskBackground = useMemo(() => {
    if (nCategories === 0) return 'transparent';
    const stops: string[] = [];
    for (let i = 0; i < nCategories; i += 1) {
      const c = WHEEL_SECTOR_COLORS[i % WHEEL_SECTOR_COLORS.length];
      const a = (i * 360) / nCategories;
      const b = ((i + 1) * 360) / nCategories;
      stops.push(`${c} ${a}deg`, `${c} ${b}deg`);
    }
    return `conic-gradient(from 0deg at 50% 50%, ${stops.join(', ')})`;
  }, [nCategories]);

  const wheelHighlightBackground = useMemo(() => {
    if (nCategories === 0 || selectedSectorIndex === null) return 'transparent';
    const i = selectedSectorIndex;
    const a = (i * 360) / nCategories;
    const b = ((i + 1) * 360) / nCategories;
    return `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent ${a}deg, rgba(255,255,255,0.28) ${a}deg, rgba(255,255,255,0.28) ${b}deg, transparent ${b}deg, transparent 360deg)`;
  }, [nCategories, selectedSectorIndex]);

  const handleSpin = () => {
    if (!isHost || isSpinning || isResolving || availableCategories.length === 0) return;

    const selectedIndex = Math.floor(Math.random() * availableCategories.length);
    const selected = availableCategories[selectedIndex];
    const unresolvedQuestions = selected.questions.filter(
      (question) => !answeredKeys.has(`${selected.id}:${question.id}`),
    );
    const selectedQuestion =
      unresolvedQuestions[Math.floor(Math.random() * unresolvedQuestions.length)] ?? null;

    if (!selectedQuestion) return;

    setSelectedSectorIndex(selectedIndex);

    const sectorAngle = 360 / availableCategories.length;
    const targetCenterAngle = selectedIndex * sectorAngle + sectorAngle / 2;
    const targetRotationWithinCircle = (360 - targetCenterAngle) % 360;
    const currentRotationWithinCircle = ((rotationDeg % 360) + 360) % 360;
    const deltaToTarget =
      (targetRotationWithinCircle - currentRotationWithinCircle + 360) % 360;

    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const nextRotation = rotationDeg + fullRotations * 360 + deltaToTarget;

    setIsSpinning(true);
    setRotationDeg(nextRotation);
    setActiveCategoryId(null);
    setActiveQuestion(null);
    setShowAnswer(false);

    setTimeout(() => {
      setIsSpinning(false);
      setActiveCategoryId(selected.id);
      setActiveQuestion(selectedQuestion);
      setSelectedSectorIndex(null);
    }, 4000);
  };

  const resolveAnswer = async (result: 'success' | 'fail') => {
    if (!isHost || !selectedCategory || !activeQuestion || isResolving) return;
    setIsResolving(true);
    try {
      if (result === 'success') {
        await onSuccess(selectedCategory.id, activeQuestion.id);
      } else {
        await onFail(selectedCategory.id, activeQuestion.id);
      }
      setActiveCategoryId(null);
      setActiveQuestion(null);
      setShowAnswer(false);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="wheel-page">
      <div className="wheel-header">
        <div className="wheel-header-left">
          <h1 className="wheel-title">{title}</h1>
          <p className="wheel-subtitle">
            Колесо Фортуны — проверьте свои знания!
          </p>
        </div>
        {isHost && (
          <Button 
            variant="secondary" 
            size="small" 
            onClick={() => void onFinish()} 
            disabled={isResolving}
          >
            Завершить игру
          </Button>
        )}
      </div>

      <div className="wheel-layout">
        <div className="wheel-board">
          <div className="wheel-pointer-container">
            <div className="wheel-pointer"></div>
            <div className="wheel-pointer-center"></div>
          </div>
          
          <div className="wheel-container">
            <div
              ref={wheelRef}
              className={`wheel-circle ${isSpinning ? 'spinning' : ''}`}
              style={{
                transform: `rotate(${rotationDeg}deg)`,
              }}
            >
              {nCategories > 0 ? (
                <>
                  <div className="wheel-disk" style={{ background: wheelDiskBackground }} />
                  {isSpinning && selectedSectorIndex !== null && (
                    <div
                      className="wheel-disk wheel-disk-glow"
                      style={{ background: wheelHighlightBackground }}
                    />
                  )}
                </>
              ) : (
                <div className="wheel-empty">
                  <span>Нет доступных тем</span>
                </div>
              )}
            </div>
          </div>
          {availableCategories.length > 0 && (
            <div className="wheel-legend" aria-label="Легенда тем колеса">
              {availableCategories.map((category, index) => (
                <div className="wheel-legend-item" key={category.id}>
                  <span
                    className="wheel-legend-color"
                    style={{
                      backgroundColor: WHEEL_SECTOR_COLORS[index % WHEEL_SECTOR_COLORS.length],
                    }}
                    aria-hidden
                  />
                  <span className="wheel-legend-name">{category.name}</span>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="primary"
            size="large"
            onClick={handleSpin}
            disabled={!isHost || isSpinning || isResolving || availableCategories.length === 0}
            className="spin-button"
          >
            {isSpinning ? (
              <span className="spin-button-content">
                <span className="spin-icon">🌀</span>
                Крутится...
              </span>
            ) : (
              <span className="spin-button-content">
                <img className="spin-icon" src={wheelIcon} alt="Колесо Фортуны" />
                Крутить колесо
              </span>
            )}
          </Button>
        </div>

        <div className="wheel-side">
          <div className="wheel-score-card">
            <div className="wheel-score-header">
              <span className="wheel-score-icon">🏆</span>
              <h3>Счёт</h3>
            </div>
            <div className="wheel-score-value">
              <span className="team-name">Отвечено вопросов</span>
              <span className="team-score">{correctCount}</span>
            </div>
          </div>

          {activeQuestion && selectedCategory && (
            <div className="wheel-question-card">
              <div className="wheel-question-theme">
                <span className="theme-icon">🎯</span>
                {selectedCategory.name}
              </div>
              <div className="wheel-question-value">
                За верный ответ: <strong>+1 балл</strong>
              </div>
              <QuestionContent
                text={activeQuestion.question}
                imageUrl={activeQuestion.imageUrl}
                textClassName="wheel-question-text"
              />
              {showAnswer && (
                <div className="wheel-question-answer">
                  <strong>📖 Ответ:</strong> {activeQuestion.answer}
                </div>
              )}
              <div className="wheel-question-actions">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAnswer((prev) => !prev)}
                  className="answer-toggle"
                >
                  {showAnswer ? 'Скрыть ответ' : 'Показать ответ'}
                </Button>
                <div className="action-buttons">
                  <Button
                    variant="success"
                    onClick={() => void resolveAnswer('success')}
                    disabled={!isHost || isResolving}
                    icon={<FaCheck />}
                  >
                    Верно
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => void resolveAnswer('fail')}
                    disabled={!isHost || isResolving}
                    icon={<FaTimes />}
                  >
                    Неверно
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!activeQuestion && !isSpinning && availableCategories.length > 0 && (
            <div className="wheel-hint">
              <img className="hint-icon" src={wheelIcon} alt="Колесо Фортуны" />
              <div className="hint-text">
                <strong>Как играть?</strong>
                <p>Нажмите «Крутить колесо», чтобы выбрать тему. Ответьте на вопрос и получите балл!</p>
              </div>
            </div>
          )}

          {availableCategories.length === 0 && (
            <div className="wheel-hint wheel-done">
              <span className="hint-icon">🏁</span>
              <div className="hint-text">
                <strong>Игра завершена!</strong>
                <p>Все темы пройдены. Нажмите «Завершить игру» для выхода.</p>
              </div>
            </div>
          )}

          {selectedCategory && !nextQuestionInCategory && (
            <div className="wheel-hint warning">
              <span className="hint-icon">⚠️</span>
              <div className="hint-text">
                <strong>Тема завершена!</strong>
                <p>Все вопросы в этой теме отвечены. Крутите колесо снова!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};