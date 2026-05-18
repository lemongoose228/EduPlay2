import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameCard } from '../../widgets/game-card/GameCard';
import { Button } from '../../shared/ui/Button/Button';
import { Modal } from '../../shared/ui/Modal/Modal';
import { Input } from '../../shared/ui/Input/Input';
import './MyGamesPage.css';
import { createSessionApi, joinSessionApi } from '../../features/sessions/api/sessionsApi';
import { deleteGameApi, getMyGamesApi, publishGameApi, unpublishGameApi } from '../../features/games/api/gamesApi';
import { useAppSelector } from '../../app/store/hooks';
import { selectAuthUser } from '../../features/auth/model/selectors';
import { useDialogs } from '../../shared/ui/DialogProvider';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { AgeRangeSlider } from '../../shared/ui/AgeRangeSlider/AgeRangeSlider';
import { GAME_AGE_CODE_MAX, GAME_AGE_CODE_MIN } from '../../shared/lib/gameAgeConstants';
import { GameTypeIcon } from '../../shared/lib/gameTypeIcons';
import ownIcon from '../../assets/own_icon.png';
import quizIcon from '../../assets/quiz_icon.png';
import crocodileIcon from '../../assets/crocodile_icon.png';
import wheelIcon from '../../assets/wheel_icon.png';
import { FaSearch } from 'react-icons/fa';

interface Game {
  id: string;
  title: string;
  type: 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station' | 'tictactoe';
  description?: string;
  questionsCount: number;
  createdAt: string;
  isPublished: boolean;
}

export const MyGamesPage: React.FC = () => {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useDialogs();
  const user = useAppSelector(selectAuthUser);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedType, setSelectedType] = useState<
    'all' | 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station' | 'tictactoe'
  >('all');
  const [filterAgeMin, setFilterAgeMin] = useState(GAME_AGE_CODE_MIN);
  const [filterAgeMax, setFilterAgeMax] = useState(GAME_AGE_CODE_MAX);

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishData, setPublishData] = useState({ title: '', description: '' });
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all');

  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0 });

  const mapBackendGames = useCallback((backendGames: any[]) => {
    return (backendGames || []).map((g: any) => {
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
      } as Game;
    });
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const backendGames = await getMyGamesApi();
      const mapped = mapBackendGames(backendGames);
      setStats({
        total: mapped.length,
        published: mapped.filter((g) => g.isPublished).length,
        drafts: mapped.filter((g) => !g.isPublished).length,
      });
    } catch (e) {
      console.error(e);
    }
  }, [mapBackendGames]);

  const loadGames = useCallback(async () => {
    setIsLoading(true);
    try {
      const sendsAgeRange =
        filterAgeMin !== GAME_AGE_CODE_MIN || filterAgeMax !== GAME_AGE_CODE_MAX;
      const backendGames = await getMyGamesApi({
        search: debouncedSearch.trim() || undefined,
        type: selectedType === 'all' ? undefined : selectedType,
        ...(sendsAgeRange ? { ageFrom: filterAgeMin, ageTo: filterAgeMax } : {}),
      });
      setGames(mapBackendGames(backendGames));
    } catch (e) {
      console.error(e);
      await showAlert('Не удалось загрузить игры');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedType, filterAgeMin, filterAgeMax, mapBackendGames, showAlert]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

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
      if (user && game?.type !== 'crocodile' && game?.type !== 'wheel' && game?.type !== 'station' && game?.type !== 'tictactoe') {
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
      await showAlert('Не удалось создать игровую сессию');
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
      await loadStats();
    } catch (e) {
      console.error(e);
      await showAlert('Не удалось опубликовать игру');
    }
  };

  const handleUnpublishGame = async (gameId: string) => {
    const ok = await showConfirm(
      'Игра исчезнет из общей библиотеки, но останется в черновиках. Статистика сохранится.',
      { title: 'Снять с публикации' },
    );
    if (!ok) return;
    try {
      await unpublishGameApi(gameId);
      await loadGames();
      await loadStats();
    } catch (e) {
      console.error(e);
      await showAlert('Не удалось снять игру с публикации');
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    const ok = await showConfirm('Вы уверены, что хотите удалить эту игру?', {
      title: 'Удаление игры',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteGameApi(gameId);
      await loadGames();
      await loadStats();
    } catch (e) {
      console.error(e);
      await showAlert('Не удалось удалить игру');
    }
  };

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      if (filter === 'published') return game.isPublished;
      if (filter === 'drafts') return !game.isPublished;
      return true;
    });
  }, [games, filter]);

  return (
    <div className="my-games-page">
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

          <div className="my-games-controls">
            <div className="my-games-filter-row">
              <div className="my-games-filter-col my-games-search-section">
                <Input
                  placeholder="Поиск по названию или описанию..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<FaSearch size={18} aria-hidden />}
                />
              </div>
              <div className="my-games-filter-col my-games-age-section">
                <span className="my-games-age-label">Возраст</span>
                <AgeRangeSlider
                  variant="compact"
                  id="mygames-age"
                  valueMin={filterAgeMin}
                  valueMax={filterAgeMax}
                  onChange={(a, b) => {
                    setFilterAgeMin(a);
                    setFilterAgeMax(b);
                  }}
                />
              </div>
            </div>

            <div className="my-games-type-filters">
              <button
                type="button"
                className={`my-games-filter-btn ${selectedType === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedType('all')}
              >
                Все типы
              </button>
              <button
                type="button"
                className={`my-games-filter-btn ${selectedType === 'own' ? 'active' : ''}`}
                onClick={() => setSelectedType('own')}
              >
                <span className="my-games-filter-label">
                  <img className="my-games-type-icon own" src={ownIcon} alt="" />
                  Своя игра
                </span>
              </button>
              <button
                type="button"
                className={`my-games-filter-btn ${selectedType === 'quiz' ? 'active' : ''}`}
                onClick={() => setSelectedType('quiz')}
              >
                <span className="my-games-filter-label">
                  <img className="my-games-type-icon" src={quizIcon} alt="" />
                  Викторина
                </span>
              </button>
              <button
                type="button"
                className={`my-games-filter-btn ${selectedType === 'crocodile' ? 'active' : ''}`}
                onClick={() => setSelectedType('crocodile')}
              >
                <span className="my-games-filter-label">
                  <img className="my-games-type-icon" src={crocodileIcon} alt="" />
                  Крокодил
                </span>
              </button>
              <button
                type="button"
                className={`my-games-filter-btn ${selectedType === 'wheel' ? 'active' : ''}`}
                onClick={() => setSelectedType('wheel')}
              >
                <span className="my-games-filter-label">
                  <img className="my-games-type-icon" src={wheelIcon} alt="" />
                  Колесо Фортуны
                </span>
              </button>
              <button
                type="button"
                className={`my-games-filter-btn ${selectedType === 'station' ? 'active' : ''}`}
                onClick={() => setSelectedType('station')}
              >
                <span className="my-games-filter-label">
                  <GameTypeIcon type="station" className="my-games-type-icon" alt="" />
                  Станции
                </span>
              </button>
              <button
                type="button"
                className={`my-games-filter-btn ${selectedType === 'tictactoe' ? 'active' : ''}`}
                onClick={() => setSelectedType('tictactoe')}
              >
                <span className="my-games-filter-label">
                  <GameTypeIcon type="tictactoe" className="my-games-type-icon" alt="" />
                  Крестики-нолики
                </span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-container">Загрузка...</div>
          ) : filteredGames.length > 0 ? (
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
                  onUnpublish={() => handleUnpublishGame(game.id)}
                  onDelete={() => handleDeleteGame(game.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>Игр не найдено</h3>
              <p>Попробуйте изменить фильтры или создайте новую игру.</p>
              <div className="empty-state-actions">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedType('all');
                    setFilterAgeMin(GAME_AGE_CODE_MIN);
                    setFilterAgeMax(GAME_AGE_CODE_MAX);
                    setFilter('all');
                  }}
                >
                  Сбросить фильтры
                </Button>
                <Button onClick={handleCreateNewGame}>Создать игру</Button>
              </div>
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
    </div>
  );
};