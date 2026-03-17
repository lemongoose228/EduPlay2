import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CreateGamePage } from '../../pages/create-game/CreateGamePage';
import { MyGamesPage } from '../../pages/my-games/MyGamesPage';
import { LibraryPage } from '../../pages/library/LibraryPage';
import { GameSessionsPage } from '../../pages/game-sessions/GameSessionsPage';
import { TemplateBuilderPage } from '../../pages/template-builder/TemplateBuilderPage';
import { GamePage } from '../../pages/game/GamePage';

export const AppRouter: React.FC = () => {
  // Временная заглушка для авторизации
  const isAuthenticated = true;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/create-game" replace />} />
      <Route path="/create-game" element={<CreateGamePage />} />
      <Route path="/my-games" element={<MyGamesPage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/game-sessions" element={<GameSessionsPage />} />
      <Route path="/template-builder/:templateId" element={<TemplateBuilderPage />} />
      <Route path="/game/:sessionId" element={<GamePage />} />
    </Routes>
  );
};