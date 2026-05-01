import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameCard } from '../../widgets/game-card/GameCard';
import { Input } from '../../shared/ui/Input/Input';
import { Button } from '../../shared/ui/Button/Button';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { useAppSelector } from '../../app/store/hooks';
import { selectAuthUser } from '../../features/auth/model/selectors';
import { GAME_TYPE_ICON_MAP } from '../../shared/lib/gameTypeIcons';
import { createSessionApi, joinSessionApi } from '../../features/sessions/api/sessionsApi';
import { likeGameApi, unlikeGameApi, getLikedGameIdsApi } from '../../features/games/api/gamesApi';
import { searchLibraryApi, type LibraryGameDto } from '../../features/library/api/libraryApi';
import { createReportApi } from '../../features/reports/api/reportsApi';
import './LibraryPage.css';

interface PublicGame {
  id: string;
  publicId: string;
  title: string;
  type: 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station';
  description?: string;
  author: string;
  authorId: string;
  authorAvatar?: string;
  likes: number;
}

export const LibraryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedType, setSelectedType] = useState<'all' | 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station'>('all');
  const [sortBy, setSortBy] = useState<'' | 'likes' | 'newest'>('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const user = useAppSelector(selectAuthUser);

  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likesByGame, setLikesByGame] = useState<Record<string, number>>({});

  const debouncedSearch = useDebounce(searchTerm, 500);

  const navigate = useNavigate();

  const [items, setItems] = useState<LibraryGameDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLikedIds([]);
      setActiveTab('all');
      return;
    }
    let cancelled = false;
    getLikedGameIdsApi()
      .then((ids) => {
        if (!cancelled) setLikedIds(ids);
      })
      .catch(() => {
        if (!cancelled) setLikedIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const games = useMemo(() => {
    return items.map((game) => {
      const likes = likesByGame[game.id] ?? game.likes ?? 0;

      return {
        id: game.id,
        publicId: game.publicId ?? '',
        title: game.title,
        type: game.type,
        description: game.description,
        author: game.author?.name ?? '',
        authorId: game.author?.id ?? '',
        authorAvatar: game.author?.avatar ?? undefined,
        likes,
      } as PublicGame;
    });
  }, [items, likesByGame]);

  const visibleGames = useMemo(() => {
    return activeTab === 'favorites' ? games.filter((g) => likedIds.includes(g.id)) : games;
  }, [games, activeTab, likedIds]);

  useEffect(() => {
    if (debouncedSearch) {
      setSearchParams({ search: debouncedSearch });
    } else {
      setSearchParams({});
    }
  }, [debouncedSearch, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLibrary() {
      setIsLoading(true);
      try {
        const data = await searchLibraryApi({
          search: debouncedSearch || undefined,
          type: selectedType === 'all' ? undefined : selectedType,
          sortBy: sortBy || undefined,
          page: 1,
          limit: 12,
        });

        if (cancelled) return;
        setItems(data?.items ?? []);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          alert('Не удалось загрузить библиотеку. Попробуйте снова.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchLibrary();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedType, sortBy]);

  const handleReportGame = async (gameId: string) => {
    const reason = window.prompt('Опишите причину жалобы');
    if (!reason || reason.trim().length < 5) {
      alert('Причина жалобы должна быть минимум 5 символов');
      return;
    }
    try {
      await createReportApi({ gameId, reason: reason.trim() });
      alert('Жалоба отправлена');
    } catch (e) {
      console.error(e);
      alert('Не удалось отправить жалобу');
    }
  };

  useEffect(() => {
    const map: Record<string, number> = {};
    items.forEach((g) => {
      map[g.id] = g.likes ?? 0;
    });
    setLikesByGame((prev) => ({ ...prev, ...map }));
  }, [items]);

  const handleToggleLike = async (gameId: string) => {
    if (!user) return;
    const alreadyLiked = likedIds.includes(gameId);
    try {
      if (alreadyLiked) {
        const { likes } = await unlikeGameApi(gameId);
        setLikedIds((prev) => prev.filter((id) => id !== gameId));
        setLikesByGame((prev) => ({ ...prev, [gameId]: likes }));
      } else {
        const { likes } = await likeGameApi(gameId);
        setLikedIds((prev) => [...prev, gameId]);
        setLikesByGame((prev) => ({ ...prev, [gameId]: likes }));
      }
    } catch (e) {
      console.error(e);
      alert('Не удалось изменить лайк');
    }
  };

  const handlePlayGame = async (gameId: string) => {
    try {
      const game = games.find((item) => item.id === gameId);
      const session = await createSessionApi({ gameId });
      if (user && game?.type !== 'crocodile' && game?.type !== 'wheel' && game?.type !== 'station') {
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

  return (
    <div className="library-page">
      <div className="page-header">
        <h1 className="page-title">Библиотека игр</h1>
        <p className="page-description">
          Игры, созданные пользователями
        </p>
      </div>

      <div className="library-tabs">
        <button
          className={`library-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Все игры
        </button>
        {user && (
          <button
            className={`library-tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            Избранное {likedIds.length > 0 ? `(${likedIds.length})` : ''}
          </button>
        )}
      </div>

      <div className="library-controls">
        <div className="search-section">
          <Input
            placeholder="Название, автор, числовой ID игры или пользователя..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon="🔍"
          />
        </div>
        
        <div className="filters-row">
          <div className="type-filters">
            <button
              className={`filter-btn ${selectedType === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedType('all')}
            >
              Все игры
            </button>
            <button
              className={`filter-btn ${selectedType === 'own' ? 'active' : ''}`}
              onClick={() => setSelectedType('own')}
            >
              <span className="filter-label">
                <img className="filter-type-icon filter-type-icon-own" src={GAME_TYPE_ICON_MAP.own} alt="Своя игра" />
                Своя игра
              </span>
            </button>
            <button
              className={`filter-btn ${selectedType === 'quiz' ? 'active' : ''}`}
              onClick={() => setSelectedType('quiz')}
            >
              <span className="filter-label">
                <img className="filter-type-icon" src={GAME_TYPE_ICON_MAP.quiz} alt="Викторина" />
                Викторина
              </span>
            </button>
            <button
              className={`filter-btn ${selectedType === 'crocodile' ? 'active' : ''}`}
              onClick={() => setSelectedType('crocodile')}
            >
              <span className="filter-label">
                <img className="filter-type-icon" src={GAME_TYPE_ICON_MAP.crocodile} alt="Крокодил" />
                Крокодил
              </span>
            </button>
            <button
              className={`filter-btn ${selectedType === 'wheel' ? 'active' : ''}`}
              onClick={() => setSelectedType('wheel')}
            >
              <span className="filter-label">
                <img className="filter-type-icon" src={GAME_TYPE_ICON_MAP.wheel} alt="Колесо Фортуны" />
                Колесо Фортуны
              </span>
            </button>
            <button
              className={`filter-btn ${selectedType === 'station' ? 'active' : ''}`}
              onClick={() => setSelectedType('station')}
            >
              <span className="filter-label">
                <img className="filter-type-icon" src={GAME_TYPE_ICON_MAP.station} alt="Станции" />
                Станции
              </span>
            </button>
          </div>

          <div className="sort-select">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as '' | 'likes' | 'newest')}
              className="sort-dropdown"
            >
              <option value="">Сортировка</option>
              <option value="likes">По лайкам</option>
              <option value="newest">Сначала новые</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">Загрузка...</div>
      ) : visibleGames.length > 0 ? (
        <div className="games-grid">
          {visibleGames.map((game) => (
            <GameCard
              key={game.id}
              id={game.id}
              publicId={game.publicId}
              title={game.title}
              type={game.type}
              description={game.description}
              isLibraryCard
              author={game.author}
              authorAvatar={game.authorAvatar}
              likes={game.likes}
              isLiked={likedIds.includes(game.id)}
              onLikeToggle={user ? () => handleToggleLike(game.id) : undefined}
              onReport={user && game.authorId !== user.id ? () => handleReportGame(game.id) : undefined}
              onPlay={() => handlePlayGame(game.id)}
            />
          ))}
        </div>
      ) : (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>{activeTab === 'favorites' ? 'В избранном пока пусто' : 'Игры не найдены'}</h3>
          <p>
            {activeTab === 'favorites'
              ? 'Лайкните игру, чтобы добавить её в избранное'
              : 'Попробуйте изменить параметры поиска'}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setSelectedType('all');
              setActiveTab('all');
              setSortBy('');
            }}
          >
            Сбросить
          </Button>
        </div>
      )}
    </div>
  );
};