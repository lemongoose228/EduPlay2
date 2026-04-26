import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateCard } from '../../widgets/template-card/TemplateCard';
import './CreateGamePage.css';

interface Template {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export const CreateGamePage: React.FC = () => {
  const navigate = useNavigate();

  const templates: Template[] = [
    {
      id: 'custom',
      title: 'Своя игра',
      description: 'Создайте собственную игру с настраиваемой сеткой вопросов. Вы можете регулировать количество категорий и вопросов, добавлять вопросы и ответы, устанавливать стоимость вопросов.',
      icon: '🎮',
      color: '#ff9e8b'
    },
    {
      id: 'quiz',
      title: 'Викторина',
      description: 'Классическая викторина с вопросами и ответами. Идеально подходит для быстрых игр и проверки знаний в различных темах. Можно настроить время на вопрос.',
      icon: '❓',
      color: '#4EFF6B'
    },
    {
      id: 'crocodile',
      title: 'Крокодил',
      description: 'Игра с терминами, которые нужно объяснять без слов. Создайте набор терминов, настройте таймер и проверьте, сколько терминов смогут угадать участники.',
      icon: '🐊',
      color: '#dd8bf9'
    },
    {
      id: 'wheel',
      title: 'Колесо Фортуны',
      description: 'Добавьте темы и задания. Ученик крутит колесо, получает выпавшую тему и отвечает на задания, пока темы не закончатся.',
      icon: '🎡',
      color: '#f2bf27'
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