import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCheckCircle, FaTimesCircle, FaStar } from 'react-icons/fa';
import { Button } from '../../shared/ui/Button/Button';
import { useDialogs } from '../../shared/ui/DialogProvider';
import './CrocodileGamePage.css';

interface Term {
  id: string;
  term: string;
  isGuessed: boolean;
}

interface CrocodileGameData {
  id: string;
  title: string;
  terms: Term[];
  timePerTerm: number;
  status: 'waiting' | 'active' | 'finished';
}

interface CrocodileState {
  termOrder: string[];
  currentTermId: string | null;
  turnEndsAt: string | null;
  termResults: Array<{
    termId: string;
    result: 'guessed' | 'missed';
  }>;
}

interface CrocodileGamePageProps {
  sessionId: string;
  gameData: CrocodileGameData;
  isHost: boolean;
  crocodileState?: CrocodileState | null;
  onStart: () => Promise<void> | void;
  onMarkGuessed: (termId: string) => Promise<void> | void;
  onMarkMissed: (termId: string) => Promise<void> | void;
  onFinish: () => Promise<void> | void;
}

export const CrocodileGamePage: React.FC<CrocodileGamePageProps> = ({
  sessionId: _sessionId,
  gameData,
  isHost,
  crocodileState,
  onStart,
  onMarkGuessed,
  onMarkMissed,
  onFinish
}) => {
  const { showAlert } = useDialogs();
  const [timeLeft, setTimeLeft] = useState(gameData.timePerTerm);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [hoveredTermId, setHoveredTermId] = useState<string | null>(null);
  const [hoveredStatCard, setHoveredStatCard] = useState<string | null>(null);
  const autoMissTermRef = useRef<string | null>(null);

  const termsMap = useMemo(
    () => new Map(gameData.terms.map((term) => [term.id, term])),
    [gameData.terms],
  );

  const termResultsMap = useMemo(() => {
    const map = new Map<string, 'guessed' | 'missed'>();
    for (const item of crocodileState?.termResults ?? []) {
      map.set(item.termId, item.result);
    }
    return map;
  }, [crocodileState?.termResults]);

  const currentTerm = crocodileState?.currentTermId
    ? termsMap.get(crocodileState.currentTermId) ?? null
    : null;

  const guessedCount = (crocodileState?.termResults ?? []).filter((item) => item.result === 'guessed').length;
  const missedCount = (crocodileState?.termResults ?? []).filter((item) => item.result === 'missed').length;
  const totalResolved = guessedCount + missedCount;
  const gameStatus = gameData.status;

  useEffect(() => {
    if (gameStatus !== 'active' || !crocodileState?.turnEndsAt || !crocodileState.currentTermId) {
      setTimeLeft(gameData.timePerTerm);
      return;
    }

    const getTimeLeft = () => {
      const ms = new Date(crocodileState.turnEndsAt as string).getTime() - Date.now();
      return Math.max(0, Math.ceil(ms / 1000));
    };

    setTimeLeft(getTimeLeft());
    const interval = window.setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 250);

    return () => window.clearInterval(interval);
  }, [gameStatus, crocodileState?.turnEndsAt, crocodileState?.currentTermId, gameData.timePerTerm]);

  useEffect(() => {
    const termId = crocodileState?.currentTermId;
    if (gameStatus !== 'active' || !isHost || !termId) return;
    if (timeLeft > 0) return;
    if (isActionLoading) return;
    if (autoMissTermRef.current === termId) return;

    autoMissTermRef.current = termId;
    setIsActionLoading(true);
    Promise.resolve(onMarkMissed(termId))
      .catch((e) => {
        console.error(e);
        void showAlert('Не удалось отметить термин как неугаданный');
      })
      .finally(() => {
        setIsActionLoading(false);
      });
  }, [gameStatus, isHost, crocodileState?.currentTermId, timeLeft, isActionLoading, onMarkMissed, showAlert]);

  useEffect(() => {
    autoMissTermRef.current = null;
  }, [crocodileState?.currentTermId]);

  const handleMarkGuessed = async () => {
    if (!currentTerm) return;
    setIsActionLoading(true);
    try {
      await onMarkGuessed(currentTerm.id);
    } catch (e) {
      console.error(e);
      await showAlert('Не удалось отметить термин как угаданный');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkMissed = async () => {
    if (!currentTerm) return;
    setIsActionLoading(true);
    try {
      await onMarkMissed(currentTerm.id);
    } catch (e) {
      console.error(e);
      await showAlert('Не удалось отметить термин как неугаданный');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFinish = async () => {
    setIsActionLoading(true);
    try {
      await onFinish();
    } catch (e) {
      console.error(e);
      await showAlert('Не удалось завершить игру');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (gameStatus === 'waiting') {
    return (
      <div className="crocodile-page waiting">
        <div className="crocodile-container">
          <h1 className="crocodile-title">{gameData.title}</h1>
          <div className="crocodile-info">
            <p>Количество терминов: <strong>{gameData.terms.length}</strong></p>
            <p>Время на термин: <strong>{gameData.timePerTerm} секунд</strong></p>
          </div>
          {isHost && (
            <div className="crocodile-actions">
              <Button variant="primary" size="large" onClick={() => void onStart()}>
                Начать игру
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameStatus === 'active' && currentTerm) {
    const progress = (totalResolved / Math.max(1, gameData.terms.length)) * 100;

    return (
      <div className="crocodile-page active">
        <div className="crocodile-header">
          <div className="crocodile-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">
              {totalResolved} / {gameData.terms.length}
            </span>
          </div>
          {isHost && (
            <Button variant="secondary" size="small" onClick={() => void handleFinish()} disabled={isActionLoading}>
              Завершить игру
            </Button>
          )}
        </div>

        <div className="crocodile-game-area">
          <div className="crocodile-timer">
            <div className={`timer-circle ${timeLeft <= 5 ? 'warning' : ''}`}>
              <span className="timer-value">{timeLeft}</span>
              <span className="timer-label">секунд</span>
            </div>
          </div>

          <div className="crocodile-term-card">
            <div className="term-text">{currentTerm.term}</div>
          </div>

          <div className="crocodile-actions-buttons">
            <Button 
              variant="success" 
              size="large" 
              onClick={() => void handleMarkGuessed()}
              className="guess-button"
              disabled={isActionLoading}
            >
              <FaCheckCircle /> Угадали
            </Button>
            <Button 
              variant="danger" 
              size="large" 
              onClick={() => void handleMarkMissed()}
              className="skip-button"
              disabled={isActionLoading}
            >
              <FaTimesCircle /> Не угадали
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (gameStatus === 'finished') {
    const totalGuessed = guessedCount;
    const totalNotGuessed = missedCount;
    const total = crocodileState?.termOrder.length ?? gameData.terms.length;
    const percentage = total > 0 ? Math.round((totalGuessed / total) * 100) : 0;
    const orderedTerms = (crocodileState?.termOrder ?? gameData.terms.map((term) => term.id))
      .map((termId) => {
        const term = termsMap.get(termId);
        if (!term) return null;
        return {
          ...term,
          result: termResultsMap.get(termId) ?? 'missed',
        };
      })
      .filter(Boolean) as Array<Term & { result: 'guessed' | 'missed' }>;

    // Группировка терминов по результатам
    const guessedTerms = orderedTerms.filter(term => term.result === 'guessed');
    const missedTerms = orderedTerms.filter(term => term.result === 'missed');

    // Функция для получения оценки на основе процента
    const getGrade = (percent: number) => {
      if (percent >= 90) return { text: 'Отлично!', emoji: '🌟', color: '#ffd700' };
      if (percent >= 70) return { text: 'Хорошо!', emoji: '👍', color: '#52c41a' };
      if (percent >= 50) return { text: 'Неплохо', emoji: '📚', color: '#faad14' };
      if (percent >= 30) return { text: 'Можно лучше', emoji: '💪', color: '#ff7a45' };
      return { text: 'Попробуйте еще раз', emoji: '🎯', color: '#ff4d4f' };
    };

    const grade = getGrade(percentage);

    return (
      <div className="crocodile-page finished">
        <div className="crocodile-results-container">
          <h1 className="results-title">Игра завершена!</h1>
          
          <div className="results-summary">
            <div 
              className={`summary-card ${hoveredStatCard === 'guessed' ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredStatCard('guessed')}
              onMouseLeave={() => setHoveredStatCard(null)}
            >
              <span className="summary-value">{totalGuessed}</span>
              <span className="summary-label">Угадано</span>
            </div>
            <div 
              className={`summary-card ${hoveredStatCard === 'missed' ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredStatCard('missed')}
              onMouseLeave={() => setHoveredStatCard(null)}
            >
              <span className="summary-value">{totalNotGuessed}</span>
              <span className="summary-label">Не угадано</span>
            </div>
            <div 
              className={`summary-card percentage-card ${hoveredStatCard === 'percentage' ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredStatCard('percentage')}
              onMouseLeave={() => setHoveredStatCard(null)}
            >
              <span className="summary-value" style={{ color: grade.color }}>{percentage}%</span>
              <span className="summary-label">Точность</span>
            </div>
          </div>

          <div className="results-details">
            
            <div className={`results-section guessed ${hoveredTermId === 'guessed-section' ? 'hovered' : ''}`}
                 onMouseEnter={() => setHoveredTermId('guessed-section')}
                 onMouseLeave={() => setHoveredTermId(null)}>
              <h3>
                <FaCheckCircle className="section-icon" /> 
                Угаданные термины 
                <span className="section-count">{guessedTerms.length}</span>
              </h3>
              <div className="terms-list">
                {guessedTerms.length > 0 ? (
                  guessedTerms.map((term, index) => (
                    <div
                      key={term.id}
                      className={`term-item guessed ${hoveredTermId === term.id ? 'hovered' : ''}`}
                      onMouseEnter={() => setHoveredTermId(term.id)}
                      onMouseLeave={() => setHoveredTermId(null)}
                    >
                      <span className="term-number">{index + 1}</span>
                      <span className="term-name">{term.term}</span>
                      <span className="term-status-icon">
                        <FaCheckCircle className="status-success" />
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-terms">
                    <FaTimesCircle className="empty-icon" />
                    <p>Нет угаданных терминов</p>
                  </div>
                )}
              </div>
            </div>

            
            <div className={`results-section not-guessed ${hoveredTermId === 'missed-section' ? 'hovered' : ''}`}
                 onMouseEnter={() => setHoveredTermId('missed-section')}
                 onMouseLeave={() => setHoveredTermId(null)}>
              <h3>
                <FaTimesCircle className="section-icon" /> 
                Не угаданные термины 
                <span className="section-count">{missedTerms.length}</span>
              </h3>
              <div className="terms-list">
                {missedTerms.length > 0 ? (
                  missedTerms.map((term, index) => (
                    <div
                      key={term.id}
                      className={`term-item not-guessed ${hoveredTermId === term.id ? 'hovered' : ''}`}
                      onMouseEnter={() => setHoveredTermId(term.id)}
                      onMouseLeave={() => setHoveredTermId(null)}
                    >
                      <span className="term-number">{index + 1}</span>
                      <span className="term-name">{term.term}</span>
                      <span className="term-status-icon">
                        <FaTimesCircle className="status-error" />
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-terms success-empty">
                    <FaCheckCircle className="empty-icon success" />
                    <p>Все термины угаданы!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          
          {missedTerms.length > 0 && (
            <div className="practice-tip">
              <FaStar className="tip-icon" />
              <div className="tip-content">
                <h4>Рекомендуем повторить:</h4>
                <p>{missedTerms.map(t => t.term).join(' • ')}</p>
              </div>
            </div>
          )}

          <div className="results-actions">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Обновить страницу
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <div className="crocodile-page loading">Загрузка...</div>;
};