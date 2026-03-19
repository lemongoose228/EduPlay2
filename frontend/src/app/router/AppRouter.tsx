import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CreateGamePage } from '../../pages/create-game/CreateGamePage';
import { MyGamesPage } from '../../pages/my-games/MyGamesPage';
import { LibraryPage } from '../../pages/library/LibraryPage';
import { GameSessionsPage } from '../../pages/game-sessions/GameSessionsPage';
import { TemplateBuilderPage } from '../../pages/template-builder/TemplateBuilderPage';
import { GamePage } from '../../pages/game/GamePage';
import { AuthPage } from '../../features/auth/ui/AuthPage';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated } from '../../features/auth/model/selectors';

export const AppRouter: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/create-game" replace />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      <Route
        path="/create-game"
        element={isAuthenticated ? <CreateGamePage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/my-games"
        element={isAuthenticated ? <MyGamesPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/library"
        element={isAuthenticated ? <LibraryPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/game-sessions"
        element={isAuthenticated ? <GameSessionsPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/template-builder/:templateId"
        element={isAuthenticated ? <TemplateBuilderPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/game/:sessionId"
        element={isAuthenticated ? <GamePage /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
};