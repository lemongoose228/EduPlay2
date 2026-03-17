import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BuilderLayout } from './components/BuilderLayout';
import { OwnGameBuilder } from './components/OwnGameBuilder';
import { QuizGameBuilder } from './components/QuizGameBuilder';
import type { GameTemplate } from '../../features/templates/types/template.types';
import './TemplateBuilderPage.css';

export const TemplateBuilderPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const handleSave = (gameData: GameTemplate) => {
    console.log('Сохранение игры:', gameData);
    
    // Здесь будет API вызов для сохранения
    setTimeout(() => {
      alert('Игра успешно сохранена!');
      navigate('/my-games');
    }, 500);
  };

  const handleCancel = () => {
    navigate('/create-game');
  };

  const renderBuilder = () => {
    switch (templateId) {
      case 'custom':
        return (
          <OwnGameBuilder
            onSave={handleSave}
            onCancel={handleCancel}
          />
        );
      
      case 'quiz':
        return (
          <QuizGameBuilder
            onSave={handleSave}
            onCancel={handleCancel}
          />
        );
      
      default:
        return (
          <div className="error-container">
            <div className="error-icon">😕</div>
            <h2>Шаблон не найден</h2>
            <p>Выбранный шаблон игры не существует</p>
            <button className="back-button" onClick={handleCancel}>
              Вернуться к выбору шаблонов
            </button>
          </div>
        );
    }
  };

  return (
    <BuilderLayout>
      {renderBuilder()}
    </BuilderLayout>
  );
};