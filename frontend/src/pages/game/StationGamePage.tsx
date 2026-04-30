import React, { useEffect, useMemo, useState } from 'react';
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
      color: '#6b8cff',
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
      color: parsed.color ?? '#6b8cff',
    };
  } catch {
    return { name: 'Станция', shape: 'circle' as StationShape, color: '#6b8cff' };
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
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [stationStatuses, setStationStatuses] = useState<Record<string, StationStatus>>({});
  const [finishedAtLocal, setFinishedAtLocal] = useState<string | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [errorsCount, setErrorsCount] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

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

  useEffect(() => {
    if (!stationItems.length) return;
    const current = stationItems.some((item) => item.id === activeStationId);
    if (!current) {
      setActiveStationId(stationItems[0].id);
    }
  }, [stationItems, activeStationId]);

  const getStationStatsStorageKey = (id: string) => `station-stats:${id}`;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(getStationStatsStorageKey(session.id));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { attempts?: number; errors?: number };
      setAttemptsCount(parsed.attempts ?? 0);
      setErrorsCount(parsed.errors ?? 0);
    } catch {
      setAttemptsCount(0);
      setErrorsCount(0);
    }
  }, [session.id]);

  const attemptedCount = useMemo(
    () => stationItems.filter((item) => stationStatuses[item.id] && stationStatuses[item.id] !== 'pending').length,
    [stationItems, stationStatuses],
  );
  const successCount = useMemo(
    () => stationItems.filter((item) => stationStatuses[item.id] === 'success').length,
    [stationItems, stationStatuses],
  );
  const failedCount = useMemo(
    () => stationItems.filter((item) => stationStatuses[item.id] === 'failed').length,
    [stationItems, stationStatuses],
  );
  const allResolved = stationItems.length > 0 && stationItems.every((item) => Boolean(stationStatuses[item.id]));
  const retryFailedMode = allResolved && failedCount > 0;

  const activeStationIndex = useMemo(
    () => stationItems.findIndex((item) => item.id === activeStationId),
    [activeStationId, stationItems],
  );
  const currentStation = activeStationIndex >= 0 ? stationItems[activeStationIndex] : null;

  const canOpenStation = (stationId: string) => {
    const status = stationStatuses[stationId] ?? 'pending';
    if (session.status !== 'active') return false;
    if (retryFailedMode) return status === 'failed' || stationId === activeStationId;
    return status === 'pending' || stationId === activeStationId;
  };

  const goToStationByOffset = (offset: -1 | 1) => {
    if (!stationItems.length) return;
    const currentIndex = Math.max(activeStationIndex, 0);
    let nextIndex = currentIndex + offset;
    while (nextIndex >= 0 && nextIndex < stationItems.length) {
      const candidate = stationItems[nextIndex];
      if (canOpenStation(candidate.id)) {
        setActiveStationId(candidate.id);
        return;
      }
      nextIndex += offset;
    }
  };

  const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : null;
  const finishedAt = finishedAtLocal
    ? new Date(finishedAtLocal).getTime()
    : session.finishedAt
      ? new Date(session.finishedAt).getTime()
      : null;
  const elapsedSeconds = startedAt == null ? 0 : Math.floor(((finishedAt ?? Date.now()) - startedAt) / 1000);

  const handleMarkStation = (status: 'success' | 'failed') => {
    if (!currentStation || isFinishing) return;

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
      }),
    );

    const allSuccess = stationItems.length > 0 && stationItems.every((item) => nextStatuses[item.id] === 'success');
    if (allSuccess) {
      setIsFinishing(true);
      setFinishedAtLocal(nowIso);
      void onFinish().finally(() => setIsFinishing(false));
      return;
    }

    const modeRetry = stationItems.length > 0 && stationItems.every((item) => Boolean(nextStatuses[item.id])) &&
      stationItems.some((item) => nextStatuses[item.id] === 'failed');
    const next = modeRetry
      ? stationItems.find((item) => nextStatuses[item.id] === 'failed' && item.id !== currentStation.id)
      : stationItems.slice(activeStationIndex + 1).find((item) => !nextStatuses[item.id]);
    if (next) setActiveStationId(next.id);
  };

  const canPrev = stationItems.some((item, idx) => idx < activeStationIndex && canOpenStation(item.id));
  const canNext = stationItems.some((item, idx) => idx > activeStationIndex && canOpenStation(item.id));

  return (
    <div className="station-game-page">
      <div className="station-game-header glass-card">
        <div>
          <h1>{session.game.title}</h1>
          <p>
            Пройдено: <strong>{successCount}</strong> / {stationItems.length} | Попыток: {attemptedCount}
          </p>
        </div>
        <div className="station-header-actions">
          <div className="station-timer">Время: {formatDuration(elapsedSeconds)}</div>
          {session.status === 'active' && isHost && (
            <Button
              variant="secondary"
              onClick={async () => {
                setFinishedAtLocal(new Date().toISOString());
                await onFinish();
              }}
            >
              Завершить игру
            </Button>
          )}
        </div>
      </div>

      {session.status === 'waiting' ? (
        <div className="station-lobby glass-card">
          <p>Маршрут готов. Нажмите «Начать игру», чтобы открыть первую станцию.</p>
          {isHost && <Button onClick={onStart}>Начать игру</Button>}
        </div>
      ) : (
        <>
          <div className="station-track glass-card">
            <div className="station-position">
              Станция {Math.max(activeStationIndex + 1, 1)} из {stationItems.length}
            </div>
            <div className="station-track-row">
              {stationItems.map((station, idx) => {
                const status = stationStatuses[station.id] ?? 'pending';
                const isActive = station.id === activeStationId;
                const canOpen = canOpenStation(station.id);
                return (
                  <React.Fragment key={station.id}>
                    <button
                      type="button"
                      className={`station-track-node ${isActive ? 'is-active' : ''}`}
                      onClick={() => {
                        if (canOpen) setActiveStationId(station.id);
                      }}
                      disabled={!canOpen}
                      title={station.name}
                    >
                      <div
                        className={`shape shape-${station.shape} status-${status}`}
                        style={{ backgroundColor: station.color }}
                      />
                      <span>{station.name}</span>
                    </button>
                    {idx < stationItems.length - 1 && <div className="station-link" aria-hidden />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="station-panel glass-card">
            <h3>Станция {activeStationIndex + 1}</h3>
            <p>Успешно: {successCount}</p>
            <p>Не выполнено: {failedCount}</p>
            <p>Попыток: {attemptsCount}</p>
            {retryFailedMode && <p>Режим: повторно пройдите станции с ошибками</p>}

            <div className="station-nav">
              <Button variant="outline" disabled={!canPrev} onClick={() => goToStationByOffset(-1)}>
                ← Предыдущая
              </Button>
              <Button variant="outline" disabled={!canNext} onClick={() => goToStationByOffset(1)}>
                Следующая →
              </Button>
            </div>

            {currentStation ? (
              <div className="station-task-card">
                <h4>{currentStation.name}</h4>
                <p>{currentStation.task}</p>
                {isHost && session.status === 'active' && (
                  <div className="station-task-actions">
                    <Button onClick={() => handleMarkStation('success')}>✓ Выполнено</Button>
                    <Button variant="danger" onClick={() => handleMarkStation('failed')}>
                      ✗ Не выполнено
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="station-help">Выберите станцию на карте или стрелками.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
