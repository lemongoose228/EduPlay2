import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BuilderLayout } from './components/BuilderLayout';
import { OwnGameBuilder } from './components/OwnGameBuilder';
import { QuizGameBuilder } from './components/QuizGameBuilder';
import { CrocodileGameBuilder } from './components/CrocodileGameBuilder';
import { WheelGameBuilder } from './components/WheelGameBuilder';
import { StationGameBuilder } from './components/StationGameBuilder';
import { TicTacToeGameBuilder } from './components/TicTacToeGameBuilder';
import type {
  GameTemplate,
  OwnGameTemplate,
  QuizTemplate,
  QuizQuestion,
  OwnGameCategory,
  CrocodileTemplate,
  StationNodeTemplate,
  StationTemplate,
  WheelTemplate,
  TicTacToeTemplate,
  TicTacToeQuestion,
} from '../../features/templates/types/template.types';
import './TemplateBuilderPage.css';
import { createGameApi, getGameApi, updateGameApi } from '../../features/games/api/gamesApi';
import { useDialogs } from '../../shared/ui/DialogProvider';
import { GAME_AGE_CODE_MAX, GAME_AGE_CODE_MIN } from '../../shared/lib/gameAgeConstants';
import { GameAgeCategoryCard } from './components/GameAgeCategoryCard';

const STATION_META_PREFIX = '__station_meta__:';

const encodeStationAnswer = (payload: { name: string; shape: string; color: string; imageUrl?: string }) =>
  `${STATION_META_PREFIX}${JSON.stringify(payload)}`;

const decodeStationAnswer = (raw: string | null | undefined) => {
  const source = raw ?? '';
  if (!source.startsWith(STATION_META_PREFIX)) {
    return {
      name: source || 'Станция',
      shape: 'circle' as const,
      color: '#6b8cff',
    };
  }

  try {
    const parsed = JSON.parse(source.slice(STATION_META_PREFIX.length)) as {
      name?: string;
      shape?: 'circle' | 'star' | 'heart' | 'triangle' | 'square';
      color?: string;
      imageUrl?: string;
    };
    return {
      name: parsed.name?.trim() || 'Станция',
      shape: parsed.shape ?? 'circle',
      color: parsed.color ?? '#6b8cff',
      imageUrl: parsed.imageUrl?.trim() || '',
    };
  } catch {
    return {
      name: 'Станция',
      shape: 'circle' as const,
      color: '#6b8cff',
      imageUrl: '',
    };
  }
};

export const TemplateBuilderPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { showAlert } = useDialogs();

  const isTemplateMode = useMemo(
    () =>
      templateId === 'custom' ||
      templateId === 'quiz' ||
      templateId === 'crocodile' ||
      templateId === 'wheel' ||
      templateId === 'station' ||
      templateId === 'tictactoe',
    [templateId],
  );
  const editingGameId = useMemo(() => (isTemplateMode ? null : templateId || null), [isTemplateMode, templateId]);

  const [isLoading, setIsLoading] = useState(false);
  const [initialData, setInitialData] = useState<GameTemplate | undefined>(undefined);
  const [anyAgeAudience, setAnyAgeAudience] = useState(true);
  const [metaAgeMin, setMetaAgeMin] = useState(3);
  const [metaAgeMax, setMetaAgeMax] = useState(25);
  const [gameKind, setGameKind] = useState<'own' | 'quiz' | 'crocodile' | 'wheel' | 'station' | 'tictactoe'>(() => {
    if (templateId === 'custom') return 'own';
    if (templateId === 'crocodile') return 'crocodile';
    if (templateId === 'wheel') return 'wheel';
    if (templateId === 'station') return 'station';
    if (templateId === 'tictactoe') return 'tictactoe';
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
                : game.type === 'station'
                  ? 'station'
                  : game.type === 'tictactoe'
                    ? 'tictactoe'
                : 'own';

        if (cancelled) return;

        setGameKind(kind);

        if (game.ageFrom != null && game.ageTo != null) {
          setAnyAgeAudience(false);
          setMetaAgeMin(
            Math.min(GAME_AGE_CODE_MAX, Math.max(GAME_AGE_CODE_MIN, Number(game.ageFrom))),
          );
          setMetaAgeMax(
            Math.min(GAME_AGE_CODE_MAX, Math.max(GAME_AGE_CODE_MIN, Number(game.ageTo))),
          );
        } else {
          setAnyAgeAudience(true);
          setMetaAgeMin(3);
          setMetaAgeMax(25);
        }

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
              imageUrl: q.imageUrl || '',
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
                imageUrl: q.imageUrl || '',
              })),
            })),
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
          };
          setInitialData(wheel);
        } else if (kind === 'station') {
          const stationNodes: StationNodeTemplate[] = (game.categories?.[0]?.questions || []).map((q: any) => ({
            ...decodeStationAnswer(q.answer),
            id: q.id,
            task: q.question,
          }));
          const station: StationTemplate = {
            type: 'station',
            name: game.title,
            layout: 'line',
            stations: stationNodes,
            connections: stationNodes.slice(0, -1).map((node, idx) => ({
              from: node.id,
              to: stationNodes[idx + 1].id,
            })),
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
          };
          setInitialData(station);
        } else if (kind === 'tictactoe') {
          const allQuestions: TicTacToeQuestion[] = (game.categories || []).flatMap((cat: any) =>
            (cat.questions || []).map((q: any) => ({
              id: q.id,
              question: q.question,
            })),
          );
          const tictactoe: TicTacToeTemplate = {
            type: 'tictactoe',
            name: game.title,
            questions: allQuestions,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
          };
          setInitialData(tictactoe);
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

  useEffect(() => {
    if (isTemplateMode) {
      setAnyAgeAudience(true);
      setMetaAgeMin(3);
      setMetaAgeMax(25);
    }
  }, [isTemplateMode, templateId]);

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
            imageUrl: question.imageUrl,
            value: 1,
          })),
        })),
      };
    }

    if (gameData.type === 'tictactoe') {
      return {
        title: gameData.name,
        description: undefined,
        type: 'tictactoe' as const,
        categories: [
          {
            name: 'Вопросы',
            questions: (gameData as TicTacToeTemplate).questions.map((q) => ({
              question: q.question,
              answer: '',
              value: 1,
            })),
          },
        ],
      };
    }

    if (gameData.type === 'station') {
      return {
        title: gameData.name,
        description: undefined,
        type: 'station' as const,
        categories: [
          {
            name: 'line',
            questions: gameData.stations.map((station) => ({
              question: station.task,
              answer: encodeStationAnswer({
                name: station.name,
                shape: station.shape,
                color: station.color,
                imageUrl: station.imageUrl,
              }),
              imageUrl: station.imageUrl,
              value: 1,
            })),
          },
        ],
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
            imageUrl: q.imageUrl,
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
    if (anyAgeAudience) {
      dto.ageFrom = null;
      dto.ageTo = null;
    } else {
      dto.ageFrom = metaAgeMin;
      dto.ageTo = metaAgeMax;
    }
    try {
      if (editingGameId) {
        await updateGameApi(editingGameId, dto);
      } else {
        await createGameApi(dto);
      }
      navigate('/my-games');
    } catch (e) {
      console.error(e);
      await showAlert('Не удалось сохранить игру');
    }
  };

  const handleCancel = () => {
    navigate('/my-games');
  };

  const ageCategorySection = (
    <GameAgeCategoryCard
      anyAgeAudience={anyAgeAudience}
      ageMin={metaAgeMin}
      ageMax={metaAgeMax}
      onAnyAgeChange={setAnyAgeAudience}
      onRangeChange={(a, b) => {
        setMetaAgeMin(a);
        setMetaAgeMax(b);
      }}
    />
  );

  const renderBuilder = () => {
    if (isTemplateMode) {
      if (templateId === 'custom') {
        return <OwnGameBuilder initialData={initialData as OwnGameTemplate | undefined} onSave={handleSave} onCancel={handleCancel} afterMainInfo={ageCategorySection} />;
      }
      if (templateId === 'crocodile') {
        return <CrocodileGameBuilder initialData={initialData as CrocodileTemplate | undefined} onSave={handleSave} onCancel={handleCancel} afterMainInfo={ageCategorySection} />;
      }
      if (templateId === 'wheel') {
        return <WheelGameBuilder initialData={initialData as WheelTemplate | undefined} onSave={handleSave} onCancel={handleCancel} afterMainInfo={ageCategorySection} />;
      }
      if (templateId === 'station') {
        return <StationGameBuilder initialData={initialData as StationTemplate | undefined} onSave={handleSave} onCancel={handleCancel} afterMainInfo={ageCategorySection} />;
      }
      if (templateId === 'tictactoe') {
        return <TicTacToeGameBuilder initialData={initialData as TicTacToeTemplate | undefined} onSave={handleSave} onCancel={handleCancel} afterMainInfo={ageCategorySection} />;
      }
      return <QuizGameBuilder initialData={initialData as QuizTemplate | undefined} onSave={handleSave} onCancel={handleCancel} afterMainInfo={ageCategorySection} />;
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
          afterMainInfo={ageCategorySection}
        />
      );
    }

    if (gameKind === 'crocodile') {
      return (
        <CrocodileGameBuilder
          initialData={initialData as CrocodileTemplate | undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          afterMainInfo={ageCategorySection}
        />
      );
    }

    if (gameKind === 'wheel') {
      return (
        <WheelGameBuilder
          initialData={initialData as WheelTemplate | undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          afterMainInfo={ageCategorySection}
        />
      );
    }

    if (gameKind === 'station') {
      return (
        <StationGameBuilder
          initialData={initialData as StationTemplate | undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          afterMainInfo={ageCategorySection}
        />
      );
    }

    if (gameKind === 'tictactoe') {
      return (
        <TicTacToeGameBuilder
          initialData={initialData as TicTacToeTemplate | undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          afterMainInfo={ageCategorySection}
        />
      );
    }

    return (
      <QuizGameBuilder
        initialData={initialData as QuizTemplate | undefined}
        onSave={handleSave}
        onCancel={handleCancel}
        afterMainInfo={ageCategorySection}
      />
    );
  };

  return (
    <BuilderLayout>
      {renderBuilder()}
    </BuilderLayout>
  );
};