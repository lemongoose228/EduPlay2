import React from 'react';
import { Button } from '../../shared/ui/Button/Button';
import './SessionCard.css';

interface SessionCardProps {
  id: string;
  gameTitle: string;
  gameType: 'own' | 'quiz' | 'crocodile' | 'wheel';
  status: 'waiting' | 'active' | 'finished';
  teams: number;
  maxTeams?: number;
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

  const getTypeIcon = () => {
    if (gameType === 'own') return '🎮';
    if (gameType === 'quiz') return '❓';
    if (gameType === 'wheel') return '🎡';
    return '🐊';
  };

  const getTypeText = () => {
    if (gameType === 'own') return 'Своя игра';
    if (gameType === 'quiz') return 'Викторина';
    if (gameType === 'wheel') return 'Колесо Фортуны';
    return 'Крокодил';
  };

  return (
    <div className="session-card" onClick={onClick}>
      <div className="session-card-header">
        <div className="session-type">
          <span className="type-icon">{getTypeIcon()}</span>
          <span>{getTypeText()}</span>
        </div>
        <span className={`session-status ${getStatusClass()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="session-card-content">
        <h3 className="session-title">{gameTitle}</h3>
        
        <div className="session-meta">
          <div className="session-meta-item">
            <span className="meta-icon">👥</span>
            <span>{teams}{maxTeams ? ` / ${maxTeams}` : ''} команд</span>
          </div>
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
          <div className="invite-code">
            <span>Код приглашения:</span>
            <strong>{inviteCode}</strong>
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