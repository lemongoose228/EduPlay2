import type { AxiosResponse } from 'axios';
import { axiosInstance } from '../../../shared/api';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};

export async function createReportApi(payload: { gameId: string; reason: string }) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.post('/reports', payload);
  return res.data.data;
}
