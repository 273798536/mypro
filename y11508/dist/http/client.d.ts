import { AxiosRequestConfig } from 'axios';
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
export declare class HttpClient {
    private client;
    private baseURL;
    constructor(baseURL?: string);
    setAuthToken(token: string): void;
    setUserContext(username: string): void;
    request<T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>>;
    get<T = any>(url: string, params?: any): Promise<ApiResponse<T>>;
    post<T = any>(url: string, data?: any): Promise<ApiResponse<T>>;
    put<T = any>(url: string, data?: any): Promise<ApiResponse<T>>;
    delete<T = any>(url: string): Promise<ApiResponse<T>>;
    getDevices(): Promise<ApiResponse<any>>;
    getDevice(deviceCode: string): Promise<ApiResponse<any>>;
    createDevice(data: any): Promise<ApiResponse<any>>;
    updateDeviceStatus(deviceCode: string, status: string, reason: string): Promise<ApiResponse<any>>;
    getInspections(params?: any): Promise<ApiResponse<any>>;
    createInspection(data: any): Promise<ApiResponse<any>>;
    updateInspectionStatus(id: string, status: string, reason: string): Promise<ApiResponse<any>>;
    getCertificates(params?: any): Promise<ApiResponse<any>>;
    createCertificate(data: any): Promise<ApiResponse<any>>;
    getQuotes(params?: any): Promise<ApiResponse<any>>;
    createQuote(data: any): Promise<ApiResponse<any>>;
    getConfirms(params?: any): Promise<ApiResponse<any>>;
    createConfirm(data: any): Promise<ApiResponse<any>>;
    getDashboard(): Promise<ApiResponse<any>>;
    getReconciliation(): Promise<ApiResponse<any>>;
    runStatusCheck(): Promise<ApiResponse<any>>;
    importData(source: string, filePath: string): Promise<ApiResponse<any>>;
    getImportFailures(): Promise<ApiResponse<any>>;
    exportReport(reportType: string): Promise<ApiResponse<any>>;
    getStatusLogs(entityType?: string, entityId?: string): Promise<ApiResponse<any>>;
    createReplaySession(name: string): Promise<ApiResponse<any>>;
    getReplaySessions(): Promise<ApiResponse<any>>;
    executeReplaySession(sessionId: string): Promise<ApiResponse<any>>;
}
