import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameCard } from '../../widgets/game-card/GameCard';
import { Button } from '../../shared/ui/Button/Button';
import { Modal } from '../../shared/ui/Modal/Modal';
import { Input } from '../../shared/ui/Input/Input';
import './MyGamesPage.css';
import { createSessionApi, joinSessionApi } from '../../features/sessions/api/sessionsApi';
import { deleteGameApi, getMyGamesApi, publishGameApi } from '../../features/games/api/gamesApi';
import { useAppSelector } from '../../app/store/hooks';
import { selectAuthUser } from '../../features/auth/model/selectors';

interface Game {
  id: string;
  title: string;
  type: 'own' | 'quiz' | 'crocodile' | 'wheel';
  description?: string;
  questionsCount: number;
  createdAt: string;
  isPublished: boolean;
}

export const MyGamesPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector(selectAuthUser);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishData, setPublishData] = useState({ title: '', description: '' });
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all');

  const loadGames = async () => {
    setIsLoading(true);
    try {
      const backendGames = await getMyGamesApi();
      const mapped: Game[] = (backendGames || []).map((g: any) => {
        const questionsCount = (g.categories || []).reduce(
          (sum: number, cat: any) => sum + (cat.questions?.length ?? 0),
          0,
        );

        const createdAt = g.createdAt ? new Date(g.createdAt).toLocaleDateString('ru-RU') : '';

        return {
          id: g.id,
          title: g.title,
          type: g.type,
          description: g.description ?? undefined,
          questionsCount,
          createdAt,
          isPublished: g.status === 'published',
        };
      });

      setGames(mapped);
    } catch (e) {
      console.error(e);
      alert('Не удалось загрузить игры');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const handleCreateNewGame = () => {
    navigate('/create-game');
  };

  const handleEditGame = (gameId: string) => {
    navigate(`/template-builder/${gameId}`);
  };

  const handlePlayGame = async (gameId: string) => {
    try {
      const game = games.find((item) => item.id === gameId);
      const session = await createSessionApi({ gameId });
      if (user && game?.type !== 'crocodile' && game?.type !== 'wheel') {
        const trimmed = user.name?.trim();
        const playerName = trimmed && trimmed.length >= 2 ? trimmed : 'Хост';
        try {
          await joinSessionApi({ inviteCode: session.inviteCode, playerName });
        } catch (e) {
          console.warn('Auto-join host failed', e);
        }
      }
      navigate(`/game/${session.id}`);
    } catch (e) {
      console.error(e);
      alert('Не удалось создать игровую сессию');
    }
  };

  const handlePublishClick = (game: Game) => {
    setSelectedGame(game);
    setPublishData({ title: game.title, description: game.description || '' });
    setIsPublishModalOpen(true);
  };

  const handlePublish = async () => {
    if (!selectedGame) return;
    try {
      await publishGameApi(selectedGame.id, {
        title: publishData.title || undefined,
        description: publishData.description || undefined,
      });
      setIsPublishModalOpen(false);
      setSelectedGame(null);
      await loadGames();
    } catch (e) {
      console.error(e);
      alert('Не удалось опубликовать игру');
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту игру?')) return;
    try {
      await deleteGameApi(gameId);
      await loadGames();
    } catch (e) {
      console.error(e);
      alert('Не удалось удалить игру');
    }
  };

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      if (filter === 'published') return game.isPublished;
      if (filter === 'drafts') return !game.isPublished;
      return true;
    });
  }, [games, filter]);

  const stats = useMemo(
    () => ({
      total: games.length,
      published: games.filter((g) => g.isPublished).length,
      drafts: games.filter((g) => !g.isPublished).length,
    }),
    [games],
  );

  return (
    <div className="my-games-page">
      {isLoading ? (
        <div className="loading-container">Загрузка...</div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};