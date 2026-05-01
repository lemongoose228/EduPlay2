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
import './StationGamePage.css';

type StationStatus = 'pending' | 'success' | 'failed';
type StationShape = 'circle' | 'star' | 'heart' | 'triangle' | 'square';

interface StationQuestion {
  id: string;
  question: string;
  answer: string;
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
    };
    return {
      name: parsed.name?.trim() || 'Станция',
      shape: parsed.shape ?? 'circle',
      color: parsed.color ?? '#6B4EFF',
    };
  } catch {
    return { name: 'Станция', shape: 'circle' as StationShape, color: '#6B4EFF' };
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
  const [stationStatuses, setStationStatuses] = useState<Record<string, StationStatus>>({});
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [errorsCount, setErrorsCount] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev' | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        };
      }),
    [session.game.categories],
  );

  const getActiveStationId = () => {
    const allResolved = stationItems.length > 0 && 
      stationItems.every((item) => stationStatuses[item.id] && stationStatuses[item.id] !== 'pending');
    const retryFailedMode = allResolved && stationItems.some((item) => stationStatuses[item.id] === 'failed');
    
    if (retryFailedMode) {
      const firstFailed = stationItems.find((item) => stationStatuses[item.id] === 'failed');
      if (firstFailed) return firstFailed.id;
    }
    
    const firstPending = stationItems.find((item) => !stationStatuses[item.id] || stationStatuses[item.id] === 'pending');
    return firstPending?.id || stationItems[0]?.id;
  };

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

  const goToStation = (stationId: string, direction: 'next' | 'prev') => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTransitionDirection(direction);
    
    setTimeout(() => {
      setActiveStationId(stationId);
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionDirection(null);
      }, 50);
    }, 300);
  };

  const goToNext = () => {
    if (nextStation && canOpenStation(nextStation.id)) {
      goToStation(nextStation.id, 'next');
    }
  };

  const goToPrev = () => {
    if (prevStation && canOpenStation(prevStation.id)) {
      goToStation(prevStation.id, 'prev');
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

    const newActiveId = getActiveStationId();
    if (newActiveId && newActiveId !== currentStation.id) {
      setTimeout(() => {
        goToStation(newActiveId, activeStationIndex < stationItems.findIndex(s => s.id === newActiveId) ? 'next' : 'prev');
      }, 400);
    }
  };

  const handleManualFinish = async () => {
    if (window.confirm('Завершить игру? Непройденные станции будут отмечены как ошибки.')) {
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
    }
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
          {/* Progress line */}
          <div className="station-progress-line glass-card">
            <div className="progress-track">
              {stationItems.map((station, idx) => (
                <div key={station.id} className="progress-step">
                  <div 
                    className={`progress-dot ${
                      idx === activeStationIndex ? 'active' : 
                      getStationStatus(station.id) === 'success' ? 'success' :
                      getStationStatus(station.id) === 'failed' ? 'failed' : 'pending'
                    }`}
                    title={station.name}
                  >
                    {idx + 1}
                  </div>
                  {idx < stationItems.length - 1 && (
                    <div className={`progress-line ${idx < activeStationIndex ? 'passed' : ''}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Carousel */}
          <div className="station-carousel-container">
            <div className="station-carousel">
              <button 
                className={`carousel-nav carousel-prev ${!canPrev || isTransitioning ? 'disabled' : ''}`}
                onClick={goToPrev}
                disabled={!canPrev || isTransitioning}
              >
                <FaChevronLeft aria-hidden />
              </button>

              <div className="carousel-stations">
                {/* Previous Station */}
                <div className={`carousel-station prev ${isTransitioning && transitionDirection === 'next' ? 'exiting-left' : ''} ${isTransitioning && transitionDirection === 'prev' ? 'entering' : ''}`}>
                  {prevStation && (
                    <div className="station-node-small">
                      <div className="station-node-shape">
                        {renderShape(prevStation.shape, prevStation.color, 48)}
                        {renderStationResultMark(getStationStatus(prevStation.id), 'compact')}
                      </div>
                      <span className="station-node-name">{prevStation.name}</span>
                    </div>
                  )}
                </div>

                {/* Current Station */}
                <div className={`carousel-station current ${isTransitioning ? (transitionDirection === 'next' ? 'exiting' : transitionDirection === 'prev' ? 'exiting-right' : '') : ''}`}>
                  {currentStation && (
                    <div className="station-node-main">
                      <div className="station-node-shape-main">
                        {renderShape(currentStation.shape, currentStation.color, 80)}
                        {renderStationResultMark(getStationStatus(currentStation.id), 'main')}
                      </div>
                      <h3 className="station-node-name-main">{currentStation.name}</h3>
                      <div className="station-progress-badge">
                        {activeStationIndex + 1} / {stationItems.length}
                      </div>
                    </div>
                  )}
                </div>

                {/* Next Station */}
                <div className={`carousel-station next ${isTransitioning && transitionDirection === 'prev' ? 'exiting-right' : ''} ${isTransitioning && transitionDirection === 'next' ? 'entering' : ''}`}>
                  {nextStation && (
                    <div className="station-node-small">
                      <div className="station-node-shape">
                        {renderShape(nextStation.shape, nextStation.color, 48)}
                        {renderStationResultMark(getStationStatus(nextStation.id), 'compact')}
                      </div>
                      <span className="station-node-name">{nextStation.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <button 
                className={`carousel-nav carousel-next ${!canNext || isTransitioning ? 'disabled' : ''}`}
                onClick={goToNext}
                disabled={!canNext || isTransitioning}
              >
                <FaChevronRight aria-hidden />
              </button>
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
                <p className="task-text">{currentStation.task}</p>
                
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