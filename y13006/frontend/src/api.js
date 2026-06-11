import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
});

export const getRecords = (status = '') => {
  return api.get('/records', { params: { status } }).then(res => res.data);
};

export const getRecord = (id) => {
  return api.get(`/records/${id}`).then(res => res.data);
};

export const addRemark = (id, data) => {
  return api.post(`/records/${id}/remarks`, data).then(res => res.data);
};

export const getRemarks = (id) => {
  return api.get(`/records/${id}/remarks`).then(res => res.data);
};

export const supplementRecord = (id, data) => {
  return api.post(`/records/${id}/supplement`, data).then(res => res.data);
};

export const getEmails = () => {
  return api.get('/emails').then(res => res.data);
};

export const getImportPackages = () => {
  return api.get('/import/packages').then(res => res.data);
};

export const importEmail = (emailIndex, importedBy = '项目经理-李明') => {
  return api.post('/import/email', { email_index: emailIndex, imported_by: importedBy }).then(res => res.data);
};

export const getImportLogs = (batchNo = '') => {
  return api.get('/import-logs', { params: { batch_no: batchNo } }).then(res => res.data);
};

export const exportRecords = () => {
  return api.get('/export/records').then(res => res.data);
};

export const syncExport = () => {
  return api.post('/export/sync').then(res => res.data);
};

export const resetDatabase = () => {
  return api.post('/database/reset').then(res => res.data);
};

export default api;
