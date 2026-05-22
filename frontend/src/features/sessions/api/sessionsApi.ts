import type { AxiosResponse } from 'axios';
import { axiosInstance } from '../../../shared/api';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};

export type SessionStatus = 'waiting' | 'active' | 'paused' | 'finished';

export type CreateSessionDto = {
  gameId: string;
  settings?: Partial<{
    maxTeams: number;
    maxPlayersPerTeam: number;
    timePerQuestion: number;
    timePerTerm: number;
    allowNegativeScores: boolean;
  }>;
};

export type JoinSessionDto = {
  inviteCode: string;
  playerName: string;
  teamName?: string;
};

export type UpdateScoreDto = {
  teamId: string;
  points: number;
};

export async function createSessionApi(dto: CreateSessionDto) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post('/sessions', dto);
  return res.data.data;
}

export async function getMySessionsApi() {
  const res: AxiosResponse<ApiEnvelope<any[]>> = await axiosInstance.get('/sessions');
  return res.data.data;
}

export async function getSessionApi(id: string) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.get(`/sessions/${id}`);
  return res.data.data;
}

export async function startSessionApi(id: string) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(`/sessions/${id}/start`);
  return res.data.data;
}

export async function answerQuestionApi(sessionId: string, categoryId: string, questionId: string) {
  return answerQuestionWithBodyApi(sessionId, categoryId, questionId);
}

export async function answerQuestionWithBodyApi(
  sessionId: string,
  categoryId: string,
  questionId: string,
  payload?: { answer?: string },
) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(
    `/sessions/${sessionId}/answer/${categoryId}/${questionId}`,
    payload ?? {},
  );
  return res.data.data;
}

export async function updateScoreApi(sessionId: string, dto: UpdateScoreDto) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(`/sessions/${sessionId}/score`, dto);
  return res.data.data;
}

export async function finishSessionApi(sessionId: string) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(`/sessions/${sessionId}/finish`);
  return res.data.data;
}

export async function markCrocodileGuessedApi(sessionId: string, payload?: { termId?: string }) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(
    `/sessions/${sessionId}/crocodile/guess`,
    payload ?? {},
  );
  return res.data.data;
}

export async function markCrocodileMissedApi(sessionId: string, payload?: { termId?: string }) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(
    `/sessions/${sessionId}/crocodile/miss`,
    payload ?? {},
  );
  return res.data.data;
}

export async function revealQuizQuestionApi(
  sessionId: string,
  categoryId: string,
  questionId: string,
) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(
    `/sessions/${sessionId}/quiz/reveal/${categoryId}/${questionId}`,
  );
  return res.data.data;
}

export async function joinSessionApi(dto: JoinSessionDto) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post('/sessions/join', dto);
  return res.data.data;
}

export async function addTeamApi(sessionId: string, dto: { name?: string }) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(`/sessions/${sessionId}/teams`, dto);
  return res.data.data;
}

export async function updateTeamApi(sessionId: string, teamId: string, dto: { name: string }) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(
    `/sessions/${sessionId}/teams/${teamId}/rename`,
    dto,
  );
  return res.data.data;
}

export async function deleteSessionApi(sessionId: string) {
  await axiosInstance.delete(`/sessions/${sessionId}`);
}

export type TicTacToeSymbol = 'cross' | 'circle' | 'heart' | 'star';

export async function setupTicTacToeApi(
  sessionId: string,
  payload: {
    team1Name: string;
    team2Name: string;
    team1Symbol: TicTacToeSymbol;
    team2Symbol: TicTacToeSymbol;
  },
) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(
    `/sessions/${sessionId}/tictactoe/setup`,
    payload,
  );
  return res.data.data;
}

export async function openTicTacToeCellApi(sessionId: string, cellIndex: number) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(
    `/sessions/${sessionId}/tictactoe/open-cell`,
    { cellIndex },
  );
  return res.data.data;
}

export async function answerTicTacToeApi(sessionId: string, correct: boolean) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post(
    `/sessions/${sessionId}/tictactoe/answer`,
    { correct },
  );
  return res.data.data;
}

