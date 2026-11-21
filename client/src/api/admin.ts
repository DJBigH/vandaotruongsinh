import apiClient from './client';
import type { ApiResponse, AdminDashboard, AuditLogEntry, PaginatedResponse } from '@shared/index';

export interface GmState { id: string; name: string; godMode: boolean; gold: number; cultivationExp: string }
export async function getGmState(): Promise<ApiResponse<GmState>> {
  const res = await apiClient.get('/admin/cheats'); return res.data;
}
export async function applyGmCheat(command: { godMode?: boolean; gold?: number; cultivationExp?: number }): Promise<ApiResponse<GmState>> {
  const res = await apiClient.post('/admin/cheats', command); return res.data;
}

export interface GmCharacter { id: string; name: string; username: string; isActive: boolean }
export interface GmCatalog {
  realms: Record<string, string>;
  demonicRealms: Record<string, string>;
  items: { id: string; name: string; slot: string | null }[];
  skills: { id: string; name: string; path: string }[];
  mounts: { id: string; name: string; alignment: string }[];
  maps: { id: string; name: string }[];
}
export interface GmCharacterState {
  id: string; name: string; cultivationPath: string; alignment: string; gold: number;
  exp: string; cultivationExp: string; realmIndex: number; realmTier: number; level: number;
  godMode: boolean; currentMapId: string; activeMount: string | null;
  inventory: { id: string; templateId: string; quantity: number; enhanceLevel: number }[];
  skills: { skillId: string; level: number }[]; mountIds: string[];
}
export type GmCommand =
  | { kind: 'godMode'; value: boolean }
  | { kind: 'resources'; gold: number; exp: number; cultivationExp: number }
  | { kind: 'realm'; realmIndex: number; realmTier: number }
  | { kind: 'item'; templateId: string; quantity: number; enhanceLevel: number }
  | { kind: 'skill'; skillId: string; level: number }
  | { kind: 'mount'; mountId: string }
  | { kind: 'teleport'; mapId: string }
  | { kind: 'heal' };
export async function getGmCatalog(): Promise<ApiResponse<GmCatalog>> {
  return (await apiClient.get('/admin/gm/catalog')).data;
}
export async function getGmCharacters(search = ''): Promise<ApiResponse<GmCharacter[]>> {
  return (await apiClient.get('/admin/gm/characters', { params: { search } })).data;
}
export async function getGmCharacterState(characterId: string): Promise<ApiResponse<GmCharacterState>> {
  return (await apiClient.get(`/admin/gm/state/${characterId}`)).data;
}
export async function applyGmCommand(characterId: string, command: GmCommand): Promise<ApiResponse<{ applied: string }>> {
  return (await apiClient.post('/admin/gm/apply', { characterId, command })).data;
}

// === Dashboard ===
export async function getDashboard(): Promise<ApiResponse<AdminDashboard>> {
  const res = await apiClient.get('/admin/dashboard');
  return res.data;
}

// === Player Management ===
export interface AdminPlayerInfo {
  id: string;
  username: string;
  email: string;
  role: string;
  isBanned: boolean;
  lastLogin: string;
  character?: {
    id: string;
    name: string;
    cultivationPath: string;
    realmIndex: number;
    realmTier: number;
    level: number;
    gold: number;
  };
}

export interface AdminPlayerDetail extends AdminPlayerInfo {
  character?: AdminPlayerInfo['character'] & {
    stats: any;
    inventory: any[];
    quests: any[];
    storyFlags: Record<string, string>;
  };
}

export async function getPlayers(page: number, pageSize: number, search?: string): Promise<ApiResponse<PaginatedResponse<AdminPlayerInfo>>> {
  const res = await apiClient.get('/admin/players', { params: { page, pageSize, search } });
  return res.data;
}

export async function getPlayerDetail(playerId: string): Promise<ApiResponse<AdminPlayerDetail>> {
  const res = await apiClient.get(`/admin/players/${playerId}`);
  return res.data;
}

export async function banPlayer(playerId: string, reason: string): Promise<ApiResponse> {
  const res = await apiClient.post(`/admin/players/${playerId}/ban`, { reason });
  return res.data;
}

export async function unbanPlayer(playerId: string): Promise<ApiResponse> {
  const res = await apiClient.post(`/admin/players/${playerId}/unban`);
  return res.data;
}

export async function adjustResources(
  playerId: string,
  adjustments: { gold?: number; exp?: number; cultivationExp?: number },
  reason: string,
): Promise<ApiResponse> {
  const res = await apiClient.post(`/admin/players/${playerId}/adjust`, { adjustments, reason });
  return res.data;
}

// === Content Management ===
export interface ContentItem {
  id: string;
  type: string;
  name: string;
  data: any;
  version: number;
  updatedAt: string;
}

export async function getContent(type: string, page: number, search?: string): Promise<ApiResponse<PaginatedResponse<ContentItem>>> {
  const res = await apiClient.get(`/admin/content/${type}`, { params: { page, search } });
  return res.data;
}

export async function getContentItem(type: string, id: string): Promise<ApiResponse<ContentItem>> {
  const res = await apiClient.get(`/admin/content/${type}/${id}`);
  return res.data;
}

export async function saveContent(type: string, id: string, data: any): Promise<ApiResponse<ContentItem>> {
  const res = await apiClient.put(`/admin/content/${type}/${id}`, data);
  return res.data;
}

export async function createContent(type: string, data: any): Promise<ApiResponse<ContentItem>> {
  const res = await apiClient.post(`/admin/content/${type}`, data);
  return res.data;
}

export async function getContentVersions(type: string, id: string): Promise<ApiResponse<{ version: number; updatedAt: string; admin: string }[]>> {
  const res = await apiClient.get(`/admin/content/${type}/${id}/versions`);
  return res.data;
}

// === Audit Logs ===
export async function getAuditLogs(
  page: number,
  pageSize: number,
  filters?: { admin?: string; action?: string; startDate?: string; endDate?: string },
): Promise<ApiResponse<PaginatedResponse<AuditLogEntry>>> {
  const res = await apiClient.get('/admin/audit-logs', { params: { page, pageSize, ...filters } });
  return res.data;
}
