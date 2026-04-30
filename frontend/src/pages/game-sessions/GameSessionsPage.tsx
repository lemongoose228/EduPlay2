import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoChevronDown } from 'react-icons/io5';
import { SessionCard } from '../../widgets/session-card/SessionCard';
import { Button } from '../../shared/ui/Button/Button';
import { Modal } from '../../shared/ui/Modal/Modal';
import { Input } from '../../shared/ui/Input/Input';
import { GAME_TYPE_ICON_MAP } from '../../shared/lib/gameTypeIcons';
import './GameSessionsPage.css';
import {
  deleteSessionApi,
  getMySessionsApi,
  joinSessionApi,
} from '../../features/sessions/api/sessionsApi';
import { useAppSelector } from '../../app/store/hooks';
import { selectAuthUser } from '../../features/auth/model/selectors';

interface Session {
  id: string;
  gameTitle: string;
  gameType: 'own' | 'quiz' | 'crocodile' | 'wheel';
  
  multiplayer: boolean;
  status: 'waiting' | 'active' | 'finished';
  teams: number;
  maxTeams: number;
  startedAt: string;
  endedAt?: string;
  inviteCode: string;
  hostId?: string;
}

export const GameSessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector(selectAuthUser);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'active' | 'finished'>('all');

  const handleInvite = (session: Session) => {
    setSelectedSession(session);
    setIsInviteModalOpen(true);
  };

  const copyInviteCode = () => {
    if (selectedSession?.inviteCode) {
      navigator.clipboard.writeText(selectedSession.inviteCode);
      alert('Код приглашения скопирован в буфер обмена!');
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    return session.status === filter;
  });

  const getSessionsCount = () => ({
    all: sessions.length,
    waiting: sessions.filter(s => s.status === 'waiting').length,
    active: sessions.filter(s => s.status === 'active').length,
    finished: sessions.filter(s => s.status === 'finished').length
  });

  const counts = getSessionsCount();

  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const backendSessions = await getMySessionsApi();
        if (cancelled) return;
        const mapped: Session[] = (backendSessions || []).map((s: any) => {
          const multiplayer = s.multiplayer ?? s.game?.type === 'quiz';
          return {
            id: s.id,
            gameTitle: s.game?.title ?? '',
            gameType: s.game?.type ?? 'own',
            multiplayer,
            status: s.status,
            teams: s.teams?.length ?? 0,
            maxTeams: s.settings?.maxTeams ?? 0,
            startedAt: s.startedAt
              ? new Date(s.startedAt).toLocaleString('ru-RU')
              : '',
            endedAt: s.finishedAt ? new Date(s.finishedAt).toLocaleString('ru-RU') : undefined,
            inviteCode: s.inviteCode ?? '',
            hostId: s.hostId,
          };
        });
        setSessions(mapped);
      } catch (e) {
        console.error(e);
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleJoinByCode = async () => {
    try {
      const playerName = (joinName?.trim() && joinName.trim().length >= 1)
        ? joinName.trim()
        : 'Игрок';
      const session = await joinSessionApi({
        inviteCode: joinInviteCode.trim(),
        teamName: joinName?.trim() || undefined,
        playerName,
      });
      navigate(`/game/${session.id}`);
    } catch (e) {
      console.error(e);
      alert('Не удалось присоединиться к сессии');
    }
  };

  return (
    <div className="game-sessions-page">
      <div className="page-header">
        <h1 className="page-title">Игровые сессии</h1>
        <p className="page-description">
          Активные и завершенные игровые сессии
        </p>
      </div>

      <div className="join-section">
        <button
          type="button"
          className={`join-toggle ${isJoinOpen ? 'open' : ''}`}
          onClick={() => setIsJoinOpen((prev) => !prev)}
          aria-expanded={isJoinOpen}
          aria-controls="join-by-code-content"
        >
          <span className="join-title">Присоединиться по коду</span>
          <span className="join-chevron" aria-hidden="true">
            <IoChevronDown />
          </span>
        </button>
        <div
          id="join-by-code-content"
          className={`join-content ${isJoinOpen ? 'open' : ''}`}
        >
          <div className="join-form">
            <Input
              label="Код приглашения"
              value={joinInviteCode}
              onChange={(e) => setJoinInviteCode(e.target.value)}
              placeholder="Например: ABC123"
            />
            <Input
              label="Имя игрока или название команды"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Например: Алексей или Команда 1"
            />
            <Button onClick={handleJoinByCode} disabled={!joinInviteCode.trim()}>
              Присоединиться
            </Button>
          </div>
        </div>
      </div>

      <div className="sessions-stats">
        <div className="stat-card" onClick={() => setFilter('all')}>
          <span className="stat-value">{counts.all}</span>
          <span className="stat-label">Всего сессий</span>
        </div>
        <div className="stat-card" onClick={() => setFilter('waiting')}>
          <span className="stat-value">{counts.waiting}</span>
          <span className="stat-label">Ожидание</span>
        </div>
        <div className="stat-card" onClick={() => setFilter('active')}>
          <span className="stat-value">{counts.active}</span>
          <span className="stat-label">Активные</span>
        </div>
        <div className="stat-card" onClick={() => setFilter('finished')}>
          <span className="stat-value">{counts.finished}</span>
          <span className="stat-label">Завершенные</span>
        </div>
      </div>

      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Все
        </button>
        <button 
          className={`filter-tab ${filter === 'waiting' ? 'active' : ''}`}
          onClick={() => setFilter('waiting')}
        >
          Ожидание игроков
        </button>
        <button 
          className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Активные
        </button>
        <button 
          className={`filter-tab ${filter === 'finished' ? 'active' : ''}`}
          onClick={() => setFilter('finished')}
        >
          Завершенные
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container">Загрузка...</div>
      ) : filteredSessions.length > 0 ? (
        <div className="sessions-grid">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              id={session.id}
              gameTitle={session.gameTitle}
              gameType={session.gameType}
              status={session.status}
              teams={session.teams}
              maxTeams={session.maxTeams}
              startedAt={session.startedAt}
              endedAt={session.endedAt}
              inviteCode={session.inviteCode}
              showInviteCode={session.multiplayer}
              onClick={() => navigate(`/game/${session.id}`)}
              onInvite={session.multiplayer ? () => handleInvite(session) : undefined}
              onDelete={
                session.hostId && user?.id && session.hostId === user.id
                  ? async () => {
                      if (!window.confirm('Удалить эту сессию?')) return;
                      try {
                        await deleteSessionApi(session.id);
                        const backendSessions = await getMySessionsApi();
                        const mapped: Session[] = (backendSessions || []).map((s: any) => {
                          const multiplayer = s.multiplayer ?? s.game?.type === 'quiz';
                          return {
                            id: s.id,
                            gameTitle: s.game?.title ?? '',
                            gameType: s.game?.type ?? 'own',
                            multiplayer,
                            status: s.status,
                            teams: s.teams?.length ?? 0,
                            maxTeams: s.settings?.maxTeams ?? 0,
                            startedAt: s.startedAt
                              ? new Date(s.startedAt).toLocaleString('ru-RU')
                              : '',
                            endedAt: s.finishedAt
                              ? new Date(s.finishedAt).toLocaleString('ru-RU')
                              : undefined,
                            inviteCode: s.inviteCode ?? '',
                            hostId: s.hostId,
                          };
                        });
                        setSessions(mapped);
                      } catch (e) {
                        console.error(e);
                        alert('Не удалось удалить сессию');
                      }
                    }
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <img src={GAME_TYPE_ICON_MAP.own} alt="Своя игра" />
          </div>
          <h3>Сессии не найдены</h3>
          <p>Создайте новую игру или присоединитесь к существующей</p>
          <Button onClick={() => navigate('/create-game')}>
            Создать игру
          </Button>
        </div>
      )}

      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Пригласить в игру"
        footer={
          <Button onClick={copyInviteCode}>
            Копировать код
          </Button>
        }
      >
        <div className="invite-modal">
          <p className="invite-text">
            Пригласите друзей в игру "{selectedSession?.gameTitle}"
          </p>
          <div className="invite-code-container">
            <code className="invite-code">{selectedSession?.inviteCode}</code>
          </div>
          <p className="invite-note">
            Игроки могут присоединиться, введя этот код на странице игровых сессий
          </p>
        </div>
      </Modal>

    </div>
  );
};