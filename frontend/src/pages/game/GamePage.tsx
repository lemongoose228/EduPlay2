import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../shared/ui/Button/Button';
import './GamePage.css';
import { useAppSelector } from '../../app/store/hooks';
import { selectAuthUser } from '../../features/auth/model/selectors';
import {
  answerQuestionApi,
  finishSessionApi,
  getSessionApi,
  markCrocodileGuessedApi,
  markCrocodileMissedApi,
  setupTicTacToeApi,
  openTicTacToeCellApi,
  answerTicTacToeApi,
  startSessionApi,
  updateTeamApi,
} from '../../features/sessions/api/sessionsApi';
import type { GameSession } from '../../features/sessions/types/session.types';
import { CrocodileGamePage } from './CrocodileGamePage';
import { WheelGamePage } from './WheelGamePage';
import { StationGamePage } from './StationGamePage';
import { TicTacToeGamePage } from './TicTacToeGamePage';
import { TicTacToeResultsHero } from './TicTacToeResultsHero';
import { QuizGamePage } from './QuizGamePage';
import { OwnGamePage } from './OwnGamePage';
import {
  getSessionsSocket,
  waitForSessionsSocketConnected,
} from '../../features/sessions/api/sessionsSocket';
import { FaTrophy, FaDownload, FaChartBar, FaCheck, FaPen } from 'react-icons/fa';
import { useDialogs } from '../../shared/ui/DialogProvider';
import { GameFullscreenShell } from '../../shared/ui/GameFullscreenShell/GameFullscreenShell';

const sanitizeFileNamePart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const GamePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showAlert } = useDialogs();
  const [session, setSession] = useState<GameSession | null>(null);
  const [isHost, setIsHost] = useState(false);
  const user = useAppSelector(selectAuthUser);
  const [isQuizStartPending, setIsQuizStartPending] = useState(false);
  const [tictactoeDismissed, setTictactoeDismissed] = useState(false);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [isSavingTeamName, setIsSavingTeamName] = useState(false);

  useEffect(() => {
    setTictactoeDismissed(false);
  }, [sessionId]);

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
      socket.off('session:error', handleSessionError);
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

  const myPlayer = useMemo(() => {
    if (!session || !user?.id) return undefined;
    return session.teams
      .flatMap((t) => t.players)
      .find((p) => p.userId === user.id);
  }, [session, user?.id]);

  const myTeamId = myPlayer?.teamId;

  const myTeam = useMemo(() => {
    if (!session || !myTeamId) return undefined;
    return session.teams.find((t) => t.id === myTeamId);
  }, [session, myTeamId]);

  useEffect(() => {
    if (isEditingTeamName) return;
    if (!session || session.status !== 'waiting' || session.game.type !== 'quiz' || !myTeam) {
      return;
    }
    setEditingTeamName(myTeam.name);
  }, [session?.id, session?.status, session?.game?.type, myTeam?.id, myTeam?.name, isEditingTeamName]);

  const handleStartEditTeamName = () => {
    if (!myTeam) return;
    setEditingTeamName(myTeam.name);
    setIsEditingTeamName(true);
  };

  const handleSaveTeamName = async () => {
    if (!session || !myTeamId) return;
    const trimmed = editingTeamName.trim();
    if (!trimmed) {
      await showAlert('Введите название');
      return;
    }
    setIsSavingTeamName(true);
    try {
      const updated = await updateTeamApi(session.id, myTeamId, { name: trimmed });
      setSession(updated);
      setIsEditingTeamName(false);
    } catch (e) {
      console.error(e);
      await showAlert('Не удалось сохранить название');
    } finally {
      setIsSavingTeamName(false);
    }
  };

  const handleTeamNameAction = () => {
    if (isEditingTeamName) {
      void handleSaveTeamName();
      return;
    }
    handleStartEditTeamName();
  };

  if (!session) {
    return <div className="loading">Загрузка...</div>;
  }

  const renderSessionContent = (): React.ReactNode => {
    const showInviteCode =
      (session.multiplayer ?? session.game.type === 'quiz') && Boolean(session.inviteCode?.trim());

    if (session.game.type === 'tictactoe' && !(session.status === 'finished' && tictactoeDismissed)) {
      const tictactoeQuestions = session.game.categories.flatMap((cat) =>
        cat.questions.map((q) => ({
          id: q.id,
          question: q.question,
          answer: q.answer,
        })),
      );

      return (
        <TicTacToeGamePage
          title={session.game.title}
          questions={tictactoeQuestions}
          teams={session.teams.map((t) => ({ id: t.id, name: t.name }))}
          tictactoeState={session.tictactoeState}
          status={session.status}
          isHost={isHost}
          onStart={async () => {
            try {
              const updated = await startSessionApi(session.id);
              setSession(updated);
            } catch (e) {
              console.error(e);
              await showAlert('Не удалось начать игру');
            }
          }}
          onSetup={async (payload) => {
            try {
              const updated = await setupTicTacToeApi(session.id, payload);
              setSession(updated);
            } catch (e) {
              console.error(e);
              await showAlert('Не удалось настроить команды');
            }
          }}
          onOpenCell={async (cellIndex) => {
            try {
              const updated = await openTicTacToeCellApi(session.id, cellIndex);
              setSession(updated);
            } catch (e) {
              console.error(e);
              await showAlert('Не удалось открыть клетку');
            }
          }}
          onAnswer={async (correct) => {
            try {
              const updated = await answerTicTacToeApi(session.id, correct);
              setSession(updated);
            } catch (e) {
              console.error(e);
              await showAlert('Не удалось обработать ответ');
            }
          }}
          onFinish={async () => {
            try {
              const updated = await finishSessionApi(session.id);
              setSession(updated);
            } catch (e) {
              console.error(e);
              await showAlert('Не удалось завершить игру');
            }
          }}
          onVictoryClose={() => setTictactoeDismissed(true)}
        />
      );
    }

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
            correctCount={answeredSet.size}
            answeredKeys={answeredSet}
            isHost={isHost}
            onSuccess={async (categoryId, questionId) => {
              const answered = await answerQuestionApi(session.id, categoryId, questionId);
              setSession(answered);
            }}
            onFail={async () => {
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

    if (session.game.type === 'wheel' && session.status === 'waiting') {
      return (
        <div className="game-page lobby">
          <div className="game-container">
            <h1 className="game-title">{session.game.title}</h1>
            <p className="lobby-hint">Колесо Фортуны готово к запуску</p>
            {isHost && (
              <div className="game-actions">
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => {
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

    if (session.status === 'waiting') {
      const isOwnGame = session.game.type === 'own';
      const isQuizGame = session.game.type === 'quiz';
      const canStart =
        isHost &&
        (isOwnGame || (isQuizGame && session.teams.length >= 1));

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

            {isOwnGame ? (
              <p className="lobby-hint">Команды добавьте после начала игры</p>
            ) : (
              <div className="teams-section">
                <h2>Участники ({session.teams.length})</h2>
                <div className="teams-list">
                  {session.teams.map((team) => {
                    const isMyTeam = team.id === myTeamId;
                    const playerNames = team.players.map((p) => p.name).join(', ');

                    if (isQuizGame && isMyTeam) {
                      return (
                        <div key={team.id} className="team-item team-item--editable">
                          <div className="team-name-row">
                            <button
                              type="button"
                              className={`team-name-action ${isEditingTeamName ? 'team-name-action--save' : ''}`}
                              onClick={() => handleTeamNameAction()}
                              disabled={
                                isSavingTeamName ||
                                (isEditingTeamName && !editingTeamName.trim())
                              }
                              aria-label={
                                isEditingTeamName ? 'Сохранить название' : 'Изменить название'
                              }
                              title={isEditingTeamName ? 'Сохранить' : 'Изменить'}
                            >
                              {isEditingTeamName ? (
                                <FaCheck aria-hidden />
                              ) : (
                                <FaPen aria-hidden />
                              )}
                            </button>
                            {isEditingTeamName ? (
                              <input
                                className="team-name-input"
                                value={editingTeamName}
                                onChange={(e) => setEditingTeamName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void handleSaveTeamName();
                                  }
                                  if (e.key === 'Escape') {
                                    setIsEditingTeamName(false);
                                    setEditingTeamName(myTeam?.name ?? '');
                                  }
                                }}
                                placeholder="Ваше название"
                                autoFocus
                                disabled={isSavingTeamName}
                              />
                            ) : (
                              <span className="team-name">{team.name}</span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={team.id} className="team-item">
                        <span className="team-name">{team.name}</span>
                        {!isQuizGame && playerNames ? (
                          <span className="team-players">{playerNames}</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isHost && (
              <div className="game-actions">
                <Button
                  variant="primary"
                  size="large"
                  disabled={!canStart || isQuizStartPending}
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
                  (new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) /
                    1000,
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
            stationStats?.manuallyFinished
              ? 'Примечание: сессия завершена ведущим до прохождения всех станций.'
              : '',
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
                      <span className="team-score-result">
                        {minutes}:{seconds}
                      </span>
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

        const tictactoeState = session.tictactoeState;
        const tictactoeWinner =
          session.game.type === 'tictactoe' &&
          tictactoeState?.winnerTeamId &&
          !tictactoeState.isDraw
            ? session.teams.find((t) => t.id === tictactoeState.winnerTeamId)
            : null;

        const resultLines =
          session.game.type === 'tictactoe'
            ? tictactoeState?.isDraw
              ? ['Результат: ничья', ...session.teams.map((t) => `Команда: ${t.name}`)]
              : tictactoeWinner
                ? [`Победитель: ${tictactoeWinner.name}`]
                : ['Результат: игра завершена']
            : sortedTeams.length
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
          session.game.type === 'tictactoe' ? 'Итог:' : 'Итоговая таблица:',
          ...resultLines,
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
            {session.game.type === 'tictactoe' ? (
              <TicTacToeResultsHero
                teams={session.teams}
                tictactoeState={session.tictactoeState}
              />
            ) : (
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
            )}

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
      return (
        <QuizGamePage
          session={session}
          isHost={isHost}
          userId={user?.id}
          myTeamId={myTeamId}
          showInviteCode={showInviteCode}
          onSessionUpdate={setSession}
        />
      );
    }

    if (session.game.type === 'own') {
      return (
        <OwnGamePage
          session={session}
          isHost={isHost}
          showInviteCode={showInviteCode}
          answeredSet={answeredSet}
          onSessionUpdate={setSession}
        />
      );
    }

    return null;
  };

  return <GameFullscreenShell>{renderSessionContent()}</GameFullscreenShell>;
};
