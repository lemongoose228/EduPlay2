import type { OwnGameTemplate, QuizTemplate } from '../../templates/types/template.types';

export type GameStatus = 'draft' | 'published' | 'archived';

export interface GameMetadata {
  plays: number;
  rating: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
}

export interface Game {
  id: string;
  templateId: string;
  title: string;
  description: string;
  type: 'own' | 'quiz';
  status: GameStatus;
  data: OwnGameTemplate | QuizTemplate;
  metadata: GameMetadata;
}

export interface CreateGameDto {
  templateId: string;
  title: string;
  description: string;
  data: OwnGameTemplate | QuizTemplate;
}

export interface UpdateGameDto extends Partial<CreateGameDto> {
  status?: GameStatus;
}

export const mockGames: Game[] = [
  {
    id: '1',
    templateId: 'custom',
    title: 'История России',
    description: 'Проверьте свои знания истории России от древних времен до современности',
    type: 'own',
    status: 'published',
    data: {
      name: 'История России',
      type: 'own',
      categories: []
    },
    metadata: {
      plays: 1234,
      rating: 4.8,
      likes: 89,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      authorId: 'user1',
      authorName: 'Иван Петров'
    }
  },
  {
    id: '2',
    templateId: 'quiz',
    title: 'География мира',
    description: 'Увлекательная викторина о странах, столицах и географических особенностях',
    type: 'quiz',
    status: 'published',
    data: {
      name: 'География мира',
      type: 'quiz',
      questions: []
    },
    metadata: {
      plays: 892,
      rating: 4.5,
      likes: 56,
      createdAt: '2024-01-20T14:30:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
      authorId: 'user2',
      authorName: 'Анна Смирнова'
    }
  }
];