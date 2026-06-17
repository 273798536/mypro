import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  Tour,
  TourStats,
  Track,
  AudioMaterial,
  ReviewRecord,
  MatchResult,
  BatchMatchResult,
  ConfirmMatchingDto,
  BatchMatchingDto,
  CreateTourDto,
  UpdateTourDto,
  GetToursQueryDto,
  CreateTrackDto,
  UpdateTrackDto,
  UpdateTrackStatusDto,
  GetTracksQueryDto,
  CreateMaterialDto,
  ActivateMaterialDto,
  CreateReviewDto,
  ResolveSuspendDto,
  FileDto,
  FileUploadResponseDto,
  GetFilesQueryDto,
  UploadFileDto,
  VersionComparison,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const axiosInstance: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const extractData = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  return response.data.data;
};

export const tourApi = {
  findAll: (query?: GetToursQueryDto): Promise<PaginatedResponse<Tour>> => {
    return axiosInstance.get('/tours', { params: query }).then(extractData);
  },

  findOne: (id: string): Promise<Tour> => {
    return axiosInstance.get(`/tours/${id}`).then(extractData);
  },

  getStats: (id: string): Promise<TourStats> => {
    return axiosInstance.get(`/tours/${id}/stats`).then(extractData);
  },

  create: (data: CreateTourDto): Promise<Tour> => {
    return axiosInstance.post('/tours', data).then(extractData);
  },

  update: (id: string, data: UpdateTourDto): Promise<Tour> => {
    return axiosInstance.put(`/tours/${id}`, data).then(extractData);
  },

  remove: (id: string): Promise<void> => {
    return axiosInstance.delete(`/tours/${id}`);
  },
};

export const trackApi = {
  findAll: (query?: GetTracksQueryDto): Promise<PaginatedResponse<Track>> => {
    return axiosInstance.get('/tracks', { params: query }).then(extractData);
  },

  findOne: (id: string): Promise<Track> => {
    return axiosInstance.get(`/tracks/${id}`).then(extractData);
  },

  create: (data: CreateTrackDto): Promise<Track> => {
    return axiosInstance.post('/tracks', data).then(extractData);
  },

  update: (id: string, data: UpdateTrackDto): Promise<Track> => {
    return axiosInstance.put(`/tracks/${id}`, data).then(extractData);
  },

  updateStatus: (id: string, data: UpdateTrackStatusDto): Promise<Track> => {
    return axiosInstance.put(`/tracks/${id}/status`, data).then(extractData);
  },

  remove: (id: string): Promise<void> => {
    return axiosInstance.delete(`/tracks/${id}`);
  },
};

export const materialApi = {
  findByTrackId: (trackId: string): Promise<AudioMaterial[]> => {
    return axiosInstance.get(`/tracks/${trackId}/materials`).then(extractData);
  },

  create: (data: CreateMaterialDto): Promise<AudioMaterial> => {
    return axiosInstance.post('/materials', data).then(extractData);
  },

  activate: (materialId: string, data: ActivateMaterialDto): Promise<AudioMaterial> => {
    return axiosInstance.post(`/materials/${materialId}/activate`, data).then(extractData);
  },

  getVersionComparison: (materialId: string): Promise<VersionComparison> => {
    return axiosInstance.get(`/materials/${materialId}/versions`).then(extractData);
  },
};

export const reviewApi = {
  findByTrackId: (trackId: string): Promise<ReviewRecord[]> => {
    return axiosInstance.get(`/tracks/${trackId}/reviews`).then(extractData);
  },

  create: (data: CreateReviewDto): Promise<ReviewRecord> => {
    return axiosInstance.post('/reviews', data).then(extractData);
  },

  resolveSuspend: (data: ResolveSuspendDto): Promise<ReviewRecord> => {
    return axiosInstance.post('/reviews/suspend/resolve', data).then(extractData);
  },
};

export const matchingApi = {
  analyze: (data: {
    materialId: string;
    fileName: string;
    actualDuration: number;
    candidates: Array<{
      trackId: string;
      trackNo: number;
      title: string;
      artist: string;
      expectedDuration: number;
      score: number;
    }>;
  }): Promise<MatchResult> => {
    return axiosInstance.post('/matching/analyze', data).then(extractData);
  },

  confirm: (data: ConfirmMatchingDto): Promise<{
    materialId: string;
    trackId: string;
    matchStatus: string;
    matchConfidence: number;
    confirmedBy: string;
    confirmedAt: string;
  }> => {
    return axiosInstance.post('/matching/confirm', data).then(extractData);
  },

  batchMatch: (data: BatchMatchingDto): Promise<BatchMatchResult> => {
    return axiosInstance.post('/matching/batch', data).then(extractData);
  },
};

export const fileApi = {
  upload: (files: File[], options?: UploadFileDto): Promise<FileUploadResponseDto> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, String(value));
        }
      });
    }
    return axiosInstance
      .post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then(extractData);
  },

  findAll: (query?: GetFilesQueryDto): Promise<PaginatedResponse<FileDto>> => {
    return axiosInstance.get('/files', { params: query }).then(extractData);
  },

  findOne: (id: string): Promise<FileDto> => {
    return axiosInstance.get(`/files/${id}`).then(extractData);
  },

  remove: (id: string): Promise<void> => {
    return axiosInstance.delete(`/files/${id}`);
  },

  download: (filePath: string): string => {
    return `${baseURL}/files/download/${filePath}`;
  },
};

export const exportApi = {
  exportTracks: (format: 'csv' | 'excel' | 'json', showId?: string, tourId?: string): Promise<Blob> => {
    return axiosInstance.get('/export/tracks', {
      params: { format, showId, tourId },
      responseType: 'blob',
    });
  },

  getTemplates: (): Promise<
    Array<{
      id: string;
      name: string;
      description?: string;
      format: string;
      fields: string[];
    }>
  > => {
    return axiosInstance.get('/export/templates').then(extractData);
  },
};

export default axiosInstance;
