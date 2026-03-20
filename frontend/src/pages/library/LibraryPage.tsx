import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameCard } from '../../widgets/game-card/GameCard';
import { Input } from '../../shared/ui/Input/Input';
import { Button } from '../../shared/ui/Button/Button';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { useAppSelector } from '../../app/store/hooks';
import { selectAuthUser } from '../../features/auth/model/selectors';
import { createSessionApi, joinSessionApi } from '../../features/sessions/api/sessionsApi';
import { searchLibraryApi } from '../../features/library/api/libraryApi';
import './LibraryPage.css';

interface PublicGame {
  id: string;
  title: string;
  type: 'own' | 'quiz';
  description?: string;
  author: string;
  plays: number;
  likes: number;
  questionsCount: number;
}

export const LibraryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedType, setSelectedType] = useState<'all' | 'own' | 'quiz'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'likes' | 'newest'>('popular');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const user = useAppSelector(selectAuthUser);

  const storageKey = user ? `likedGames_${user.id}` : 'likedGames_guest';
  const [likedIds, setLikedIds] = useState<string[]>([]);
  
  const debouncedSearch = useDebounce(searchTerm, 500);

  const navigate = useNavigate();

  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setLikedIds(raw ? JSON.parse(raw) : []);
    } catch {
      setLikedIds([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(likedIds));
    } catch {
      // Игнорируем ошибку записи в localStorage
    }
  }, [likedIds, storageKey]);

  const games = useMemo(() => {
    return items.map((game: any) => {
      const questionsCount = (game.categories || []).reduce(
        (sum: number, cat: any) => sum + (cat.questions?.length ?? 0),
        0,
      );

      return {
        id: game.id,
        title: game.title,
        type: game.type,
        description: game.description,
        author: game.author?.name ?? '',
        plays: game.plays ?? 0,
        likes: (game.likes ?? 0) + (likedIds.includes(game.id) ? 1 : 0),
        questionsCount,
      } as PublicGame;
    });
  }, [items, likedIds]);

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

  const handleToggleLike = (gameId: string) => {
    setLikedIds((prevIds) => {
      const alreadyLiked = prevIds.includes(gameId);
      return alreadyLiked ? prevIds.filter((id) => id !== gameId) : [...prevIds, gameId];
    });
  };

  const handlePlayGame = async (gameId: string) => {
    try {
      const session = await createSessionApi({ gameId });
      if (user) {
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
        <button
          className={`library-tab ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          Избранное {likedIds.length > 0 ? `(${likedIds.length})` : ''}
        </button>
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
              onLikeToggle={() => handleToggleLike(game.id)}
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