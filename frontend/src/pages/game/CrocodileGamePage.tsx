import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { Button } from '../../shared/ui/Button/Button';
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
  const [timeLeft, setTimeLeft] = useState(gameData.timePerTerm);
  const [isActionLoading, setIsActionLoading] = useState(false);
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
        alert('Не удалось отметить термин как неугаданный');
      })
      .finally(() => {
        setIsActionLoading(false);
      });
  }, [gameStatus, isHost, crocodileState?.currentTermId, timeLeft, isActionLoading, onMarkMissed]);

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
      alert('Не удалось отметить термин как угаданный');
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
      alert('Не удалось отметить термин как неугаданный');
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
      alert('Не удалось завершить игру');
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

    return (
      <div className="crocodile-page finished">
        <div className="crocodile-results-container">
          <h1 className="results-title">Игра завершена!</h1>
          
          <div className="results-summary">
            <div className="summary-card">
              <span className="summary-value">{totalGuessed}</span>
              <span className="summary-label">Угадано</span>
            </div>
            <div className="summary-card">
              <span className="summary-value">{totalNotGuessed}</span>
              <span className="summary-label">Не угадано</span>
            </div>
            <div className="summary-card">
              <span className="summary-value">{percentage}%</span>
              <span className="summary-label">Точность</span>
            </div>
          </div>

          <div className="results-details">
            <div className="results-section">
              <h3>Результаты по терминам</h3>
              <div className="terms-list">
                {orderedTerms.map((term, index) => (
                  <div
                    key={term.id}
                    className={`term-item ${term.result === 'guessed' ? 'guessed' : 'not-guessed'}`}
                  >
                    <span className="term-number">{index + 1}</span>
                    <span className="term-name">{term.term}</span>
                    <span className="term-status-icon">
                      {term.result === 'guessed' ? <FaCheckCircle /> : <FaTimesCircle />}
                    </span>
                  </div>
                ))}
                {orderedTerms.length === 0 && (
                  <div className="empty-terms">Нет результатов</div>
                )}
              </div>
            </div>
          </div>

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