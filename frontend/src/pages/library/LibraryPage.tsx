import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameCard } from '../../widgets/game-card/GameCard';
import { Input } from '../../shared/ui/Input/Input';
import { Button } from '../../shared/ui/Button/Button';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { useAppSelector } from '../../app/store/hooks';
import { selectAuthUser } from '../../features/auth/model/selectors';
import { createSessionApi, joinSessionApi } from '../../features/sessions/api/sessionsApi';
import { likeGameApi, unlikeGameApi, getLikedGameIdsApi } from '../../features/games/api/gamesApi';
import { searchLibraryApi } from '../../features/library/api/libraryApi';
import './LibraryPage.css';

interface PublicGame {
  id: string;
  title: string;
  type: 'own' | 'quiz' | 'crocodile';
  description?: string;
  author: string;
  plays: number;
  likes: number;
  questionsCount: number;
}

export const LibraryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedType, setSelectedType] = useState<'all' | 'own' | 'quiz' | 'crocodile'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'likes' | 'newest'>('popular');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const user = useAppSelector(selectAuthUser);

  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likesByGame, setLikesByGame] = useState<Record<string, number>>({});

  const debouncedSearch = useDebounce(searchTerm, 500);

  const navigate = useNavigate();

  const [items, setItems] = useState<any[]>([]);
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
    return items.map((game: any) => {
      const questionsCount = (game.categories || []).reduce(
        (sum: number, cat: any) => sum + (cat.questions?.length ?? 0),
        0,
      );
      const likes = likesByGame[game.id] ?? game.likes ?? 0;

      return {
        id: game.id,
        title: game.title,
        type: game.type,
        description: game.description,
        author: game.author?.name ?? '',
        plays: game.plays ?? 0,
        likes,
        questionsCount,
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
          sortBy,
          page: 1,
          limit: 12,
        });

        if (cancelled) return;
        setItems(data?.items ?? []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchLibrary();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedType, sortBy]);

  useEffect(() => {
    const map: Record<string, number> = {};
    items.forEach((g: any) => {
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
      // «Крокодил» — только локально у преподавателя, без join по коду.
      if (user && game?.type !== 'crocodile') {
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
            placeholder="Поиск игр по названию, описанию или автору..."
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
              🎮 Своя игра
            </button>
            <button
              className={`filter-btn ${selectedType === 'quiz' ? 'active' : ''}`}
              onClick={() => setSelectedType('quiz')}
            >
              ❓ Викторина
            </button>
            <button
              className={`filter-btn ${selectedType === 'crocodile' ? 'active' : ''}`}
              onClick={() => setSelectedType('crocodile')}
            >
              🐊 Крокодил
            </button>
          </div>

          <div className="sort-select">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="sort-dropdown"
            >
              <option value="popular">По популярности</option>
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
              title={game.title}
              type={game.type}
              description={game.description}
              questionsCount={game.questionsCount}
              author={game.author}
              plays={game.plays}
              likes={game.likes}
              isLiked={likedIds.includes(game.id)}
              onLikeToggle={user ? () => handleToggleLike(game.id) : undefined}
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
              setSortBy('popular');
            }}
          >
            Сбросить
          </Button>
        </div>
      )}
    </div>
  );
};