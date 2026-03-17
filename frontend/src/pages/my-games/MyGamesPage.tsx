import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameCard } from '../../widgets/game-card/GameCard';
import { Button } from '../../shared/ui/Button/Button';
import { Modal } from '../../shared/ui/Modal/Modal';
import { Input } from '../../shared/ui/Input/Input';
import { mockGames } from '../../features/games/types/game.types';
import './MyGamesPage.css';

interface Game {
  id: string;
  title: string;
  type: 'own' | 'quiz';
  description: string;
  questionsCount: number;
  createdAt: string;
  isPublished: boolean;
}

export const MyGamesPage: React.FC = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([
    {
      id: '1',
      title: 'История России',
      type: 'own',
      description: 'Вопросы по истории России от древних времен до современности',
      questionsCount: 25,
      createdAt: '15.01.2024',
      isPublished: true
    },
    {
      id: '2',
      title: 'География мира',
      type: 'quiz',
      description: 'Проверьте свои знания географии',
      questionsCount: 15,
      createdAt: '20.01.2024',
      isPublished: false
    },
    {
      id: '3',
      title: 'Научные открытия',
      type: 'own',
      description: 'Великие открытия и изобретения',
      questionsCount: 30,
      createdAt: '22.01.2024',
      isPublished: false
    }
  ]);

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishData, setPublishData] = useState({ title: '', description: '' });
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all');

  const handleCreateNewGame = () => {
    navigate('/create-game');
  };

  const handleEditGame = (gameId: string) => {
    navigate(`/template-builder/${gameId}`);
  };

  const handlePlayGame = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  const handlePublishClick = (game: Game) => {
    setSelectedGame(game);
    setPublishData({ title: game.title, description: game.description });
    setIsPublishModalOpen(true);
  };

  const handlePublish = () => {
    if (selectedGame) {
      setGames(games.map(g => 
        g.id === selectedGame.id ? { ...g, isPublished: true } : g
      ));
      setIsPublishModalOpen(false);
    }
  };

  const handleDeleteGame = (gameId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту игру?')) {
      setGames(games.filter(g => g.id !== gameId));
    }
  };

  const filteredGames = games.filter(game => {
    if (filter === 'published') return game.isPublished;
    if (filter === 'drafts') return !game.isPublished;
    return true;
  });

  const stats = {
    total: games.length,
    published: games.filter(g => g.isPublished).length,
    drafts: games.filter(g => !g.isPublished).length
  };

  return (
    <div className="my-games-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Мои игры</h1>
          <p className="page-subtitle">Все созданные вами игры</p>
        </div>
        <Button onClick={handleCreateNewGame} icon="+">
          Создать игру
        </Button>
      </div>

      <div className="games-stats">
        <div className="stat-card" onClick={() => setFilter('all')}>
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Всего игр</span>
        </div>
        <div className="stat-card" onClick={() => setFilter('published')}>
          <span className="stat-value">{stats.published}</span>
          <span className="stat-label">Опубликовано</span>
        </div>
        <div className="stat-card" onClick={() => setFilter('drafts')}>
          <span className="stat-value">{stats.drafts}</span>
          <span className="stat-label">Черновиков</span>
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
          className={`filter-tab ${filter === 'published' ? 'active' : ''}`}
          onClick={() => setFilter('published')}
        >
          Опубликованные
        </button>
        <button 
          className={`filter-tab ${filter === 'drafts' ? 'active' : ''}`}
          onClick={() => setFilter('drafts')}
        >
          Черновики
        </button>
      </div>

      {filteredGames.length > 0 ? (
        <div className="games-grid">
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              id={game.id}
              title={game.title}
              type={game.type}
              description={game.description}
              questionsCount={game.questionsCount}
              createdAt={game.createdAt}
              isPublished={game.isPublished}
              onEdit={() => handleEditGame(game.id)}
              onPlay={() => handlePlayGame(game.id)}
              onPublish={() => handlePublishClick(game)}
              onDelete={() => handleDeleteGame(game.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>Игр не найдено</h3>
          <p>Создайте свою первую игру прямо сейчас!</p>
          <Button onClick={handleCreateNewGame}>Создать игру</Button>
        </div>
      )}

      <Modal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title="Публикация игры"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsPublishModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handlePublish}>
              Опубликовать
            </Button>
          </>
        }
      >
        <div className="publish-form">
          <Input
            label="Название игры"
            value={publishData.title}
            onChange={(e) => setPublishData({ ...publishData, title: e.target.value })}
            placeholder="Введите название игры"
          />
          <Input
            label="Описание"
            value={publishData.description}
            onChange={(e) => setPublishData({ ...publishData, description: e.target.value })}
            placeholder="Введите описание игры"
          />
        </div>
      </Modal>
    </div>
  );
};