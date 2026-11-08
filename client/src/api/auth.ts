import apiClient from './client';
import type { LoginRequest, RegisterRequest, ApiResponse } from '@shared/index';

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: string;
  hasCharacter: boolean;
}

export async function login(data: LoginRequest): Promise<ApiResponse<UserInfo>> {
  const res = await apiClient.post('/auth/login', data);
  return res.data;
}

export async function register(data: RegisterRequest): Promise<ApiResponse<UserInfo>> {
  const res = await apiClient.post('/auth/register', data);
  return res.data;
}

export async function logout(): Promise<ApiResponse> {
  const res = await apiClient.post('/auth/logout');
  return res.data;
}

export async function getMe(): Promise<ApiResponse<UserInfo>> {
  const res = await apiClient.get('/auth/me');
  return res.data;
}
