import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BuilderLayout } from './components/BuilderLayout';
import { OwnGameBuilder } from './components/OwnGameBuilder';
import { QuizGameBuilder } from './components/QuizGameBuilder';
import { CrocodileGameBuilder } from './components/CrocodileGameBuilder';
import { WheelGameBuilder } from './components/WheelGameBuilder';
import type {
  GameTemplate,
  OwnGameTemplate,
  QuizTemplate,
  QuizQuestion,
  OwnGameCategory,
  CrocodileTemplate,
  WheelTemplate,
} from '../../features/templates/types/template.types';
import './TemplateBuilderPage.css';
import { createGameApi, getGameApi, updateGameApi } from '../../features/games/api/gamesApi';

export const TemplateBuilderPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const isTemplateMode = useMemo(
    () =>
      templateId === 'custom' ||
      templateId === 'quiz' ||
      templateId === 'crocodile' ||
      templateId === 'wheel',
    [templateId],
  );
  const editingGameId = useMemo(() => (isTemplateMode ? null : templateId || null), [isTemplateMode, templateId]);

  const [isLoading, setIsLoading] = useState(false);
  const [initialData, setInitialData] = useState<GameTemplate | undefined>(undefined);
  const [gameKind, setGameKind] = useState<'own' | 'quiz' | 'crocodile' | 'wheel'>(() => {
    if (templateId === 'custom') return 'own';
    if (templateId === 'crocodile') return 'crocodile';
    if (templateId === 'wheel') return 'wheel';
    return 'quiz';
  });

  useEffect(() => {
    let cancelled = false;

    async function loadGameForEditing() {
      if (!editingGameId) return;
      setIsLoading(true);
      try {
        const game = await getGameApi(editingGameId);
        const kind =
          game.type === 'quiz'
            ? 'quiz'
            : game.type === 'crocodile'
              ? 'crocodile'
              : game.type === 'wheel'
                ? 'wheel'
                : 'own';

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
        } else if (kind === 'quiz') {
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
        } else if (kind === 'crocodile') {
          const crocodile: CrocodileTemplate = {
            type: 'crocodile',
            name: game.title,
            terms: (game.categories?.[0]?.questions || []).map((q: any) => ({
              id: q.id,
              term: q.question,
              isGuessed: false
            })),
            timePerTerm: game.settings?.timePerTerm ?? 30,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
          };
          setInitialData(crocodile);
        } else if (kind === 'wheel') {
          const wheel: WheelTemplate = {
            type: 'wheel',
            name: game.title,
            categories: (game.categories || []).map((cat: any) => ({
              id: cat.id,
              name: cat.name,
              questions: (cat.questions || []).map((q: any) => ({
                id: q.id,
                question: q.question,
                answer: q.answer,
              })),
            })),
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
          };
          setInitialData(wheel);
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

    if (gameData.type === 'crocodile') {
      return {
        title: gameData.name,
        description: undefined,
        type: 'crocodile' as const,
        categories: [
          {
            name: 'Термины',
            questions: (gameData as CrocodileTemplate).terms.map((t) => ({
              question: t.term,
              answer: '',
              value: 1
            })),
          },
        ],
        settings: {
          timePerTerm: (gameData as CrocodileTemplate).timePerTerm,
        },
      };
    }

    if (gameData.type === 'wheel') {
      return {
        title: gameData.name,
        description: undefined,
        type: 'wheel' as const,
        categories: gameData.categories.map((category) => ({
          name: category.name,
          questions: category.questions.map((question) => ({
            question: question.question,
            answer: question.answer,
            value: 1,
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
      if (templateId === 'crocodile') {
        return <CrocodileGameBuilder initialData={initialData as CrocodileTemplate | undefined} onSave={handleSave} onCancel={handleCancel} />;
      }
      if (templateId === 'wheel') {
        return <WheelGameBuilder initialData={initialData as WheelTemplate | undefined} onSave={handleSave} onCancel={handleCancel} />;
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

    if (gameKind === 'crocodile') {
      return (
        <CrocodileGameBuilder
          initialData={initialData as CrocodileTemplate | undefined}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      );
    }

    if (gameKind === 'wheel') {
      return (
        <WheelGameBuilder
          initialData={initialData as WheelTemplate | undefined}
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