import React from 'react';
import { Button } from '../../shared/ui/Button/Button';
import './GameCard.css';

interface GameCardProps {
  id: string;
  title: string;
  type: 'own' | 'quiz';
  description?: string;
  questionsCount?: number;
  createdAt?: string;
  isPublished?: boolean;
  author?: string;
  plays?: number;
  rating?: number;
  onClick?: () => void;
  onEdit?: () => void;
  onPublish?: () => void;
  onPlay?: () => void;
  onDelete?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  title,
  type,
  description,
  questionsCount,
  createdAt,
  isPublished,
  author,
  plays,
  rating,
  onClick,
  onEdit,
  onPublish,
  onPlay,
  onDelete
}) => {
  const getTypeIcon = () => {
    return type === 'own' ? '🎮' : '❓';
  };

  const getTypeText = () => {
    return type === 'own' ? 'Своя игра' : 'Викторина';
  };

  return (
    <div className="game-card" onClick={onClick}>
      <div className="game-card-header">
        <div className="game-card-type">
          <span className="type-icon">{getTypeIcon()}</span>
          <span>{getTypeText()}</span>
        </div>
        {isPublished !== undefined && (
          <span className={`game-card-status ${isPublished ? 'published' : 'draft'}`}>
            {isPublished ? 'Опубликовано' : 'Черновик'}
          </span>
        )}
      </div>
      
      <div className="game-card-content">
        <h3 className="game-card-title">{title}</h3>
        {description && <p className="game-card-description">{description}</p>}
        
        <div className="game-card-meta">
          {questionsCount && (
            <div className="game-card-meta-item">
              <span className="meta-icon">📋</span>
              <span>{questionsCount} вопросов</span>
            </div>
          )}
          {createdAt && (
            <div className="game-card-meta-item">
              <span className="meta-icon">🕐</span>
              <span>{createdAt}</span>
            </div>
          )}
          {author && (
            <div className="game-card-meta-item">
              <span className="meta-icon">👤</span>
              <span>{author}</span>
            </div>
          )}
        </div>

        {(plays !== undefined || rating !== undefined) && (
          <div className="game-card-stats">
            {plays !== undefined && (
              <div className="game-card-stat">
                <span className="stat-icon">👥</span>
                <span>{plays}</span>
              </div>
            )}
            {rating !== undefined && (
              <div className="game-card-stat">
                <span className="stat-icon">⭐</span>
                <span>{rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="game-card-footer">
        {onPlay && (
          <Button variant="primary" size="small" onClick={(e) => { e.stopPropagation(); onPlay(); }}>
            Играть
          </Button>
        )}
        {onEdit && (
          <Button variant="outline" size="small" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            Редактировать
          </Button>
        )}
        {onPublish && !isPublished && (
          <Button variant="secondary" size="small" onClick={(e) => { e.stopPropagation(); onPublish(); }}>
            Опубликовать
          </Button>
        )}
        {onDelete && (
          <Button variant="danger" size="small" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            Удалить
          </Button>
        )}
      </div>
    </div>
  );
};