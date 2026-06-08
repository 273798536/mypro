import axios from 'axios';
import type {
  ModelRecord,
  ModelRecordSummary,
  HistoryRecord,
  UpdateRecordRequest
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const recordApi = {
  getAll: (): Promise<ModelRecordSummary[]> =>
    api.get('/records').then(r => r.data),

  getById: (id: string): Promise<ModelRecord> =>
    api.get(`/records/${id}`).then(r => r.data),

  update: (id: string, data: UpdateRecordRequest): Promise<ModelRecord> =>
    api.put(`/records/${id}`, data).then(r => r.data),

  getHistory: (id: string): Promise<HistoryRecord[]> =>
    api.get(`/records/${id}/history`).then(r => r.data),

  addHistory: (id: string, data: Omit<HistoryRecord, 'id' | 'recordId' | 'modifiedAt'>): Promise<HistoryRecord> =>
    api.post(`/records/${id}/history`, data).then(r => r.data),

  download: (id: string): Promise<void> => {
    return api
      .get(`/records/${id}/download`, { responseType: 'blob' })
      .then(response => {
        const disposition = response.headers['content-disposition'];
        let filename = `tunnel-segment-${id}.txt`;
        if (disposition) {
          const match = disposition.match(/filename="(.+)"/);
          if (match) filename = match[1];
        }
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      });
  }
};

export default api;
