// StationGamePage.tsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  FaBullseye,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaCircle,
  FaClipboardList,
  FaCrown,
  FaHeart,
  FaMapMarkedAlt,
  FaRegClock,
  FaSquare,
  FaStar,
  FaTimes,
} from 'react-icons/fa';
import { BsFillTriangleFill } from 'react-icons/bs';
import { Button } from '../../shared/ui/Button/Button';
import { useDialogs } from '../../shared/ui/DialogProvider';
import { getStationPathLayout, segmentCurveD } from './stationPathUtils';
import { QuestionContent } from './QuestionContent';
import './StationGamePage.css';

type StationStatus = 'pending' | 'success' | 'failed';
type StationShape = 'circle' | 'star' | 'heart' | 'triangle' | 'square';

interface StationQuestion {
  id: string;
  question: string;
  answer: string;
  imageUrl?: string;
}

interface StationCategory {
  id: string;
  name: string;
  questions: StationQuestion[];
}

interface StationSession {
  id: string;
  status: 'waiting' | 'active' | 'paused' | 'finished';
  startedAt?: string;
  finishedAt?: string;
  game: {
    title: string;
    categories: StationCategory[];
  };
}

interface StationGamePageProps {
  session: StationSession;
  isHost: boolean;
  onStart: () => Promise<void>;
  onFinish: () => Promise<void>;
}

interface StationItem {
  id: string;
  name: string;
  task: string;
  shape: StationShape;
  color: string;
  imageUrl?: string;
}

const STATION_META_PREFIX = '__station_meta__:';

const decodeStationAnswer = (raw: string | null | undefined) => {
  const source = raw ?? '';
  if (!source.startsWith(STATION_META_PREFIX)) {
    return {
      name: source || 'Станция',
      shape: 'circle' as StationShape,
      color: '#6B4EFF',
    };
  }
  try {
    const parsed = JSON.parse(source.slice(STATION_META_PREFIX.length)) as {
      name?: string;
      shape?: StationShape;
      color?: string;
      imageUrl?: string;
    };
    return {
      name: parsed.name?.trim() || 'Станция',
      shape: parsed.shape ?? 'circle',
      color: parsed.color ?? '#6B4EFF',
      imageUrl: parsed.imageUrl?.trim() || '',
    };
  } catch {
    return { name: 'Станция', shape: 'circle' as StationShape, color: '#6B4EFF', imageUrl: '' };
  }
};

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const mm = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, '0');
  const ss = (safeSeconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

export const StationGamePage: React.FC<StationGamePageProps> = ({
  session,
  isHost,
  onStart,
  onFinish,
}) => {
  const { showConfirm } = useDialogs();
  const [stationStatuses, setStationStatuses] = useState<Record<string, StationStatus>>({});
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [errorsCount, setErrorsCount] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pathRowRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const stationItems: StationItem[] = useMemo(
    () =>
      (session.game.categories[0]?.questions ?? []).map((question) => {
        const meta = decodeStationAnswer(question.answer);
        return {
          id: question.id,
          name: meta.name,
          task: question.question,
          shape: meta.shape,
          color: meta.color,
          imageUrl: question.imageUrl || meta.imageUrl || '',
        };
      }),
    [session.game.categories],
  );

  const getActiveStationIdFrom = (statuses: Record<string, StationStatus>) => {
    const allResolved =
      stationItems.length > 0 &&
      stationItems.every((item) => statuses[item.id] && statuses[item.id] !== 'pending');
    const retryFailedMode = allResolved && stationItems.some((item) => statuses[item.id] === 'failed');

    if (retryFailedMode) {
      const firstFailed = stationItems.find((item) => statuses[item.id] === 'failed');
      if (firstFailed) return firstFailed.id;
    }

    const firstPending = stationItems.find((item) => !statuses[item.id] || statuses[item.id] === 'pending');
    return firstPending?.id || stationItems[0]?.id;
  };

  const getActiveStationId = () => getActiveStationIdFrom(stationStatuses);

  const [activeStationId, setActiveStationId] = useState<string | null>(null);

  useEffect(() => {
    const newActiveId = getActiveStationId();
    if (newActiveId && newActiveId !== activeStationId) {
      setActiveStationId(newActiveId);
    } else if (!activeStationId && newActiveId) {
      setActiveStationId(newActiveId);
    }
  }, [stationStatuses, stationItems]);

  const getStationStatsStorageKey = (id: string) => `station-stats:${id}`;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(getStationStatsStorageKey(session.id));
      if (raw) {
        const parsed = JSON.parse(raw) as { attempts?: number; errors?: number; statuses?: Record<string, StationStatus> };
        setAttemptsCount(parsed.attempts ?? 0);
        setErrorsCount(parsed.errors ?? 0);
        if (parsed.statuses) {
          setStationStatuses(parsed.statuses);
        }
      }
    } catch {
      setAttemptsCount(0);
      setErrorsCount(0);
    }
  }, [session.id]);

  // Timer
  useEffect(() => {
    if (session.status !== 'active') return;
    
    const startedAtMs = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
      setElapsedSeconds(elapsed);
    };
    
    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.status, session.startedAt]);

  const [pathCompact, setPathCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = () => setPathCompact(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const pathLayout = useMemo(
    () =>
      getStationPathLayout(stationItems.length, {
        ...(pathCompact ? { amplitude: 36, stepY: 96, paddingY: 24 } : {}),
      }),
    [stationItems.length, pathCompact],
  );

  const pathDoneGradientId = useMemo(
    () => `station-path-done-${session.id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [session.id],
  );

  useEffect(() => {
    if (!activeStationId) return;
    const el = pathRowRefs.current[activeStationId];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeStationId]);

  const successCount = useMemo(
    () => stationItems.filter((item) => stationStatuses[item.id] === 'success').length,
    [stationItems, stationStatuses],
  );
  
  const failedCount = useMemo(
    () => stationItems.filter((item) => stationStatuses[item.id] === 'failed').length,
    [stationItems, stationStatuses],
  );
  
  const attemptedCount = useMemo(
    () => stationItems.filter((item) => stationStatuses[item.id] && stationStatuses[item.id] !== 'pending').length,
    [stationItems, stationStatuses],
  );
  
  const allResolved = stationItems.length > 0 && 
    stationItems.every((item) => stationStatuses[item.id] && stationStatuses[item.id] !== 'pending');
  const retryFailedMode = allResolved && failedCount > 0;

  const currentStation = stationItems.find((item) => item.id === activeStationId);
  const activeStationIndex = stationItems.findIndex((item) => item.id === activeStationId);
  
  const prevStation = activeStationIndex > 0 ? stationItems[activeStationIndex - 1] : null;
  const nextStation = activeStationIndex < stationItems.length - 1 ? stationItems[activeStationIndex + 1] : null;

  const getStationStatus = (stationId: string): StationStatus => {
    return stationStatuses[stationId] ?? 'pending';
  };

  const canOpenStation = (stationId: string) => {
    const status = stationStatuses[stationId] ?? 'pending';
    if (session.status !== 'active') return false;
    if (retryFailedMode) return status === 'failed';
    return status === 'pending';
  };

  const goToStation = (stationId: string) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveStationId(stationId);
      setTimeout(() => setIsTransitioning(false), 80);
    }, 220);
  };

  const goToNext = () => {
    if (nextStation && canOpenStation(nextStation.id)) {
      goToStation(nextStation.id);
    }
  };

  const goToPrev = () => {
    if (prevStation && canOpenStation(prevStation.id)) {
      goToStation(prevStation.id);
    }
  };

  const handleMarkStation = (status: 'success' | 'failed') => {
    if (!currentStation || isFinishing || isTransitioning) return;

    const nextStatuses = { ...stationStatuses, [currentStation.id]: status };
    const nextAttempts = attemptsCount + 1;
    const nextErrors = errorsCount + (status === 'failed' ? 1 : 0);

    setStationStatuses(nextStatuses);
    setAttemptsCount(nextAttempts);
    setErrorsCount(nextErrors);

    const nowIso = new Date().toISOString();
    const startedAtMs = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
    const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
    const completedStations = stationItems.filter((item) => nextStatuses[item.id] === 'success').length;

    sessionStorage.setItem(
      getStationStatsStorageKey(session.id),
      JSON.stringify({
        completedStations,
        totalStations: stationItems.length,
        attempts: nextAttempts,
        errors: nextErrors,
        elapsedSec,
        finishedAt: nowIso,
        statuses: nextStatuses,
      }),
    );

    const allSuccess = stationItems.length > 0 && 
      stationItems.every((item) => nextStatuses[item.id] === 'success');
    
    if (allSuccess) {
      setIsFinishing(true);
      void onFinish().finally(() => setIsFinishing(false));
      return;
    }

    const newActiveId = getActiveStationIdFrom(nextStatuses);
    if (newActiveId && newActiveId !== currentStation.id) {
      setTimeout(() => {
        goToStation(newActiveId);
      }, 400);
    }
  };

  const handleManualFinish = async () => {
    const ok = await showConfirm(
      'Завершить игру? Непройденные станции будут отмечены как ошибки.',
      { title: 'Завершение игры' },
    );
    if (!ok) return;

    const nowIso = new Date().toISOString();
    const startedAtMs = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
    const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));

    sessionStorage.setItem(
      getStationStatsStorageKey(session.id),
      JSON.stringify({
        completedStations: successCount,
        totalStations: stationItems.length,
        attempts: attemptsCount,
        errors: errorsCount,
        elapsedSec,
        finishedAt: nowIso,
        statuses: stationStatuses,
        manuallyFinished: true,
      }),
    );

    setIsFinishing(true);
    await onFinish();
    setIsFinishing(false);
  };

  const renderShape = (shape: StationShape, color: string, size: number = 54) => {
    const Icon =
      shape === 'circle'
        ? FaCircle
        : shape === 'square'
          ? FaSquare
          : shape === 'triangle'
            ? BsFillTriangleFill
            : shape === 'heart'
              ? FaHeart
              : FaStar;

    return (
      <span className="station-shape-wrap" style={{ width: size, height: size }} aria-hidden>
        <Icon className="station-shape-icon" style={{ color }} />
      </span>
    );
  };

  const renderStationResultMark = (status: StationStatus, variant: 'compact' | 'main') => {
    if (status === 'pending') return null;
    const ok = status === 'success';
    return (
      <span
        className={`station-result-mark station-result-mark--${variant} ${ok ? 'station-result-mark--ok' : 'station-result-mark--fail'}`}
        aria-label={ok ? 'Выполнено верно' : 'Ошибка'}
        role="img"
      >
        {ok ? <FaCheck className="station-result-mark-icon" aria-hidden /> : <FaTimes className="station-result-mark-icon" aria-hidden />}
      </span>
    );
  };

  const canPrev = prevStation && canOpenStation(prevStation.id);
  const canNext = nextStation && canOpenStation(nextStation.id);

  const canSelectStationIndex = (idx: number) => {
    const s = stationItems[idx];
    if (!s) return false;
    if (!canOpenStation(s.id)) return false;
    return Math.abs(idx - activeStationIndex) === 1;
  };

  const handlePathNodeClick = (idx: number) => {
    if (idx === activeStationIndex || isTransitioning) return;
    if (!canSelectStationIndex(idx)) return;
    const s = stationItems[idx];
    goToStation(s.id);
  };

  if (session.status === 'waiting') {
    return (
      <div className="station-game-page">
        <div className="station-game-header glass-card">
          <div className="station-header-left">
            <h1 className="station-title">{session.game.title}</h1>
            <div className="station-stats-badge">
              <span className="stat-badge success">
                <FaCheck className="stat-badge-icon" aria-hidden /> 0
              </span>
              <span className="stat-badge failed">
                <FaTimes className="stat-badge-icon" aria-hidden /> 0
              </span>
              <span className="stat-badge attempts">
                <FaBullseye className="stat-badge-icon" aria-hidden /> 0
              </span>
            </div>
          </div>
          <div className="station-header-actions">
            <div className="station-timer">
              <FaRegClock className="station-timer-clock-icon" aria-hidden />
              <span className="station-timer-label">Время:</span>
              <strong className="station-timer-value">00:00</strong>
            </div>
          </div>
        </div>
        <div className="station-lobby glass-card">
          <div className="lobby-content">
            <div className="lobby-icon" aria-hidden>
              <FaMapMarkedAlt />
            </div>
            <h2>Маршрут готов</h2>
            <p>Вас ждёт {stationItems.length} интересных станций</p>
            {isHost && (
              <Button variant="primary" size="large" onClick={onStart}>
                Начать путешествие
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="station-game-page">
      {/* Header */}
      <div className="station-game-header glass-card">
        <div className="station-header-left">
          <h1 className="station-title">{session.game.title}</h1>
          <div className="station-stats-badge">
            <span className="stat-badge success">
              <FaCheck className="stat-badge-icon" aria-hidden /> {successCount}
            </span>
            <span className="stat-badge failed">
              <FaTimes className="stat-badge-icon" aria-hidden /> {failedCount}
            </span>
            <span className="stat-badge attempts">
              <FaBullseye className="stat-badge-icon" aria-hidden /> {attemptedCount}
            </span>
          </div>
        </div>
        <div className="station-header-actions">
          <div className="station-timer">
            <FaRegClock className="station-timer-clock-icon" aria-hidden />
            <span className="station-timer-label">Время:</span>
            <strong className="station-timer-value">{formatDuration(elapsedSeconds)}</strong>
          </div>
          {session.status === 'active' && isHost && (
            <Button variant="secondary" size="small" onClick={handleManualFinish} disabled={isFinishing}>
              Завершить игру
            </Button>
          )}
        </div>
      </div>

      {/* Main content: left column (stations) + right column (task) */}
      <div className="station-main-layout">
        <div className="station-left-column">
          <div className="station-path-panel glass-card">
            <div className="station-path-nav" role="toolbar" aria-label="Навигация по маршруту">
              <button
                type="button"
                className={`station-path-nav-btn ${!canPrev || isTransitioning ? 'disabled' : ''}`}
                onClick={goToPrev}
                disabled={!canPrev || isTransitioning}
                aria-label="Предыдущая станция"
              >
                <FaChevronLeft aria-hidden />
              </button>
              <span className="station-path-nav-label">
                {activeStationIndex >= 0 ? activeStationIndex + 1 : 0} / {stationItems.length}
              </span>
              <button
                type="button"
                className={`station-path-nav-btn ${!canNext || isTransitioning ? 'disabled' : ''}`}
                onClick={goToNext}
                disabled={!canNext || isTransitioning}
                aria-label="Следующая станция"
              >
                <FaChevronRight aria-hidden />
              </button>
            </div>

            <div className="station-path-scroll">
              <div
                className={`station-path-inner ${isTransitioning ? 'station-path-inner--transitioning' : ''}`}
                style={{ minHeight: pathLayout.height }}
              >
                <svg
                  className="station-path-svg"
                  viewBox={`0 0 ${pathLayout.width} ${pathLayout.height}`}
                  preserveAspectRatio="xMidYMin meet"
                  width="100%"
                  height={pathLayout.height}
                  aria-hidden
                >
                  <defs>
                    <linearGradient id={pathDoneGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6B4EFF" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  {pathLayout.points.length > 1 &&
                    pathLayout.points.slice(0, -1).map((p0, i) => {
                      const p1 = pathLayout.points[i + 1];
                      const done = getStationStatus(stationItems[i].id) === 'success';
                      return (
                        <path
                          key={`seg-${stationItems[i].id}`}
                          d={segmentCurveD(p0, p1)}
                          className={
                            done ? 'station-path-segment station-path-segment--done' : 'station-path-segment station-path-segment--todo'
                          }
                          stroke={done ? `url(#${pathDoneGradientId})` : undefined}
                          fill="none"
                        />
                      );
                    })}
                </svg>

                <ol
                  className="station-path-rows"
                  style={{
                    paddingTop: pathLayout.paddingY,
                    paddingBottom: pathLayout.paddingY,
                  }}
                >
                  {stationItems.map((station, idx) => {
                    const isActive = station.id === activeStationId;
                    const status = getStationStatus(station.id);
                    const selectable = isActive || canSelectStationIndex(idx);
                    const offset = idx % 2 === 0 ? -pathLayout.amplitude : pathLayout.amplitude;

                    return (
                      <li
                        key={station.id}
                        className="station-path-row"
                        style={{ minHeight: pathLayout.stepY }}
                        ref={(el) => {
                          pathRowRefs.current[station.id] = el;
                        }}
                      >
                        <button
                          type="button"
                          className={`station-path-node-wrap ${isActive ? 'station-path-node-wrap--active' : ''} ${!selectable ? 'station-path-node-wrap--locked' : ''}`}
                          style={{ transform: `translateX(${offset}px)` }}
                          onClick={() => handlePathNodeClick(idx)}
                          disabled={!selectable || isTransitioning}
                          aria-current={isActive ? 'step' : undefined}
                          aria-label={`${station.name}, шаг ${idx + 1}`}
                        >
                          {isActive ? (
                            <div className="station-node-main">
                              <div className="station-node-shape-main">
                                {renderShape(station.shape, station.color, 80)}
                                {renderStationResultMark(status, 'main')}
                              </div>
                              <h3 className="station-node-name-main">{station.name}</h3>
                              <div className="station-progress-badge">
                                {idx + 1} / {stationItems.length}
                              </div>
                            </div>
                          ) : (
                            <div className="station-node-small">
                              <div className="station-node-shape">
                                {renderShape(station.shape, station.color, 48)}
                                {renderStationResultMark(status, 'compact')}
                              </div>
                              <span className="station-node-name">{station.name}</span>
                            </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Task Panel */}
        <div className="station-right-column">
          <div className="station-task-panel glass-card">
            <div className="task-panel-header">
              <span className="task-icon" aria-hidden>
                <FaClipboardList />
              </span>
              <span className="task-label">Задание</span>
              {retryFailedMode && <span className="retry-badge">Повторное прохождение</span>}
            </div>

            <div className="station-stats-compact">
              <div className="compact-stat">
                <span className="compact-stat-label">Выполнено</span>
                <span className="compact-stat-value">{successCount}</span>
              </div>
              <div className="compact-stat">
                <span className="compact-stat-label">Не выполнено</span>
                <span className="compact-stat-value">{failedCount}</span>
              </div>
              <div className="compact-stat">
                <span className="compact-stat-label">Попыток</span>
                <span className="compact-stat-value">{attemptedCount}</span>
              </div>
            </div>
            
            {currentStation ? (
              <div className="task-content">
                <QuestionContent
                  text={currentStation.task}
                  imageUrl={currentStation.imageUrl}
                  textClassName="task-text"
                />
                
                {isHost && session.status === 'active' && (
                  <div className="task-actions">
                    <button 
                      className="task-btn success-btn"
                      onClick={() => handleMarkStation('success')}
                      disabled={isFinishing || isTransitioning || getStationStatus(currentStation.id) === 'success'}
                    >
                      <span className="btn-icon" aria-hidden>
                        <FaCheck />
                      </span>
                      Выполнено
                    </button>
                    <button 
                      className="task-btn danger-btn"
                      onClick={() => handleMarkStation('failed')}
                      disabled={isFinishing || isTransitioning || getStationStatus(currentStation.id) === 'success'}
                    >
                      <span className="btn-icon" aria-hidden>
                        <FaTimes />
                      </span>
                      Не выполнено
                    </button>
                  </div>
                )}
                
                {!isHost && session.status === 'active' && (
                  <div className="waiting-message">
                    <span className="waiting-icon" aria-hidden>
                      <FaCrown />
                    </span>
                    <p>Ожидайте решения ведущего</p>
                  </div>
                )}
                
                {getStationStatus(currentStation.id) === 'success' && (
                  <div
                    className="waiting-message waiting-message-success"
                    style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' }}
                  >
                    <span className="waiting-icon" aria-hidden>
                      <FaCheck />
                    </span>
                    <p>Задание выполнено!</p>
                  </div>
                )}
                
                {getStationStatus(currentStation.id) === 'failed' && !retryFailedMode && (
                  <div
                    className="waiting-message waiting-message-failed"
                    style={{ background: 'linear-gradient(135deg, #ffe0e0, #ffcdd2)' }}
                  >
                    <span className="waiting-icon" aria-hidden>
                      <FaTimes />
                    </span>
                    <p>Задание не выполнено. Вы сможете пройти его после завершения всех станций.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="task-empty">
                <span className="empty-icon" aria-hidden>
                  <FaMapMarkedAlt />
                </span>
                <p>Выберите станцию на карте</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};