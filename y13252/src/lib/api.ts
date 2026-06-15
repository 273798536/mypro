import axios from 'axios';
import type { Complaint, AddPhotoRequest, RerunResponse, SeedResponse } from '../../shared/types.js';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const complaintApi = {
  getAll: () => api.get<Complaint[]>('/complaints').then(res => res.data),
  getById: (id: string) => api.get<Complaint>(`/complaints/${id}`).then(res => res.data),
  addPhoto: (id: string, data: AddPhotoRequest) =>
    api.post(`/complaints/${id}/photos`, data).then(res => res.data),
  rerun: (id: string) =>
    api.post<RerunResponse>(`/complaints/${id}/rerun`).then(res => res.data),
  getReport: (id: string) =>
    api.get<{ report: string; version: number; complaintId: string }>(`/complaints/${id}/report`).then(res => res.data),
  getStatus: () => api.get('/status').then(res => res.data),
  seed: () => api.post<SeedResponse>('/seed').then(res => res.data),
};

export default api;
