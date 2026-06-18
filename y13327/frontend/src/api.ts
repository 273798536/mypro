import axios from 'axios';

export const operatorName = '评测-小孟';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'X-Operator': operatorName
  }
});

api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.message || err.message || '请求失败';
    console.error('[API Error]', msg);
    return Promise.reject(new Error(msg));
  }
);

export default api;

// ---------- System ----------
export const getHealth = () => api.get<any, any>('/system/health');
export const getStats = () => api.get<any, any>('/system/stats');

// ---------- Tickets ----------
interface ListQuery {
  status?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}
export const getTickets = (params: ListQuery = {}) =>
  api.get<any, any>('/tickets', { params });
export const getTicket = (id: number) =>
  api.get<any, any>(`/tickets/${id}`);
export const createTicket = (data: any) =>
  api.post<any, any>('/tickets', data);
export const updateTicket = (id: number, data: any) =>
  api.put<any, any>(`/tickets/${id}`, data);
export const getTicketReviews = (id: number) =>
  api.get<any, any>(`/tickets/${id}/reviews`);
export const getTicketHistory = (id: number) =>
  api.get<any, any>(`/tickets/${id}/history`);
export const createReview = (id: number, data: any) =>
  api.post<any, any>(`/tickets/${id}/review`, data);

// ---------- Missing Citations ----------
export const detectMissingCitation = (ticketId: number, expectedFields: string[] = []) =>
  api.post<any, any>(`/missing-citations/detect/${ticketId}`, { expectedFields });
export const getMissingCitation = (ticketId: number) =>
  api.get<any, any>(`/missing-citations/ticket/${ticketId}`);
export const createMissingCitation = (ticketId: number, data: any) =>
  api.post<any, any>(`/missing-citations/ticket/${ticketId}`, data);
export const confirmMissingCitation = (id: number) =>
  api.put<any, any>(`/missing-citations/${id}/confirm`, {});
export const listMissingCitations = () =>
  api.get<any, any>('/missing-citations');

// ---------- Gray Results ----------
export const getGrayResults = () =>
  api.get<any, any>('/gray-results');
export const getGrayResult = (batch: string) =>
  api.get<any, any>(`/gray-results/${batch}`);
export const createGrayResult = (data: any) =>
  api.post<any, any>('/gray-results', data);

// ---------- Screenshots ----------
export const getScreenshots = (ticketId: number) =>
  api.get<any, any>(`/screenshots/ticket/${ticketId}`);
export const uploadScreenshots = (ticketId: number, files: File[], descriptions: string[], isLegacy = false) => {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  form.append('descriptions', JSON.stringify(descriptions));
  form.append('is_legacy', isLegacy ? '1' : '0');
  return api.post<any, any>(`/screenshots/ticket/${ticketId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const getScreenshotFileUrl = (id: number) =>
  `/api/screenshots/${id}/file`;
export const deleteScreenshot = (id: number) =>
  api.delete<any, any>(`/screenshots/${id}`);

// ---------- Export ----------
export const getExportUrl = (ticketId: number) =>
  `/api/export/ticket/${ticketId}`;
