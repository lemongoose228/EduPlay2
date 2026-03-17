import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionCard } from '../../widgets/session-card/SessionCard';
import { Button } from '../../shared/ui/Button/Button';
import { Modal } from '../../shared/ui/Modal/Modal';
import { mockSessions } from '../../features/sessions/types/session.types';
import './GameSessionsPage.css';

interface Session {
  id: string;
  gameTitle: string;
  gameType: 'own' | 'quiz';
  status: 'waiting' | 'active' | 'finished';
  teams: number;
  maxTeams: number;
  startedAt: string;
  endedAt?: string;
  inviteCode: string;
}

export const GameSessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: '1',
      gameTitle: 'История России',
      gameType: 'own',
      status: 'active',
      teams: 2,
      maxTeams: 4,
      startedAt: '15:30, 25.01.2024',
      inviteCode: 'ABC123'
    },
    {
      id: '2',
      gameTitle: 'География мира',
      gameType: 'quiz',
      status: 'waiting',
      teams: 1,
      maxTeams: 6,
      startedAt: '16:00, 25.01.2024',
      inviteCode: 'XYZ789'
    },
    {
      id: '3',
      gameTitle: 'Научные открытия',
      gameType: 'own',
      status: 'finished',
      teams: 4,
      maxTeams: 4,
      startedAt: '14:00, 24.01.2024',
      endedAt: '15:30, 24.01.2024',
      inviteCode: 'DEF456'
    }
  ]);

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'active' | 'finished'>('all');

  const handleSessionClick = (session: Session) => {
    if (session.status === 'finished') {
      setSelectedSession(session);
      setIsResultsModalOpen(true);
    } else {
      navigate(`/game/${session.id}`);
    }
  };

  const handleJoinGame = (sessionId: string) => {
    navigate(`/game/${sessionId}`);
  };

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

  return (
    <div className="game-sessions-page">
      <div className="page-header">
        <h1 className="page-title">Игровые сессии</h1>
        <p className="page-description">
          Активные и завершенные игровые сессии
        </p>
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

      {filteredSessions.length > 0 ? (
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
              onClick={() => handleSessionClick(session)}
              onJoin={() => handleJoinGame(session.id)}
              onInvite={() => handleInvite(session)}
              onViewResults={() => {
                setSelectedSession(session);
                setIsResultsModalOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🎮</div>
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

      <Modal
        isOpen={isResultsModalOpen}
        onClose={() => setIsResultsModalOpen(false)}
        title="Результаты игры"
        size="large"
      >
        {selectedSession && (
          <div className="results-modal">
            <div className="results-summary">
              <div className="result-item">
                <span className="result-label">Игра:</span>
                <span className="result-value">{selectedSession.gameTitle}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Дата:</span>
                <span className="result-value">{selectedSession.startedAt}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Команд:</span>
                <span className="result-value">{selectedSession.teams}</span>
              </div>
            </div>

            <h3 className="scores-title">Итоговый счет</h3>
            <div className="scores-list">
              <div className="score-row header">
                <span>Команда</span>
                <span>Счет</span>
              </div>
              <div className="score-row">
                <span className="team-name">Команда А</span>
                <span className="team-score">2500</span>
              </div>
              <div className="score-row">
                <span className="team-name">Команда Б</span>
                <span className="team-score">1800</span>
              </div>
              <div className="score-row">
                <span className="team-name">Команда В</span>
                <span className="team-score">1200</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};