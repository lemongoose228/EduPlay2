import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateCard } from '../../widgets/template-card/TemplateCard';
import { GameTypeIcon } from '../../shared/lib/gameTypeIcons';
import ownIcon from '../../assets/own_icon.png';
import quizIcon from '../../assets/quiz_icon.png';
import crocodileIcon from '../../assets/crocodile_icon.png';
import wheelIcon from '../../assets/wheel_icon.png';
import './CreateGamePage.css';

interface Template {
  id: string;
  title: string;
  description: string;
  icon: string | React.ReactNode;
  color: string;
}

export const CreateGamePage: React.FC = () => {
  const navigate = useNavigate();

  const templates: Template[] = [
    {
      id: 'custom',
      title: 'Своя игра',
      description: 'Создайте собственную игру с настраиваемой сеткой вопросов. Вы можете регулировать количество категорий и вопросов, добавлять вопросы и ответы, устанавливать стоимость вопросов.',
      icon: ownIcon,
      color: '#ff9e8b'
    },
    {
      id: 'quiz',
      title: 'Викторина',
      description: 'Классическая викторина с вопросами и ответами. Идеально подходит для быстрых игр и проверки знаний в различных темах. Можно настроить время на вопрос.',
      icon: quizIcon,
      color: '#4EFF6B'
    },
    {
      id: 'crocodile',
      title: 'Крокодил',
      description: 'Игра с терминами, которые нужно объяснять без слов. Создайте набор терминов, настройте таймер и проверьте, сколько терминов смогут угадать участники.',
      icon: crocodileIcon,
      color: '#dd8bf9'
    },
    {
      id: 'wheel',
      title: 'Колесо Фортуны',
      description: 'Добавьте темы и задания. Ученик крутит колесо, получает выпавшую тему и отвечает на задания, пока темы не закончатся.',
      icon: wheelIcon,
      color: '#f2bf27'
    },
    {
      id: 'station',
      title: 'Станции',
      description: 'Маршрут по станциям с заданиями. Учитель отмечает прохождение станций и видит прогресс в реальном времени.',
      icon: <GameTypeIcon type="station" className="template-icon" alt="Станции" />,
      color: '#6ee7b7'
    }
  ];

  const handleTemplateSelect = (templateId: string) => {
    navigate(`/template-builder/${templateId}`);
  };

  return (
    <div className="create-game-page">
      <div className="page-header">
        <h1 className="page-title">Создать игру</h1>
        <p className="page-description">
          Выберите шаблон для создания новой игры
        </p>
      </div>
      
      <div className="templates-grid">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            id={template.id}
            title={template.title}
            description={template.description}
            icon={template.icon}
            color={template.color}
            onSelect={handleTemplateSelect}
          />
        ))}
      </div>
    </div>
  );
};