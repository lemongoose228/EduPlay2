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
  addTeamApi,
  finishSessionApi,
  getSessionApi,
  markCrocodileGuessedApi,
  markCrocodileMissedApi,
  startSessionApi,
  updateScoreApi,
} from '../../features/sessions/api/sessionsApi';
import { CrocodileGamePage } from './CrocodileGamePage';
import { WheelGamePage } from './WheelGamePage';
import { StationGamePage } from './StationGamePage';
import {
  getSessionsSocket,
  waitForSessionsSocketConnected,
} from '../../features/sessions/api/sessionsSocket';
import { FaTrophy, FaDownload, FaChartBar } from 'react-icons/fa';
import { useDialogs } from '../../shared/ui/DialogProvider';

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
    type: 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station';
    categories: Category[];
    settings?: {
      timePerQuestion?: number;
      timePerTerm?: number;
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
  
  multiplayer?: boolean | null;
  settings: {
    maxTeams: number;
    maxPlayersPerTeam: number;
    timePerQuestion: number;
    timePerTerm?: number;
    allowNegativeScores: boolean;
  };
  crocodileState?: {
    termOrder: string[];
    currentTermId: string | null;
    turnEndsAt: string | null;
    termResults: Array<{ termId: string; result: 'guessed' | 'missed' }>;
  } | null;
  questionStartedAt?: string | null;
  startedAt?: string;
  finishedAt?: string;
}

export const GamePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showAlert } = useDialogs();
  const [session, setSession] = useState<GameSession | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<{ category: Category; question: Question } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const user = useAppSelector(selectAuthUser);
  const currentQuestionValue = selectedQuestion?.question.value;
  const pointsLockRef = useRef(false);
  const [isPointsLocked, setIsPointsLocked] = useState(false);
  const [isQuizStartPending, setIsQuizStartPending] = useState(false);
  const [submittedLocks, setSubmittedLocks] = useState<string[]>([]);
  const [submitSavedKey, setSubmitSavedKey] = useState<string | null>(null);
  
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

  useEffect(() => {
    if (!sessionId) return;

    const socket = getSessionsSocket();
    const handleState = (payload: GameSession) => {
      if (payload?.id !== sessionId) return;
      setSession(payload);
    };
    const handleRevealed = (payload: {
      categoryId: string;
      questionId: string;
      questionText: string;
      correctAnswer: string;
      value: number;
      reason?: 'manual' | 'timer';
    }) => {
      if (payload.reason === 'timer') {
        setQuizReview(null);
        setQuizAnswerDraft('');
        return;
      }
      setQuizReview({
        categoryId: payload.categoryId,
        questionId: payload.questionId,
        questionText: payload.questionText,
        correctAnswer: payload.correctAnswer,
        value: payload.value,
      });
      if (quizReviewTimeoutRef.current) {
        window.clearTimeout(quizReviewTimeoutRef.current);
      }
      quizReviewTimeoutRef.current = window.setTimeout(() => {
        setQuizReview(null);
        setQuizAnswerDraft('');
      }, 1500);
    };
    const handleSessionError = (payload?: { message?: string }) => {
      const message = payload?.message?.trim()
        ? payload.message
        : 'Ошибка обработки игрового события';
      void showAlert(message);
    };

    const joinPayload = { sessionId };
    const joinAndSync = () => {
      socket.emit('session:join', joinPayload);
      socket.emit('session:state:request', joinPayload);
    };

    socket.on('connect', joinAndSync);
    socket.on('session:state', handleState);
    socket.on('quiz:revealed', handleRevealed);
    socket.on('session:error', handleSessionError);

    if (socket.connected) {
      joinAndSync();
    } else {
      socket.connect();
    }

    return () => {
      socket.emit('session:leave', { sessionId });
      socket.off('connect', joinAndSync);
      socket.off('session:state', handleState);
      socket.off('quiz:revealed', handleRevealed);
      socket.off('session:error', handleSessionError);
      if (quizReviewTimeoutRef.current) {
        window.clearTimeout(quizReviewTimeoutRef.current);
        quizReviewTimeoutRef.current = null;
      }
    };
  }, [sessionId, showAlert]);

  const handleStartQuizSession = async () => {
    if (!session) return;
    setIsQuizStartPending(true);

    try {
      const socket = await waitForSessionsSocketConnected(2000);
      socket.emit('quiz:start', { sessionId: session.id });

      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      const latest = await getSessionApi(session.id);
      if (latest.status === 'active') {
        setSession(latest);
        return;
      }

      const updated = await startSessionApi(session.id);
      setSession(updated);
    } catch (e) {
      console.error(e);
      try {
        const updated = await startSessionApi(session.id);
        setSession(updated);
      } catch (fallbackError) {
        console.error(fallbackError);
        await showAlert('Не удалось начать игру');
      }
    } finally {
      setIsQuizStartPending(false);
    }
  };

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
  const quizReviewTimeoutRef = useRef<number | null>(null);
  const quizQuestionStartedAtRef = useRef<{ key: string; startedAtMs: number } | null>(null);

  const getQuestionTimerStorageKey = (sessionValue: GameSession) =>
    `quiz:startAt:${sessionValue.id}:${
      sessionValue.startedAt ? new Date(sessionValue.startedAt).getTime() : 'nostart'
    }:${sessionValue.currentQuestionIndex ?? 0}`;

  useEffect(() => {
    if (!session || session.game.type !== 'quiz') return;
    if (session.status !== 'active' || quizReview) {
      setTimeLeft(0);
      return;
    }
    if (!currentQuizQuestionRef) {
      setTimeLeft(0);
      return;
    }

    const key = getQuestionTimerStorageKey(session);
    const timePerQuestion = session.settings?.timePerQuestion ?? 30;
    const persisted = window.sessionStorage.getItem(key);
    const serverStartedAt = session.questionStartedAt
      ? new Date(session.questionStartedAt).getTime()
      : Number.NaN;
    const cachedStartedAt =
      quizQuestionStartedAtRef.current?.key === key
        ? quizQuestionStartedAtRef.current.startedAtMs
        : Number.NaN;

    let startedAtMs = Number.NaN;
    if (Number.isFinite(serverStartedAt)) {
      startedAtMs = serverStartedAt;
      window.sessionStorage.setItem(key, String(serverStartedAt));
    } else if (Number.isFinite(cachedStartedAt)) {
      startedAtMs = cachedStartedAt;
    } else if (persisted) {
      const parsed = Number(persisted);
      if (Number.isFinite(parsed)) {
        startedAtMs = parsed;
      }
    }

    if (!Number.isFinite(startedAtMs)) {
      startedAtMs = Date.now();
      window.sessionStorage.setItem(key, String(startedAtMs));
    }

    quizQuestionStartedAtRef.current = { key, startedAtMs };

    const recalc = () => {
      const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
      setTimeLeft(Math.max(0, timePerQuestion - elapsed));
    };

    recalc();
    const interval = window.setInterval(recalc, 250);
    return () => window.clearInterval(interval);
  }, [
    session?.id,
    session?.status,
    session?.game.type,
    session?.currentQuestionIndex,
    session?.questionStartedAt,
    session?.settings?.timePerQuestion,
    currentQuizQuestionRef?.categoryId,
    currentQuizQuestionRef?.questionId,
    quizReview,
  ]);

  useEffect(() => {
    if (!session || session.game.type !== 'quiz') return;
    setQuizAnswerDraft('');
    quizQuestionStartedAtRef.current = null;
  }, [session?.id, session?.currentQuestionIndex, session?.status, session?.game.type]);

  useEffect(() => {
    if (!session || session.game.type !== 'quiz') return;
    const key = currentQuizQuestionRef
      ? `${currentQuizQuestionRef.categoryId}:${currentQuizQuestionRef.questionId}`
      : null;
    if (submitSavedKey && key !== submitSavedKey) {
      setSubmitSavedKey(null);
    }
  }, [
    session?.id,
    session?.currentQuestionIndex,
    session?.game.type,
    currentQuizQuestionRef?.categoryId,
    currentQuizQuestionRef?.questionId,
    submitSavedKey,
  ]);

  useEffect(() => {
    if (!session || !user?.id) return;
    const serverSubmittedKeys = session.answeredQuestions
      .filter((aq) => aq.userId === user.id)
      .map((aq) => `${aq.categoryId}:${aq.questionId}`);

    if (!serverSubmittedKeys.length) return;
    setSubmittedLocks((prev) => {
      const merged = new Set([...prev, ...serverSubmittedKeys]);
      return Array.from(merged);
    });
  }, [session?.answeredQuestions, user?.id]);

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

    answerQuestionApi(session.id, selectedQuestion.category.id, selectedQuestion.question.id)
      .then((updated) => setSession(updated))
      .catch((e) => {
        console.error(e);
        void showAlert('Не удалось закрыть вопрос');
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
        void showAlert('Не удалось начислить очки');
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
        void showAlert('Не удалось снять очки');
      })
      .finally(() => {
        pointsLockRef.current = false;
        setIsPointsLocked(false);
      });
  };

  if (!session) {
    return <div className="loading">Загрузка...</div>;
  }

  const showInviteCode =
    (session.multiplayer ?? session.game.type === 'quiz') && Boolean(session.inviteCode?.trim());

  if (session.game.type === 'crocodile') {
    const crocodileGameData = {
      id: session.id,
      title: session.game.title,
      terms: session.game.categories.flatMap((cat) =>
        cat.questions.map((q) => ({
          id: q.id,
          term: q.question,
          isGuessed: false,
        })),
      ),
      timePerTerm: session.settings?.timePerTerm ?? session.game.settings?.timePerTerm ?? 30,
      status: session.status as 'waiting' | 'active' | 'finished',
    };

    return (
      <CrocodileGamePage
        sessionId={session.id}
        gameData={crocodileGameData}
        isHost={isHost}
        crocodileState={session.crocodileState}
        onStart={async () => {
          try {
            const updated = await startSessionApi(session.id);
            setSession(updated);
          } catch (e) {
            console.error(e);
            await showAlert('Не удалось начать игру');
          }
        }}
        onMarkGuessed={async (termId) => {
          const updated = await markCrocodileGuessedApi(session.id, { termId });
          setSession(updated);
        }}
        onMarkMissed={async (termId) => {
          const updated = await markCrocodileMissedApi(session.id, { termId });
          setSession(updated);
        }}
        onFinish={() => {
          finishSessionApi(session.id)
            .then((updated) => setSession(updated))
            .catch((e) => {
              console.error(e);
              void showAlert('Не удалось завершить игру');
            });
        }}
      />
    );
  }

  if (session.game.type === 'wheel' && session.status === 'active') {
    return (
      <div className="game-page active">
        <WheelGamePage
          title={session.game.title}
          categories={session.game.categories}
          teams={session.teams}
          answeredKeys={answeredSet}
          isHost={isHost}
          onSuccess={async (categoryId, questionId) => {
            const soloTeam = session.teams[0];
            if (soloTeam) {
              const scored = await updateScoreApi(session.id, { teamId: soloTeam.id, points: 1 });
              setSession(scored);
            }
            const answered = await answerQuestionApi(session.id, categoryId, questionId);
            setSession(answered);
          }}
          onFail={async (_categoryId, _questionId) => {
            const fresh = await getSessionApi(session.id);
            setSession(fresh);
          }}
          onFinish={async () => {
            const updated = await finishSessionApi(session.id);
            setSession(updated);
          }}
        />
      </div>
    );
  }

  if (session.game.type === 'station' && session.status !== 'finished') {
    return (
      <StationGamePage
        session={session}
        isHost={isHost}
        onStart={async () => {
          const updated = await startSessionApi(session.id);
          setSession(updated);
        }}
        onFinish={async () => {
          const updated = await finishSessionApi(session.id);
          setSession(updated);
        }}
      />
    );
  }

  const maxOwnRows = Math.max(...session.game.categories.map((c) => c.questions.length), 0);

  const sanitizeFileNamePart = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  if (session.status === 'waiting') {
    return (
      <div className="game-page lobby">
        <div className="game-container">
          <h1 className="game-title">{session.game.title}</h1>
          {showInviteCode ? (
            <div className="session-info">
              <p>
                Код приглашения: <strong>{session.inviteCode}</strong>
              </p>
            </div>
          ) : null}

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
                disabled={session.teams.length < 1 || isQuizStartPending}
                onClick={() => {
                  if (session.game.type === 'quiz') {
                    void handleStartQuizSession();
                    return;
                  }

                  startSessionApi(session.id)
                    .then((updated) => setSession(updated))
                    .catch((e) => {
                      console.error(e);
                      void showAlert('Не удалось начать игру');
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

  // Стилизованная страница завершения игры (как у крокодила)
  if (session.status === 'finished') {
    if (session.game.type === 'station') {
      const getStationStatsStorageKey = (id: string) => `station-stats:${id}`;
      let stationStats: {
        completedStations: number;
        totalStations: number;
        attempts: number;
        errors: number;
        elapsedSec: number;
        manuallyFinished?: boolean;
      } | null = null;

      try {
        const raw = sessionStorage.getItem(getStationStatsStorageKey(session.id));
        if (raw) {
          stationStats = JSON.parse(raw);
        }
      } catch {
        stationStats = null;
      }

      const totalStations = session.game.categories[0]?.questions?.length ?? 0;
      const completedStations = stationStats?.completedStations ?? 0;
      const attempts = stationStats?.attempts ?? 0;
      const errors = stationStats?.errors ?? 0;
      const elapsedSec =
        stationStats?.elapsedSec ??
        (session.startedAt && session.finishedAt
          ? Math.max(
              0,
              Math.floor(
                (new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 1000,
              ),
            )
          : 0);
      const minutes = Math.floor(elapsedSec / 60)
        .toString()
        .padStart(2, '0');
      const seconds = (elapsedSec % 60).toString().padStart(2, '0');

      const handleExportStationResults = () => {
        const finishedAtRaw = session.finishedAt ?? new Date().toISOString();
        const finishedAt = new Date(finishedAtRaw);
        const finishedAtText = Number.isNaN(finishedAt.getTime())
          ? finishedAtRaw
          : finishedAt.toLocaleString('ru-RU');
        const startedAtText = session.startedAt
          ? new Date(session.startedAt).toLocaleString('ru-RU')
          : 'Не указано';

        const report = [
          'Результаты игровой сессии',
          '',
          `Игра: ${session.game.title}`,
          `Тип игры: станции`,
          `ID сессии: ${session.id}`,
          `Старт: ${startedAtText}`,
          `Завершение: ${finishedAtText}`,
          '',
          'Статистика прохождения:',
          `Пройдено станций: ${completedStations} / ${totalStations}`,
          `Время игры: ${minutes}:${seconds}`,
          `Попыток: ${attempts}`,
          `Ошибок: ${errors}`,
          stationStats?.manuallyFinished ? 'Примечание: сессия завершена ведущим до прохождения всех станций.' : '',
        ]
          .filter((line) => line !== '')
          .join('\n');

        const titlePart = sanitizeFileNamePart(session.game.title) || 'game';
        const fileName = `results-${titlePart}-${session.id.slice(0, 8)}.txt`;
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      return (
        <div className="game-page game-finished">
          <div className="game-results-container">
            <h1 className="results-title">Игра завершена!</h1>
            <div className="leaderboard-section">
              <h3>
                <FaChartBar style={{ color: '#667eea' }} />
                Статистика прохождения станций
              </h3>
              <div className="leaderboard-list">
                <div className="leaderboard-row">
                  <div className="leaderboard-team-info">
                    <span className="team-name-result">Пройдено станций</span>
                    <span className="team-score-result">
                      {completedStations} / {totalStations}
                    </span>
                  </div>
                </div>
                <div className="leaderboard-row">
                  <div className="leaderboard-team-info">
                    <span className="team-name-result">Время игры</span>
                    <span className="team-score-result">{minutes}:{seconds}</span>
                  </div>
                </div>
                <div className="leaderboard-row">
                  <div className="leaderboard-team-info">
                    <span className="team-name-result">Попыток</span>
                    <span className="team-score-result">{attempts}</span>
                  </div>
                </div>
                <div className="leaderboard-row">
                  <div className="leaderboard-team-info">
                    <span className="team-name-result">Ошибок</span>
                    <span className="team-score-result">{errors}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="results-export">
              <Button
                variant="outline"
                className="results-export-button"
                icon={<FaDownload />}
                onClick={handleExportStationResults}
              >
                Сохранить результаты (.txt)
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const sortedTeams = [...session.teams].sort((a, b) => b.score - a.score);

    const getRankBadgeClass = (index: number) => {
      if (index === 0) return 'gold';
      if (index === 1) return 'silver';
      if (index === 2) return 'bronze';
      return '';
    };

    const handleExportResults = () => {
      const finishedAtRaw = session.finishedAt ?? new Date().toISOString();
      const finishedAt = new Date(finishedAtRaw);
      const finishedAtText = Number.isNaN(finishedAt.getTime())
        ? finishedAtRaw
        : finishedAt.toLocaleString('ru-RU');
      const startedAtText = session.startedAt
        ? new Date(session.startedAt).toLocaleString('ru-RU')
        : 'Не указано';

      const rows = sortedTeams.length
        ? sortedTeams.map((team, index) => `${index + 1}. ${team.name} — ${team.score} очков`)
        : ['Нет данных о командах'];

      const report = [
        'Результаты игровой сессии',
        '',
        `Игра: ${session.game.title}`,
        `Тип игры: ${session.game.type}`,
        `ID сессии: ${session.id}`,
        `Старт: ${startedAtText}`,
        `Завершение: ${finishedAtText}`,
        '',
        'Итоговая таблица:',
        ...rows,
      ].join('\n');

      const titlePart = sanitizeFileNamePart(session.game.title) || 'game';
      const fileName = `results-${titlePart}-${session.id.slice(0, 8)}.txt`;
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    return (
      <div className="game-page game-finished">
        <div className="game-results-container">
          <h1 className="results-title">Игра завершена!</h1>
          
          

          {/* Таблица лидеров */}
          <div className="leaderboard-section">
            <h3>
              <FaTrophy style={{ color: '#ffd700' }} />
              Итоговая таблица
            </h3>
            <div className="leaderboard-list">
              {sortedTeams.map((team, index) => (
                <div key={team.id} className="leaderboard-row">
                  <div className={`rank-badge ${getRankBadgeClass(index)}`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </div>
                  <div className="leaderboard-team-info">
                    <span className="team-name-result">{team.name}</span>
                    <span className="team-score-result">{team.score}</span>
                  </div>
                </div>
              ))}
              {sortedTeams.length === 0 && (
                <div className="empty-terms">Нет данных о командах</div>
              )}
            </div>
          </div>

          <div className="results-export">
            <Button
              variant="outline"
              className="results-export-button"
              icon={<FaDownload />}
              onClick={handleExportResults}
            >
              Сохранить результаты (.txt)
            </Button>
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
              {showInviteCode ? <span className="game-code">Код: {session.inviteCode}</span> : null}
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
    const currentQuestionKey = `${q.categoryId}:${q.questionId}`;
    const isSubmissionLocked =
      Boolean(myCurrentSubmission) || submittedLocks.includes(currentQuestionKey);

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
            {showInviteCode ? <span className="game-code">Код: {session.inviteCode}</span> : null}
          </div>
          {isHost && (
            <Button
              variant="secondary"
              size="small"
              onClick={async () => {
                try {
                  const socket = await waitForSessionsSocketConnected(2000);
                  socket.emit('session:finish', { sessionId: session.id });
                } catch (e) {
                  console.error(e);
                  await showAlert('Не удалось завершить игру');
                }
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
                  disabled={!myTeamId || isSubmissionLocked || timeLeft <= 0}
                />

                <Button
                  variant="primary"
                  disabled={!myTeamId || isSubmissionLocked || timeLeft <= 0 || !quizAnswerDraft.trim()}
                  onClick={async () => {
                    try {
                      const socket = await waitForSessionsSocketConnected(2000);
                      socket.emit('quiz:answer', {
                        sessionId: session.id,
                        categoryId: q.categoryId,
                        questionId: q.questionId,
                        answer: quizAnswerDraft,
                      });
                      setSubmittedLocks((prev) =>
                        prev.includes(currentQuestionKey)
                          ? prev
                          : [...prev, currentQuestionKey],
                      );
                      setSession((prev) => {
                        if (!prev) return prev;
                        const exists = prev.answeredQuestions.some(
                          (aq) =>
                            aq.userId === user?.id &&
                            aq.categoryId === q.categoryId &&
                            aq.questionId === q.questionId,
                        );
                        if (exists) return prev;
                        return {
                          ...prev,
                          answeredQuestions: [
                            ...prev.answeredQuestions,
                            {
                              categoryId: q.categoryId,
                              questionId: q.questionId,
                              userId: user?.id,
                              teamId: myTeamId,
                              submittedAnswer: quizAnswerDraft,
                              scored: false,
                            },
                          ],
                        };
                      });
                      setQuizAnswerDraft('');
                      setSubmitSavedKey(currentQuestionKey);
                    } catch (e) {
                      console.error(e);
                      await showAlert('Не удалось отправить ответ');
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
                {submitSavedKey === currentQuestionKey ? (
                  <div className="quiz-submitted-note">Ответ сохранён</div>
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
          {showInviteCode ? <span className="game-code">Код: {session.inviteCode}</span> : null}
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
                  void showAlert('Не удалось завершить игру');
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
                  await showAlert('Не удалось добавить команду');
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