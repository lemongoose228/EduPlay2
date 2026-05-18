import type { AxiosResponse } from 'axios';
import { axiosInstance } from '../../../shared/api';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};

export type GameType = 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station' | 'tictactoe';
export type GameStatus = 'draft' | 'published' | 'archived';

export type CreateGameDto = {
  title: string;
  description?: string;
  type: GameType;
  categories: Array<{
    name: string;
    questions: Array<{
      question: string;
      answer: string;
      value: number;
      imageUrl?: string;
    }>;
  }>;
  settings?: {
    timePerQuestion?: number;
    timePerTerm?: number;
    allowNegativeScores?: boolean;
  };
  ageFrom?: number | null;
  ageTo?: number | null;
};

export type UpdateGameDto = Partial<CreateGameDto> & {
  status?: GameStatus;
};

export type PublishGameDto = {
  title?: string;
  description?: string;
};

export async function createGameApi(dto: CreateGameDto) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post('/games', dto);
  return res.data.data;
}

export async function getMyGamesApi(params?: {
  search?: string;
  type?: GameType;
  sortBy?: 'likes' | 'newest';
  ageFrom?: number;
  ageTo?: number;
  status?: GameStatus;
}) {
  const res: AxiosResponse<ApiEnvelope<any[]>> = await axiosInstance.get('/games', { params });
  return res.data.data;
}

export async function getGameApi(id: string) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.get(`/games/${id}`);
  return res.data.data;
}

export async function updateGameApi(id: string, dto: UpdateGameDto) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.put(`/games/${id}`, dto);
  return res.data.data;
}

export async function publishGameApi(id: string, dto: PublishGameDto) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(`/games/${id}/publish`, dto);
  return res.data.data;
}

export async function unpublishGameApi(id: string) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(`/games/${id}/unpublish`);
  return res.data.data;
}

export async function deleteGameApi(id: string) {
  await axiosInstance.delete(`/games/${id}`);
}

export async function likeGameApi(gameId: string) {
  const res: AxiosResponse<ApiEnvelope<{ likes: number }>> = await axiosInstance.post(
    `/games/${gameId}/like`,
  );
  return res.data.data;
}

export async function unlikeGameApi(gameId: string) {
  const res: AxiosResponse<ApiEnvelope<{ likes: number }>> = await axiosInstance.delete(
    `/games/${gameId}/like`,
  );
  return res.data.data;
}

export async function getLikedGameIdsApi(): Promise<string[]> {
  const res: AxiosResponse<ApiEnvelope<string[]>> = await axiosInstance.get('/games/liked/ids');
  return res.data.data ?? [];
}

export async function uploadQuestionImageApi(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res: AxiosResponse<ApiEnvelope<{ url: string }>> = await axiosInstance.post(
    '/games/question-image',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return res.data.data;
}

