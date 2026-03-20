import type { AxiosResponse } from 'axios';
import { axiosInstance } from '../../../shared/api';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};

export type SearchGamesDto = {
  search?: string;
  type?: 'own' | 'quiz';
  sortBy?: 'popular' | 'likes' | 'newest';
  page?: number;
  limit?: number;
};

export async function searchLibraryApi(dto: SearchGamesDto) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.get('/library/search', { params: dto });
  return res.data.data;
}

export async function getPopularApi() {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.get('/library/popular');
  return res.data.data ?? res.data;
}

export async function getTopRatedApi() {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.get('/library/top-rated');
  return res.data.data ?? res.data;
}

export async function getRecentApi() {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.get('/library/recent');
  return res.data.data ?? res.data;
}

