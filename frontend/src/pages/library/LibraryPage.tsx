import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GameCard } from '../../widgets/game-card/GameCard';
import { Input } from '../../shared/ui/Input/Input';
import { Button } from '../../shared/ui/Button/Button';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { mockGames } from '../../features/games/types/game.types';
import './LibraryPage.css';

interface PublicGame {
  id: string;
  title: string;
  type: 'own' | 'quiz';
  description: string;
  author: string;
  plays: number;
  rating: number;
  questionsCount: number;
}

export const LibraryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedType, setSelectedType] = useState<'all' | 'own' | 'quiz'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular');
  
  const debouncedSearch = useDebounce(searchTerm, 500);

  const [games] = useState<PublicGame[]>([
    {
      id: '1',
      title: 'История России',
      type: 'own',
      description: 'Проверьте свои знания истории России от древних времен до современности',
      author: 'Иван Петров',
      plays: 1234,
      rating: 4.8,
      questionsCount: 25
    },
    {
      id: '2',
      title: 'География мира',
      type: 'quiz',
      description: 'Увлекательная викторина о странах, столицах и географических особенностях',
      author: 'Анна Смирнова',
      plays: 892,
      rating: 4.5,
      questionsCount: 15
    },
    {
      id: '3',
      title: 'Научные открытия',
      type: 'own',
      description: 'Великие открытия и изобретения, изменившие мир',
      author: 'Петр Васильев',
      plays: 567,
      rating: 4.9,
      questionsCount: 30
    }
  ]);

  useEffect(() => {
    if (debouncedSearch) {
      setSearchParams({ search: debouncedSearch });
    } else {
      setSearchParams({});
    }
  }, [debouncedSearch, setSearchParams]);

  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || game.type === selectedType;
    return matchesSearch && matchesType;
  });

  const sortedGames = [...filteredGames].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.plays - a.plays;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return 0; // В реальном приложении здесь будет сортировка по дате
      default:
        return 0;
    }
  });

  const handlePlayGame = (gameId: string) => {
    console.log('Start playing game:', gameId);
    // Здесь будет навигация к созданию сессии
  };

  return (
    <div className="library-page">
      <div className="page-header">
        <h1 className="page-title">Библиотека игр</h1>
        <p className="page-description">
          Игры, созданные пользователями
        </p>
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
              <option value="rating">По рейтингу</option>
              <option value="newest">Сначала новые</option>
            </select>
          </div>
        </div>
      </div>

      {sortedGames.length > 0 ? (
        <div className="games-grid">
          {sortedGames.map((game) => (
            <GameCard
              key={game.id}
              id={game.id}
              title={game.title}
              type={game.type}
              description={game.description}
              questionsCount={game.questionsCount}
              author={game.author}
              plays={game.plays}
              rating={game.rating}
              onPlay={() => handlePlayGame(game.id)}
            />
          ))}
        </div>
      ) : (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>Игры не найдены</h3>
          <p>Попробуйте изменить параметры поиска</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('');
              setSelectedType('all');
              setSortBy('popular');
            }}
          >
            Сбросить фильтры
          </Button>
        </div>
      )}
    </div>
  );
};