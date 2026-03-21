import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../shared/ui/Button/Button';
import { Modal } from '../../shared/ui/Modal/Modal';
import { Input } from '../../shared/ui/Input/Input';
import './GamePage.css';
import { useAppSelector } from '../../app/store/hooks';
import { selectAuthUser } from '../../features/auth/model/selectors';
import {
  answerQuestionApi,
  answerQuestionWithBodyApi,
  addTeamApi,
  finishSessionApi,
  getSessionApi,
  startSessionApi,
  revealQuizQuestionApi,
  updateScoreApi,
} from '../../features/sessions/api/sessionsApi';

interface Question {
  id: string;
  value: number;
  question: string;
  answer: string;
  isAnswered?: boolean;
}

interface Category {
  id: string;
  name: string;
  questions: Question[];
}

interface Team {
  id: string;
  name: string;
  score: number;
  players: { id?: string; userId?: string; teamId?: string; name: string; isHost?: boolean }[];
}

interface GameSession {
  id: string;
  game: {
    title: string;
    type: 'own' | 'quiz';
    categories: Category[];
    settings?: {
      timePerQuestion?: number;
      allowNegativeScores?: boolean;
    };
  };
  teams: Team[];
  status: 'waiting' | 'active' | 'paused' | 'finished';
  hostId: string;
  currentQuestionIndex?: number;
  answeredQuestions: Array<{
    categoryId: string;
    questionId: string;
    userId?: string;
    teamId?: string;
    isCorrect?: boolean;
    submittedAnswer?: string;
    scored?: boolean;
  }>;
  inviteCode: string;
  settings: {
    maxTeams: number;
    maxPlayersPerTeam: number;
    timePerQuestion: number;
    allowNegativeScores: boolean;
  };
  startedAt?: string;
  finishedAt?: string;
}

export const GamePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<GameSession | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<{ category: Category; question: Question } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const user = useAppSelector(selectAuthUser);
  const currentQuestionValue = selectedQuestion?.question.value;
  const pointsLockRef = useRef(false);
  const [isPointsLocked, setIsPointsLocked] = useState(false);
  
  useEffect(() => {
    if (!session || !user) {
      setIsHost(false);
      return;
    }
    setIsHost(session.hostId === user.id);
  }, [session, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      if (!sessionId) return;
      try {
        const s = await getSessionApi(sessionId);
        if (cancelled) return;
        setSession(s);
      } catch (e) {
        console.error(e);
        if (!cancelled) setSession(null);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const answeredSet = useMemo(() => {
    return new Set(
      (session?.answeredQuestions || []).map((a) => `${a.categoryId}:${a.questionId}`),
    );
  }, [session]);

  const allowNegativeScores = session?.settings?.allowNegativeScores ?? false;

  const myPlayer = useMemo(() => {
    if (!session || !user?.id) return undefined;
    return session.teams
      .flatMap((t) => t.players)
      .find((p) => p.userId === user.id);
  }, [session, user?.id]);

  const myTeamId = myPlayer?.teamId;

  const quizQuestionRefs = useMemo(() => {
    if (!session || session.game.type !== 'quiz') return [];
    return session.game.categories.flatMap((cat) =>
      cat.questions.map((q) => ({
        categoryId: cat.id,
        questionId: q.id,
        category: cat,
        question: q,
      })),
    );
  }, [session]);

  const currentQuizIndex = session?.currentQuestionIndex ?? 0;
  const currentQuizQuestionRef = quizQuestionRefs[currentQuizIndex];

  const [timeLeft, setTimeLeft] = useState(0);
  const [quizAnswerDraft, setQuizAnswerDraft] = useState('');
  const [newOwnTeamName, setNewOwnTeamName] = useState('');
  const [quizReview, setQuizReview] = useState<null | {
    categoryId: string;
    questionId: string;
    questionText: string;
    correctAnswer: string;
    value: number;
  }>(null);
  const quizRevealInFlightKeyRef = useRef<string | null>(null);
  const quizCountdownStartedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session) return;
    if (session.game.type !== 'quiz') return;
    if (session.status !== 'active') return;
    if (quizReview) return; // Пока показываем результаты — не трогаем таймер.

    quizCountdownStartedRef.current = null;
    setTimeLeft(session.settings?.timePerQuestion ?? 30);
    setQuizAnswerDraft('');
    quizRevealInFlightKeyRef.current = null;
  }, [session?.id, session?.currentQuestionIndex, session?.status, quizReview]);

  useEffect(() => {
    if (!session) return;
    if (session.game.type !== 'quiz') return;
    if (session.status !== 'active') return;
    if (quizReview) return;

    const interval = window.setInterval(() => {
      setTimeLeft((t) => {
        const next = Math.max(0, t - 1);
        if (t > 0 && next === 0) {
          quizCountdownStartedRef.current = `${session.currentQuestionIndex ?? 0}`;
        }
        return next;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [session?.id, session?.currentQuestionIndex, session?.status, quizReview]);

  useEffect(() => {
    if (!session) return;
    if (session.game.type !== 'quiz') return;
    if (session.status !== 'active') return;
    if (quizReview) return;
    if (timeLeft > 0) return;
    if (!currentQuizQuestionRef) return;
    if (quizCountdownStartedRef.current !== `${currentQuizIndex}`) return;

    const key = `${currentQuizQuestionRef.categoryId}:${currentQuizQuestionRef.questionId}`;
    if (quizRevealInFlightKeyRef.current === key) return;
    quizRevealInFlightKeyRef.current = key;

    // Ставим UI-режим "показать правильный ответ"
    setQuizReview({
      categoryId: currentQuizQuestionRef.categoryId,
      questionId: currentQuizQuestionRef.questionId,
      questionText: currentQuizQuestionRef.question.question,
      correctAnswer: currentQuizQuestionRef.question.answer,
      value: currentQuizQuestionRef.question.value,
    });

    revealQuizQuestionApi(session.id, currentQuizQuestionRef.categoryId, currentQuizQuestionRef.questionId)
      .then((updated) => setSession(updated))
      .catch((e) => {
        console.error(e);
        const msg = (e as any)?.response?.data?.message ?? (e as any)?.message ?? '';
        if (typeof msg === 'string' && msg.toLowerCase().includes('текущ')) {
          // Другой участник уже раскрыл вопрос и продвинул индекс на сервере.
          return;
        }
        alert('Не удалось показать правильный ответ');
      })
      .finally(() => {
        // Переходим к следующему вопросу после небольшого отображения результата
        window.setTimeout(() => {
          setQuizReview(null);
          setQuizAnswerDraft('');
          quizRevealInFlightKeyRef.current = null;
        }, 1500);
      });
  }, [
    session?.id,
    session?.currentQuestionIndex,
    session?.status,
    quizReview,
    timeLeft,
    currentQuizIndex,
    currentQuizQuestionRef,
  ]);

  const handleQuestionClick = (category: Category, question: Question) => {
    const isAlreadySelected =
      selectedQuestion?.category.id === category.id &&
      selectedQuestion?.question.id === question.id;

    const answeredKey = `${category.id}:${question.id}`;
    if (answeredSet.has(answeredKey) || isAlreadySelected) return;
    pointsLockRef.current = false;
    setIsPointsLocked(false);
    setSelectedQuestion({ category, question });
    setShowAnswer(false);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleCloseQuestion = () => {
    if (!selectedQuestion || !session) return;

    // Фиксируем закрытие на сервере (дубли запрещены на уровне backend)
    answerQuestionApi(session.id, selectedQuestion.category.id, selectedQuestion.question.id)
      .then((updated) => setSession(updated))
      .catch((e) => {
        console.error(e);
        alert('Не удалось закрыть вопрос');
      })
      .finally(() => {
        pointsLockRef.current = false;
        setIsPointsLocked(false);
        setSelectedQuestion(null);
        setShowAnswer(false);
      });
  };

  const handleModalClose = () => {
    pointsLockRef.current = false;
    setIsPointsLocked(false);
    setSelectedQuestion(null);
    setShowAnswer(false);
  };

  const handleAddScore = (teamId: string, points: number) => {
    if (!session) return;
    if (pointsLockRef.current) return;
    pointsLockRef.current = true;
    setIsPointsLocked(true);

    updateScoreApi(session.id, { teamId, points })
      .then((updated) => setSession(updated))
      .catch((e) => {
        console.error(e);
        alert('Не удалось начислить очки');
      })
      .finally(() => {
        pointsLockRef.current = false;
        setIsPointsLocked(false);
      });
  };

  const handleSubtractScore = (teamId: string, points: number) => {
    if (!session) return;
    if (pointsLockRef.current) return;
    pointsLockRef.current = true;
    setIsPointsLocked(true);

    updateScoreApi(session.id, { teamId, points: -points })
      .then((updated) => setSession(updated))
      .catch((e) => {
        console.error(e);
        alert('Не удалось снять очки');
      })
      .finally(() => {
        pointsLockRef.current = false;
        setIsPointsLocked(false);
      });
  };

  if (!session) {
    return <div className="loading">Загрузка...</div>;
  }

  const maxOwnRows = Math.max(...session.game.categories.map((c) => c.questions.length), 0);

  if (session.status === 'waiting') {
    return (
      <div className="game-page lobby">
        <div className="game-container">
          <h1 className="game-title">{session.game.title}</h1>
          <div className="session-info">
            <p>Код приглашения: <strong>{session.inviteCode}</strong></p>
          </div>

          <div className="teams-section">
            <h2>Команды ({session.teams.length})</h2>
            <div className="teams-list">
              {session.teams.map((team) => (
                <div key={team.id} className="team-item">
                  <span className="team-name">{team.name}</span>
                  <span className="team-players">
                    👥 {team.players.length} {team.players.length === 1 ? 'игрок' : 'игроков'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="game-actions">
              <Button
                variant="primary"
                size="large"
                disabled={session.teams.length < 1}
                onClick={() => {
                  startSessionApi(session.id)
                    .then((updated) => setSession(updated))
                    .catch((e) => {
                      console.error(e);
                      alert('Не удалось начать игру');
                    });
                }}
              >
                Начать игру
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (session.status === 'finished') {
    return (
      <div className="game-page finished">
        <div className="game-header">
          <div className="game-info">
            <span className="game-title-header">{session.game.title}</span>
            <span className="game-code">Код: {session.inviteCode}</span>
          </div>
          {isHost && <span className="game-finished-note">Игра завершена</span>}
        </div>

        <div className="game-content">
          <div className="teams-scoreboard">
            <h3>Игра завершена</h3>
            <div className="scoreboard-list">
              {session.teams.map((team) => (
                <div key={team.id} className="scoreboard-row">
                  <div className="team-info">
                    <span className="team-name">{team.name}</span>
                    <span className="team-score">{team.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (session.game.type === 'quiz') {
    const total = quizQuestionRefs.length;
    const q = currentQuizQuestionRef;

    if (!q) {
      return (
        <div className="game-page quiz-active">
          <div className="game-header">
            <div className="game-info">
              <span className="game-title-header">{session.game.title}</span>
              <span className="game-code">Код: {session.inviteCode}</span>
            </div>
          </div>
          <div className="quiz-empty">Вопросы не найдены.</div>
        </div>
      );
    }

    const myCurrentSubmission = session.answeredQuestions.find(
      (aq) =>
        aq.userId === user?.id &&
        aq.categoryId === q.categoryId &&
        aq.questionId === q.questionId,
    );

    const quizReviewIndex =
      quizReview?.questionId
        ? quizQuestionRefs.findIndex((x) => x.questionId === quizReview.questionId && x.categoryId === quizReview.categoryId)
        : -1;

    const correctTeamsForReview =
      quizReview
        ? new Set(
            session.answeredQuestions
              .filter(
                (aq) =>
                  aq.categoryId === quizReview.categoryId &&
                  aq.questionId === quizReview.questionId &&
                  Boolean(aq.teamId) &&
                  aq.isCorrect &&
                  aq.scored,
              )
              .map((aq) => aq.teamId as string),
          )
        : new Set<string>();

    return (
      <div className="game-page quiz-active">
        <div className="game-header">
          <div className="game-info">
            <span className="game-title-header">{session.game.title}</span>
            <span className="game-code">Код: {session.inviteCode}</span>
          </div>
          {isHost && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                finishSessionApi(session.id)
                  .then((updated) => setSession(updated))
                  .catch((e) => {
                    console.error(e);
                    alert('Не удалось завершить игру');
                  });
              }}
            >
              Завершить игру
            </Button>
          )}
        </div>

        <div className="quiz-content">
          <div className="quiz-meta">
            <span>
              Вопрос{' '}
              {quizReview
                ? `${Math.min(quizReviewIndex + 1, total)}/${total}`
                : `${Math.min(currentQuizIndex + 1, total)}/${total}`}
            </span>
            {!quizReview && (
              <span>
                Время: <strong>{timeLeft}s</strong>
              </span>
            )}
          </div>

          {quizReview ? (
            <div className="quiz-answer-block">
              <div className="quiz-answer">
                <strong>Правильный ответ:</strong> {quizReview.correctAnswer}
              </div>

              <div className="quiz-results">
                <div className="quiz-results-title">Результаты</div>
                {session.teams.map((team) => {
                  const isCorrectTeam = correctTeamsForReview.has(team.id);
                  return (
                    <div key={team.id} className="quiz-team-result">
                      <span className="quiz-team-name">{team.name}</span>
                      <span className="quiz-team-score">{team.score}</span>
                      <span className="quiz-team-correct">{isCorrectTeam ? '✅' : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="quiz-card">
              <div className="quiz-question">{q.question.question}</div>

              <div className="quiz-answer-input">
                <Input
                  label="Ваш ответ"
                  value={quizAnswerDraft}
                  onChange={(e) => setQuizAnswerDraft(e.target.value)}
                  placeholder="Введите ответ"
                  disabled={!myTeamId || Boolean(myCurrentSubmission) || timeLeft <= 0}
                />

                <Button
                  variant="primary"
                  disabled={!myTeamId || Boolean(myCurrentSubmission) || timeLeft <= 0 || !quizAnswerDraft.trim()}
                  onClick={async () => {
                    try {
                      const updated = await answerQuestionWithBodyApi(session.id, q.categoryId, q.questionId, {
                        answer: quizAnswerDraft,
                      });
                      setSession(updated);
                    } catch (e) {
                      console.error(e);
                      alert('Не удалось отправить ответ');
                    }
                  }}
                >
                  Отправить
                </Button>

                {myCurrentSubmission ? (
                  <div className="quiz-submitted-note">
                    Ответ принят. Правильность будет показана по истечению времени.
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="game-page active">
      <div className="game-header">
        <div className="game-info">
          <span className="game-title-header">{session.game.title}</span>
          <span className="game-code">Код: {session.inviteCode}</span>
        </div>
        {isHost && (
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              finishSessionApi(session.id)
                .then((updated) => setSession(updated))
                .catch((e) => {
                  console.error(e);
                  alert('Не удалось завершить игру');
                });
            }}
          >
            Завершить игру
          </Button>
        )}

        {isHost && (
          <div className="own-team-add">
            <Input
              label="Команда (необязательно)"
              value={newOwnTeamName}
              onChange={(e) => setNewOwnTeamName(e.target.value)}
              placeholder={`Команда ${session.teams.length + 1}`}
            />
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const updated = await addTeamApi(session.id, {
                    name: newOwnTeamName || undefined,
                  });
                  setSession(updated);
                  setNewOwnTeamName('');
                } catch (e) {
                  console.error(e);
                  alert('Не удалось добавить команду');
                }
              }}
            >
              Добавить команду
            </Button>
          </div>
        )}
      </div>

      <div className="game-content">
        <div className="game-board">
          <table className="jeopardy-table">
            <thead>
              <tr>
                {session.game.categories.map((category) => (
                  <th key={category.id} className="category-header">
                    {category.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxOwnRows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {session.game.categories.map((category) => {
                    const question = category.questions[rowIndex];
                    const answeredKey = question ? `${category.id}:${question.id}` : '';
                    const isAnswered = question ? answeredSet.has(answeredKey) : false;
                    const isCurrentOpen =
                      !!question &&
                      selectedQuestion?.category.id === category.id &&
                      selectedQuestion?.question.id === question.id;
                    const isUsed = Boolean(isAnswered || isCurrentOpen);
                    
                    return (
                      <td key={category.id} className="question-cell">
                        {question && (
                          <button
                            className={`question-button ${
                              isAnswered ? 'answered' : isCurrentOpen ? 'used' : ''
                            }`}
                            onClick={() => handleQuestionClick(category, question)}
                            disabled={isUsed}
                          >
                            {!isUsed && <span className="question-button__value">{question.value}</span>}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="teams-scoreboard">
          <h3>Счет команд</h3>
          <div className="scoreboard-list">
            {session.teams.map((team) => (
              <div key={team.id} className="scoreboard-row">
                <div className="team-info">
                  <span className="team-name">{team.name}</span>
                  <span className="team-score">{team.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!selectedQuestion}
        onClose={handleModalClose}
        title={selectedQuestion?.category.name || ''}
        size="large"
        footer={
          <>
            {!showAnswer ? (
              <Button onClick={handleShowAnswer}>
                Показать ответ
              </Button>
            ) : (
              <Button onClick={handleCloseQuestion}>
                Закрыть вопрос
              </Button>
            )}
          </>
        }
      >
        {selectedQuestion && (
          <div className="question-and-points">
            <div className="question-modal">
              <div className="question-value">{selectedQuestion.question.value}</div>
              <div className="question-text">{selectedQuestion.question.question}</div>
              {showAnswer && (
                <div className="question-answer">
                  <strong>Ответ:</strong> {selectedQuestion.question.answer}
                </div>
              )}
            </div>

            <div className="points-modal" aria-label="Начисление очков командам">
              <h4 className="points-title">Начисление очков</h4>
              <div className="points-list">
                {session.teams.map((team) => (
                  <div key={team.id} className="points-team-row">
                    <div className="points-team-meta">
                      <span className="points-team-name">{team.name}</span>
                      <span className="points-team-score">{team.score}</span>
                    </div>
                    <div className="points-actions">
                      <Button
                        variant="success"
                        size="small"
                        disabled={!isHost || isPointsLocked}
                        onClick={() => handleAddScore(team.id, currentQuestionValue ?? 0)}
                      >
                        +{currentQuestionValue ?? 0}
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        disabled={!isHost || !allowNegativeScores || isPointsLocked}
                        onClick={() => handleSubtractScore(team.id, currentQuestionValue ?? 0)}
                      >
                        -{currentQuestionValue ?? 0}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};