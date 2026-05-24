"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const axios_1 = __importDefault(require("axios"));
class HttpClient {
    constructor(baseURL = 'http://localhost:3000/api') {
        this.baseURL = baseURL;
        this.client = axios_1.default.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    setAuthToken(token) {
        this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setUserContext(username) {
        this.client.defaults.headers.common['X-User'] = username;
    }
    async request(config) {
        try {
            const response = await this.client.request(config);
            return response.data;
        }
        catch (error) {
            if (error.response) {
                return {
                    success: false,
                    error: error.response.data?.error || error.response.statusText,
                    message: error.response.data?.message
                };
            }
            return {
                success: false,
                error: error.message
            };
        }
    }
    async get(url, params) {
        return this.request({ method: 'GET', url, params });
    }
    async post(url, data) {
        return this.request({ method: 'POST', url, data });
    }
    async put(url, data) {
        return this.request({ method: 'PUT', url, data });
    }
    async delete(url) {
        return this.request({ method: 'DELETE', url });
    }
    async getDevices() {
        return this.get('/devices');
    }
    async getDevice(deviceCode) {
        return this.get(`/devices/${deviceCode}`);
    }
    async createDevice(data) {
        return this.post('/devices', data);
    }
    async updateDeviceStatus(deviceCode, status, reason) {
        return this.put(`/devices/${deviceCode}/status`, { status, reason });
    }
    async getInspections(params) {
        return this.get('/inspections', params);
    }
    async createInspection(data) {
        return this.post('/inspections', data);
    }
    async updateInspectionStatus(id, status, reason) {
        return this.put(`/inspections/${id}/status`, { status, reason });
    }
    async getCertificates(params) {
        return this.get('/certificates', params);
    }
    async createCertificate(data) {
        return this.post('/certificates', data);
    }
    async getQuotes(params) {
        return this.get('/quotes', params);
    }
    async createQuote(data) {
        return this.post('/quotes', data);
    }
    async getConfirms(params) {
        return this.get('/confirms', params);
    }
    async createConfirm(data) {
        return this.post('/confirms', data);
    }
    async getDashboard() {
        return this.get('/dashboard');
    }
    async getReconciliation() {
        return this.get('/reconciliation');
    }
    async runStatusCheck() {
        return this.post('/status-check');
    }
    async importData(source, filePath) {
        return this.post('/import', { source, filePath });
    }
    async getImportFailures() {
        return this.get('/import-failures');
    }
    async exportReport(reportType) {
        return this.get(`/export/${reportType}`);
    }
    async getStatusLogs(entityType, entityId) {
        const params = {};
        if (entityType)
            params.entityType = entityType;
        if (entityId)
            params.entityId = entityId;
        return this.get('/status-logs', params);
    }
    async createReplaySession(name) {
        return this.post('/replay/sessions', { name });
    }
    async getReplaySessions() {
        return this.get('/replay/sessions');
    }
    async executeReplaySession(sessionId) {
        return this.post(`/replay/sessions/${sessionId}/execute`);
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=client.js.map