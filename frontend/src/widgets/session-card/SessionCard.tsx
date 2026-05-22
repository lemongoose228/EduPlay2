import React from 'react';
import { Button } from '../../shared/ui/Button/Button';
import { GameTypeIcon } from '../../shared/lib/gameTypeIcons';
import './SessionCard.css';

interface SessionCardProps {
  id: string;
  gameTitle: string;
  gameType: 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station' | 'tictactoe';
  status: 'waiting' | 'active' | 'finished';
  teams: number;
  maxTeams?: number;
  showTeamsCount?: boolean;
  startedAt?: string;
  endedAt?: string;
  inviteCode?: string;
  
  showInviteCode?: boolean;
  onClick?: () => void;
  onJoin?: () => void;
  onInvite?: () => void;
  onViewResults?: () => void;
  onDelete?: () => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  gameTitle,
  gameType,
  status,
  teams,
  maxTeams,
  showTeamsCount = false,
  startedAt,
  endedAt,
  inviteCode,
  showInviteCode = true,
  onClick,
  onJoin,
  onInvite,
  onViewResults,
  onDelete,
}) => {
  const getStatusText = () => {
    switch (status) {
      case 'waiting': return 'Ожидание игроков';
      case 'active': return 'Игра идет';
      case 'finished': return 'Завершена';
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'waiting': return 'status-waiting';
      case 'active': return 'status-active';
      case 'finished': return 'status-finished';
    }
  };

  const getTypeText = () => {
    if (gameType === 'own') return 'Своя игра';
    if (gameType === 'quiz') return 'Викторина';
    if (gameType === 'wheel') return 'Колесо Фортуны';
    if (gameType === 'station') return 'Станции';
    if (gameType === 'tictactoe') return 'Крестики-нолики';
    return 'Крокодил';
  };

  return (
    <div className="session-card" onClick={onClick}>
      <div className="session-card-header">
        <div className="session-type">
          <GameTypeIcon
            type={gameType}
            className={`type-icon ${gameType === 'own' ? 'type-icon-own' : ''}`}
            alt={getTypeText()}
          />
          <span>{getTypeText()}</span>
        </div>
        <span className={`session-status ${getStatusClass()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="session-card-content">
        <h3 className="session-title">{gameTitle}</h3>
        
        <div className="session-meta">
          {showTeamsCount && (
            <div className="session-meta-item">
              <span className="meta-icon">👥</span>
              <span>{teams}{maxTeams ? ` / ${maxTeams}` : ''} команд</span>
            </div>
          )}
          {startedAt && (
            <div className="session-meta-item">
              <span className="meta-icon">🕐</span>
              <span>{startedAt}</span>
            </div>
          )}
          {endedAt && (
            <div className="session-meta-item">
              <span className="meta-icon">🏁</span>
              <span>{endedAt}</span>
            </div>
          )}
        </div>

        {showInviteCode && inviteCode && status !== 'finished' && (
          <div className="session-invite-code">
            <span className="session-invite-code__label">Код:</span>
            <strong className="session-invite-code__value">{inviteCode}</strong>
          </div>
        )}
      </div>

      <div className="session-card-footer">
        {status === 'waiting' && onJoin && (
          <Button variant="primary" size="small" fullWidth onClick={onJoin}>
            Присоединиться
          </Button>
        )}
        {status === 'active' && onJoin && (
          <Button variant="primary" size="small" fullWidth onClick={onJoin}>
            Войти в игру
          </Button>
        )}
        {status === 'waiting' && showInviteCode && onInvite && (
          <Button variant="outline" size="small" fullWidth onClick={onInvite}>
            Пригласить
          </Button>
        )}
        {status === 'finished' && onViewResults && (
          <Button variant="secondary" size="small" fullWidth onClick={onViewResults}>
            Результаты
          </Button>
        )}

        {onDelete && (
          <Button
            variant="danger"
            size="small"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            Удалить
          </Button>
        )}
      </div>
    </div>
  );
};