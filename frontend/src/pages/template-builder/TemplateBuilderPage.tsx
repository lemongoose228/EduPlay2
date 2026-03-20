import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BuilderLayout } from './components/BuilderLayout';
import { OwnGameBuilder } from './components/OwnGameBuilder';
import { QuizGameBuilder } from './components/QuizGameBuilder';
import type {
  GameTemplate,
  OwnGameTemplate,
  QuizTemplate,
  QuizQuestion,
  OwnGameCategory,
} from '../../features/templates/types/template.types';
import './TemplateBuilderPage.css';
import { createGameApi, getGameApi, updateGameApi } from '../../features/games/api/gamesApi';

export const TemplateBuilderPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const isTemplateMode = useMemo(() => templateId === 'custom' || templateId === 'quiz', [templateId]);
  const editingGameId = useMemo(() => (isTemplateMode ? null : templateId || null), [isTemplateMode, templateId]);

  const [isLoading, setIsLoading] = useState(false);
  const [initialData, setInitialData] = useState<GameTemplate | undefined>(undefined);
  const [gameKind, setGameKind] = useState<'own' | 'quiz'>(() => {
    if (templateId === 'custom') return 'own';
    return 'quiz';
  });

  useEffect(() => {
    let cancelled = false;

    async function loadGameForEditing() {
      if (!editingGameId) return;
      setIsLoading(true);
      try {
        const game = await getGameApi(editingGameId);
        const kind = game.type === 'quiz' ? 'quiz' : 'own';

        if (cancelled) return;

        setGameKind(kind);

        if (kind === 'own') {
          const own: OwnGameTemplate = {
            type: 'own',
            name: game.title,
            categories: (game.categories || []).map((cat: any) => ({
              id: cat.id,
              name: cat.name,
              questions: (cat.questions || []).map((q: any) => ({
                value: q.value,
                question: q.question,
                answer: q.answer,
              })),
            })) as OwnGameCategory[],
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
          };
          setInitialData(own);
        } else {
          const allQuestions: QuizQuestion[] = (game.categories || []).flatMap((cat: any) =>
            (cat.questions || []).map((q: any) => ({
              id: q.id,
              question: q.question,
              answer: q.answer,
              points: q.value,
              options: [],
            })),
          );

          const quiz: QuizTemplate = {
            type: 'quiz',
            name: game.title,
            questions: allQuestions,
            timePerQuestion: game.settings?.timePerQuestion ?? 30,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
          };
          setInitialData(quiz);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadGameForEditing();
    return () => {
      cancelled = true;
    };
  }, [editingGameId]);

  const toBackendCreateDto = (gameData: GameTemplate) => {
    if (gameData.type === 'own') {
      return {
        title: gameData.name,
        description: undefined,
        type: 'own' as const,
        categories: gameData.categories.map((cat) => ({
          name: cat.name,
          questions: cat.questions.map((q) => ({
            question: q.question,
            answer: q.answer,
            value: q.value,
          })),
        })),
      };
    }

    return {
      title: gameData.name,
      description: undefined,
      type: 'quiz' as const,
      categories: [
        {
          name: 'Вопросы',
          questions: gameData.questions.map((q) => ({
            question: q.question,
            answer: q.answer,
            value: q.points,
          })),
        },
      ],
      settings: {
        timePerQuestion: gameData.timePerQuestion ?? 30,
      },
    };
  };

  const handleSave = async (gameData: GameTemplate) => {
    const dto = toBackendCreateDto(gameData) as any;
    try {
      if (editingGameId) {
        await updateGameApi(editingGameId, dto);
      } else {
        await createGameApi(dto);
      }
      navigate('/my-games');
    } catch (e) {
      // Для простоты пока показываем alert (можно заменить на toast/ошибки из формы)
      console.error(e);
      alert('Не удалось сохранить игру');
    }
  };

  const handleCancel = () => {
    navigate('/my-games');
  };

  const renderBuilder = () => {
    if (isTemplateMode) {
      if (templateId === 'custom') {
        return <OwnGameBuilder initialData={initialData as OwnGameTemplate | undefined} onSave={handleSave} onCancel={handleCancel} />;
      }
      return <QuizGameBuilder initialData={initialData as QuizTemplate | undefined} onSave={handleSave} onCancel={handleCancel} />;
    }

    if (isLoading) {
      return <div className="loading-container">Загрузка игры...</div>;
    }

    if (gameKind === 'own') {
      return (
        <OwnGameBuilder
          initialData={initialData as OwnGameTemplate | undefined}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      );
    }

    return (
      <QuizGameBuilder
        initialData={initialData as QuizTemplate | undefined}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  };

  return (
    <BuilderLayout>
      {renderBuilder()}
    </BuilderLayout>
  );
};