import axios from "axios";
import {
  Review,
  ViewConfig,
  CadLayer,
  Material,
  Remark
} from "../types";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000
});

export const reviewApi = {
  getList: (page = 1, pageSize = 10) =>
    api.get(`/reviews?page=${page}&pageSize=${pageSize}`),
  
  getDetail: (id: string) =>
    api.get(`/reviews/${id}`),
  
  create: (data: { name: string; description?: string; operatorRemark?: string }) =>
    api.post("/reviews", data),
  
  update: (id: string, data: Partial<Review>) =>
    api.put(`/reviews/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/reviews/${id}`),
  
  addLayer: (reviewId: string, data: Partial<CadLayer>) =>
    api.post(`/reviews/${reviewId}/layers`, data),
  
  addMaterial: (reviewId: string, data: Partial<Material>) =>
    api.post(`/reviews/${reviewId}/materials`, data),
  
  addRemark: (reviewId: string, data: Partial<Remark>) =>
    api.post(`/reviews/${reviewId}/remarks`, data),
  
  runDetection: (reviewId: string) =>
    api.post(`/reviews/${reviewId}/detect`),
  
  confirmCollision: (collisionId: string, data: { isConfirmed: boolean; confirmedBy?: string; impactOnConclusion?: string }) =>
    api.put(`/collisions/${collisionId}/confirm`, data),
  
  addViewConfig: (reviewId: string, data: Partial<ViewConfig>) =>
    api.post(`/reviews/${reviewId}/views`, data),
  
  getViewConfigs: (reviewId: string) =>
    api.get(`/reviews/${reviewId}/views`),
  
  export: (reviewId: string, data: { format: "pdf" | "excel" | "csv"; includeHistory?: boolean; includeCollisions?: boolean; includeScreenshots?: boolean }) =>
    api.post(`/reviews/${reviewId}/export`, data, { responseType: "blob" }),
  
  getHistories: (reviewId: string) =>
    api.get(`/reviews/${reviewId}/histories`),
  
  getHistorySummary: (reviewId: string) =>
    api.get(`/reviews/${reviewId}/history-summary`),
  
  createSample: () =>
    api.post("/sample-review"),
  
  createTest: () =>
    api.post("/test-review")
};

export const guideApi = {
  getGuide: () => api.get("/guide"),
  getQuickStart: () => api.get("/guide/quick-start"),
  getFAQ: () => api.get("/guide/faq")
};

export const grayReleaseApi = {
  getHistories: () => api.get("/gray-release/histories")
};

export default api;
