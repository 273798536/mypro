import { get, put } from './api';
import type { VehicleRecord } from 'shared/types';

export const vehicleService = {
  getById: (id: string) =>
    get<VehicleRecord>(`/vehicle/${id}`),

  update: (id: string, data: Partial<VehicleRecord>) =>
    put<VehicleRecord>(`/vehicle/${id}`, data),
};
