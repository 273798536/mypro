import { get, put } from './api';
import type { VehicleRecord, ApiResponse, PaginatedResponse, PaginationParams } from '../../shared/types';

interface VehicleFilters {
  storeId?: string;
  brand?: string;
  keyword?: string;
}

export const getVehicles = async (
  filters?: VehicleFilters,
  pagination?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<VehicleRecord>>> => {
  return get('/vehicle/list', { ...filters, ...pagination });
};

export const getVehicleDetail = async (id: string): Promise<ApiResponse<VehicleRecord>> => {
  return get<VehicleRecord>(`/vehicle/${id}`);
};

export const updateVehicleStorePrice = async (
  id: string,
  storePrice: number,
  operator: string
): Promise<ApiResponse<VehicleRecord>> => {
  return put<VehicleRecord>(`/vehicle/${id}/store-price`, { storePrice, operator });
};
