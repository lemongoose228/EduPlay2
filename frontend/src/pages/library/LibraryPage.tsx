import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameCard } from '../../widgets/game-card/GameCard';
import { Input } from '../../shared/ui/Input/Input';
import { Button } from '../../shared/ui/Button/Button';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { useAppSelector } from '../../app/store/hooks';
import { selectAuthUser, selectIsAuthenticated } from '../../features/auth/model/selectors';
import { GameTypeIcon } from '../../shared/lib/gameTypeIcons';
import ownIcon from '../../assets/own_icon.png';
import quizIcon from '../../assets/quiz_icon.png';
import crocodileIcon from '../../assets/crocodile_icon.png';
import wheelIcon from '../../assets/wheel_icon.png';
import { createSessionApi, joinSessionApi } from '../../features/sessions/api/sessionsApi';
import { likeGameApi, unlikeGameApi, getLikedGameIdsApi } from '../../features/games/api/gamesApi';
import { searchLibraryApi, type LibraryGameDto } from '../../features/library/api/libraryApi';
import { createReportApi } from '../../features/reports/api/reportsApi';
import { useDialogs } from '../../shared/ui/DialogProvider';
import { Modal } from '../../shared/ui/Modal/Modal';
import { resolveAvatarSrc } from '../../shared/lib/resolveAvatarSrc';
import { FaSearch } from 'react-icons/fa';
import './LibraryPage.css';

interface PublicGame {
  id: string;
  publicId: string;
  title: string;
  type: 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station';
  description?: string;
  author: string;
  authorAvatar?: string;
  authorId?: string;
  authorPublicId?: string;
  likes: number;
}

type AuthorModalState = {
  name: string;
  avatar?: string;
  id: string;
  publicId?: string;
};

export const LibraryPage: React.FC = () => {
  const { showAlert, showPrompt } = useDialogs();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedType, setSelectedType] = useState<'all' | 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station'>('all');
  const [sortBy, setSortBy] = useState<'' | 'likes' | 'newest'>('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const user = useAppSelector(selectAuthUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likesByGame, setLikesByGame] = useState<Record<string, number>>({});

  const debouncedSearch = useDebounce(searchTerm, 500);

  const navigate = useNavigate();

  const [items, setItems] = useState<LibraryGameDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authorModal, setAuthorModal] = useState<AuthorModalState | null>(null);

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

      const authorPublicId = game.author?.publicId;
      return {
        id: game.id,
        publicId: game.publicId ?? '',
        title: game.title,
        type: game.type,
        description: game.description,
        author: game.author?.name ?? '',
        authorAvatar: game.author?.avatar ?? undefined,
        authorId: game.author?.id,
        authorPublicId:
          authorPublicId !== undefined && authorPublicId !== null
            ? String(authorPublicId)
            : undefined,
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
          void showAlert('Не удалось загрузить библиотеку. Попробуйте снова.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchLibrary();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedType, sortBy, showAlert]);

  const handleReportGame = async (gameId: string) => {
    const reason = await showPrompt({
      title: 'Жалоба на игру',
      label: 'Опишите причину жалобы',
      multiline: true,
      minLength: 5,
      submitText: 'Отправить',
      placeholder: 'Не менее 5 символов',
    });
    if (reason === null) return;
    try {
      await createReportApi({ gameId, reason });
      await showAlert('Жалоба отправлена');
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      await showAlert(typeof msg === 'string' ? msg : 'Не удалось отправить жалобу');
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
      await showAlert('Не удалось изменить лайк');
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
      await showAlert('Не удалось создать игровую сессию');
    }
  };

  const authorModalAvatarSrc = authorModal ? resolveAvatarSrc(authorModal.avatar) : null;
  const authorModalInitial = authorModal?.name.trim().charAt(0).toUpperCase() ?? '';
  const authorModalIdLabel = authorModal?.publicId?.trim()
    ? `ID: ${authorModal.publicId.trim()}`
    : authorModal
      ? `ID пользователя: ${authorModal.id}`
      : '';

  return (
    <div className="library-page">
      <Modal
        isOpen={!!authorModal}
        onClose={() => setAuthorModal(null)}
        title="Профиль автора"
        size="small"
      >
        {authorModal && (
          <div className="library-author-modal">
            <div className="library-author-modal-avatar" aria-hidden>
              {authorModalAvatarSrc ? (
                <img src={authorModalAvatarSrc} alt="" />
              ) : (
                <span className="library-author-modal-avatar-fallback">
                  {authorModalInitial || '👤'}
                </span>
              )}
            </div>
            <p className="library-author-modal-name">{authorModal.name}</p>
            <p className="library-author-modal-id">{authorModalIdLabel}</p>
          </div>
        )}
      </Modal>

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
            Избранное 
            {/* {likedIds.length > 0 ? `(${likedIds.length})` : ''} */}
          </button>
        )}
      </div>

      <div className="library-controls">
        <div className="search-row">
          <div className="search-section">
            <Input
              placeholder="Название, автор, числовой ID игры или пользователя..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<FaSearch size={18} aria-hidden />}
            />
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
                <img className="filter-type-icon filter-type-icon-own" src={ownIcon} alt="Своя игра" />
                Своя игра
              </span>
            </button>
            <button
              className={`filter-btn ${selectedType === 'quiz' ? 'active' : ''}`}
              onClick={() => setSelectedType('quiz')}
            >
              <span className="filter-label">
                <img className="filter-type-icon" src={quizIcon} alt="Викторина" />
                Викторина
              </span>
            </button>
            <button
              className={`filter-btn ${selectedType === 'crocodile' ? 'active' : ''}`}
              onClick={() => setSelectedType('crocodile')}
            >
              <span className="filter-label">
                <img className="filter-type-icon" src={crocodileIcon} alt="Крокодил" />
                Крокодил
              </span>
            </button>
            <button
              className={`filter-btn ${selectedType === 'wheel' ? 'active' : ''}`}
              onClick={() => setSelectedType('wheel')}
            >
              <span className="filter-label">
                <img className="filter-type-icon" src={wheelIcon} alt="Колесо Фортуны" />
                Колесо Фортуны
              </span>
            </button>
            <button
              className={`filter-btn ${selectedType === 'station' ? 'active' : ''}`}
              onClick={() => setSelectedType('station')}
            >
              <span className="filter-label">
                <GameTypeIcon type="station" className="filter-type-icon" alt="Станции" />
                Станции
              </span>
            </button>
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
              onReport={isAuthenticated ? () => handleReportGame(game.id) : undefined}
              onPlay={() => handlePlayGame(game.id)}
              onAuthorClick={
                game.author && game.authorId
                  ? () =>
                      setAuthorModal({
                        name: game.author,
                        avatar: game.authorAvatar,
                        id: game.authorId,
                        publicId: game.authorPublicId,
                      })
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="no-results">
          <div className="no-results-icon">
            <FaSearch size={64} aria-hidden />
          </div>
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