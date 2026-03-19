import { axiosInstance } from '../../../shared/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export async function loginApi(payload: { email: string; password: string }) {
  const res = await axiosInstance.post<ApiEnvelope<AuthResponse>>('/auth/login', payload);
  return res.data.data;
}

export async function registerApi(payload: { email: string; password: string; name: string }) {
  const res = await axiosInstance.post<ApiEnvelope<AuthResponse>>('/auth/register', payload);
  return res.data.data;
}

export async function getProfileApi() {
  const res = await axiosInstance.get<ApiEnvelope<AuthUser>>('/users/profile');
  return res.data.data;
}

