import type { AxiosResponse } from 'axios';
import { axiosInstance } from '../../../shared/api';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};

export type AdminReportStatus = 'pending' | 'approved' | 'rejected';

export interface AdminReport {
  id: string;
  reason: string;
  status: AdminReportStatus;
  gameId: string;
  createdAt: string;
  decisionComment?: string | null;
  game?: {
    id: string;
    title: string;
    authorId: string;
  };
  reporter?: {
    id: string;
    name: string;
    email: string;
  };
}

export async function setAdminRoleApi(payload: { userId: string; isAdmin: boolean }) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.patch(
    '/admin/users/role',
    payload,
  );
  return res.data.data;
}

export async function blockUserApi(payload: {
  userId: string;
  isBlocked: boolean;
  reason?: string;
}) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.patch(
    '/admin/users/block',
    payload,
  );
  return res.data.data;
}

export async function blockGameApi(payload: {
  gameId: string;
  isBlocked: boolean;
  reason?: string;
}) {
  const res: AxiosResponse<ApiEnvelope<any>> = await axiosInstance.patch(
    '/admin/games/block',
    payload,
  );
  return res.data.data;
}

export async function getReportsApi(status?: AdminReportStatus) {
  const res: AxiosResponse<ApiEnvelope<AdminReport[]>> = await axiosInstance.get('/admin/reports', {
    params: status ? { status } : undefined,
  });
  return res.data.data;
}

export async function approveReportApi(
  reportId: string,
  payload?: { comment?: string; gameBlockReason?: string },
) {
  const res: AxiosResponse<ApiEnvelope<AdminReport>> = await axiosInstance.patch(
    `/admin/reports/${reportId}/approve`,
    payload ?? {},
  );
  return res.data.data;
}

export async function rejectReportApi(reportId: string, payload?: { comment?: string }) {
  const res: AxiosResponse<ApiEnvelope<AdminReport>> = await axiosInstance.patch(
    `/admin/reports/${reportId}/reject`,
    payload ?? {},
  );
  return res.data.data;
}
