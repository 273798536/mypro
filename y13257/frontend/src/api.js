import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const complaintsAPI = {
  getList: (params = {}) => api.get('/complaints', { params }),
  getDetail: (id) => api.get(`/complaints/${id}`),
  create: (data) => api.post('/complaints', data),
  update: (id, data) => api.put(`/complaints/${id}`, data),
  addNote: (id, data) => api.post(`/complaints/${id}/notes`, data),
  review: (id, data) => api.post(`/complaints/${id}/review`, data),
  rerun: (id, data = {}) => api.post(`/complaints/${id}/rerun`, data)
};

export const locationsAPI = {
  getList: (params = {}) => api.get('/locations', { params }),
  getDetail: (id) => api.get(`/locations/${id}`),
  normalize: (text) => api.get('/locations/normalize', { params: { text } }),
  create: (data) => api.post('/locations', data),
  addAlias: (id, data) => api.post(`/locations/${id}/aliases`, data)
};

export const photosAPI = {
  upload: (formData) => api.post('/photos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateLocation: (id, data) => api.post(`/photos/${id}/update-location`, data),
  delete: (id) => api.delete(`/photos/${id}`)
};

export const exportAPI = {
  getComplaints: (params = {}) => api.get('/export/complaints', { params }),
  getSummary: (params = {}) => api.get('/export/summary', { params })
};

export const usersAPI = {
  getList: () => api.get('/users'),
  getCurrent: () => api.get('/users/current'),
  getDetail: (id) => api.get(`/users/${id}`)
};

export const guideAPI = {
  getGuide: () => api.get('/guide')
};

export default api;
