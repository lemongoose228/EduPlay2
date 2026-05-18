import React from 'react';
import { Button } from '../../shared/ui/Button/Button';
import { resolveAvatarSrc } from '../../shared/lib/resolveAvatarSrc';
import { GameTypeIcon } from '../../shared/lib/gameTypeIcons';
import { FaHeart, FaFlag, FaHashtag } from 'react-icons/fa';
import './GameCard.css';

interface GameCardProps {
  id: string;
  /** Числовой публичный ID для отображения в библиотеке */
  publicId?: string;
  title: string;
  type: 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station' | 'tictactoe';
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
  onUnpublish?: () => void;
  onPlay?: () => void;
  onDelete?: () => void;
  onLikeToggle?: () => void;
  onReport?: () => void;
  onAuthorClick?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  id,
  publicId,
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
  onUnpublish,
  onPlay,
  onDelete,
  onLikeToggle,
  onReport,
  onAuthorClick,
}) => {
  const getTypeText = () => {
    if (type === 'own') return 'Своя игра';
    if (type === 'quiz') return 'Викторина';
    if (type === 'wheel') return 'Колесо Фортуны';
    if (type === 'station') return 'Станции';
    if (type === 'tictactoe') return 'Крестики-нолики';
    return 'Крокодил';
  };

  const resolvedAuthorAvatar = resolveAvatarSrc(authorAvatar);
  const authorInitial = author?.trim().charAt(0).toUpperCase();
  const displayGameId = publicId?.trim() || id;

  return (
    <div className="game-card" onClick={onClick}>
      <div className="game-card-header">
        <div className="game-card-type">
          <GameTypeIcon
            type={type}
            className={`type-icon ${type === 'own' ? 'type-icon-own' : ''}`}
            alt={getTypeText()}
          />
          <span>{getTypeText()}</span>
        </div>
        <div className="game-card-header-actions">
          {isLibraryCard && (
            <button
              type="button"
              className="game-card-report-icon"
              aria-label="Пожаловаться"
              title="Пожаловаться"
              onClick={(e) => {
                e.stopPropagation();
                onReport?.();
              }}
            >
              <FaFlag size={14} />
            </button>
          )}
          {isLibraryCard && likes !== undefined && (
            <div className="library-likes-badge" aria-label={`Лайков: ${likes}`}>
              <FaHeart />
              <span>{likes}</span>
            </div>
          )}
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
        
        {isLibraryCard ? (
          <div className="game-card-library-footer-meta">
            <div className="game-card-meta-item game-card-library-id">
              <span className="meta-icon meta-icon-svg" aria-hidden>
                <FaHashtag size={14} />
              </span>
              <span>ID игры: {displayGameId}</span>
            </div>
            {author &&
              (onAuthorClick ? (
                <button
                  type="button"
                  className="game-card-meta-item game-card-library-author game-card-library-author--clickable"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAuthorClick();
                  }}
                  aria-label={`Профиль автора: ${author}`}
                >
                  <span className="author-avatar">
                    {resolvedAuthorAvatar ? (
                      <img src={resolvedAuthorAvatar} alt="" />
                    ) : (
                      authorInitial || '👤'
                    )}
                  </span>
                  <span>{author}</span>
                </button>
              ) : (
                <div className="game-card-meta-item game-card-library-author">
                  <span className="author-avatar">
                    {resolvedAuthorAvatar ? (
                      <img src={resolvedAuthorAvatar} alt={author} />
                    ) : (
                      authorInitial || '👤'
                    )}
                  </span>
                  <span>{author}</span>
                </div>
              ))}
          </div>
        ) : (
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
        )}

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
        {onUnpublish && isPublished && (
          <Button variant="secondary" size="small" onClick={(e) => { e.stopPropagation(); onUnpublish(); }}>
            Снять с публикации
          </Button>
        )}
        {onPlay && (
          <Button variant="primary" size="small" onClick={(e) => { e.stopPropagation(); onPlay(); }}>
            Играть
          </Button>
        )}
      </div>
    </div>
  );
};