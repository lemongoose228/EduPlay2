import type { AxiosResponse } from 'axios';
import { axiosInstance } from '../../../shared/api';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};

export type SearchGamesDto = {
  search?: string;
  type?: 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station';
  sortBy?: 'likes' | 'newest';
  ageFrom?: number;
  ageTo?: number;
  page?: number;
  limit?: number;
};

export interface LibraryAuthorDto {
  id: string;
  publicId?: string;
  name: string;
  avatar?: string | null;
}

export interface LibraryGameDto {
  id: string;
  publicId?: string;
  title: string;
  type: 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station';
  description?: string;
  author?: LibraryAuthorDto;
  likes?: number;
  plays?: number;
  usageCount?: number;
  ageFrom?: number | null;
  ageTo?: number | null;
}

export interface SearchLibraryResponseDto {
  items: LibraryGameDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function searchLibraryApi(dto: SearchGamesDto) {
  const res: AxiosResponse<ApiEnvelope<SearchLibraryResponseDto>> = await axiosInstance.get('/library/search', { params: dto });
  return res.data.data;
}

export async function getPopularApi() {
  const res: AxiosResponse<ApiEnvelope<LibraryGameDto[]>> = await axiosInstance.get('/library/popular');
  return res.data.data ?? res.data;
}

export async function getTopRatedApi() {
  const res: AxiosResponse<ApiEnvelope<LibraryGameDto[]>> = await axiosInstance.get('/library/top-rated');
  return res.data.data ?? res.data;
}

export async function getRecentApi() {
  const res: AxiosResponse<ApiEnvelope<LibraryGameDto[]>> = await axiosInstance.get('/library/recent');
  return res.data.data ?? res.data;
}

