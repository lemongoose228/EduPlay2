import React from 'react';
import { Button } from '../../shared/ui/Button/Button';
import { resolveAvatarSrc } from '../../shared/lib/resolveAvatarSrc';
import { FaHeart } from 'react-icons/fa';
import './GameCard.css';

interface GameCardProps {
  id: string;
  title: string;
  type: 'own' | 'quiz' | 'crocodile' | 'wheel';
  description?: string;
  questionsCount?: number;
  createdAt?: string;
  isPublished?: boolean;
  author?: string;
  authorAvatar?: string;
  plays?: number;
  likes?: number;
  rating?: number;
  isLibraryCard?: boolean;
  isLiked?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onPublish?: () => void;
  onPlay?: () => void;
  onDelete?: () => void;
  onLikeToggle?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  title,
  type,
  description,
  questionsCount,
  createdAt,
  isPublished,
  author,
  authorAvatar,
  plays,
  likes,
  rating,
  isLibraryCard = false,
  isLiked,
  onClick,
  onEdit,
  onPublish,
  onPlay,
  onDelete,
  onLikeToggle
}) => {
  const getTypeIcon = () => {
    if (type === 'own') return '🎮';
    if (type === 'quiz') return '❓';
    if (type === 'wheel') return '🎡';
    return '🐊';
  };

  const getTypeText = () => {
    if (type === 'own') return 'Своя игра';
    if (type === 'quiz') return 'Викторина';
    if (type === 'wheel') return 'Колесо Фортуны';
    return 'Крокодил';
  };

  const resolvedAuthorAvatar = resolveAvatarSrc(authorAvatar);
  const authorInitial = author?.trim().charAt(0).toUpperCase();

  return (
    <div className="game-card" onClick={onClick}>
      <div className="game-card-header">
        <div className="game-card-type">
          <span className="type-icon">{getTypeIcon()}</span>
          <span>{getTypeText()}</span>
        </div>
        {isLibraryCard && likes !== undefined && (
          <div className="library-likes-badge" aria-label={`Лайков: ${likes}`}>
            <FaHeart />
            <span>{likes}</span>
          </div>
        )}
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
          {!isLibraryCard && questionsCount && (
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
              <span className="author-avatar">
                {resolvedAuthorAvatar ? (
                  <img src={resolvedAuthorAvatar} alt={author} />
                ) : (
                  authorInitial || '👤'
                )}
              </span>
              <span>{author}</span>
            </div>
          )}
        </div>

        {!isLibraryCard && (plays !== undefined || likes !== undefined || rating !== undefined) && (
          <div className={`game-card-stats ${isLibraryCard ? 'library-stats' : ''}`}>
            {!isLibraryCard && plays !== undefined && (
              <div className="game-card-stat">
                <span className="stat-icon">👥</span>
                <span>{plays}</span>
              </div>
            )}
            {likes !== undefined && (
              <div className="game-card-stat">
                <span className="stat-icon">
                  <FaHeart />
                </span>
                <span>{likes}</span>
              </div>
            )}
            {!isLibraryCard && likes === undefined && rating !== undefined && (
              <div className="game-card-stat">
                <span className="stat-icon">⭐</span>
                <span>{rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="game-card-footer">
        {onLikeToggle && likes !== undefined && (
          <Button
            variant={isLiked ? 'primary' : 'outline'}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onLikeToggle();
            }}
          >
            {isLiked ? '♥ В избранном' : '♡ Лайк'}
          </Button>
        )}
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