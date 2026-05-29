import { request } from './client';
import type { ImpressionLog, ClickLog, ConversionOrder, PaginatedResponse } from '../../shared/types';

export async function importImpressions(data: ImpressionLog[]): Promise<{ count: number }> {
  return request<{ count: number }>({
    method: 'POST',
    url: '/data/impressions/import',
    data,
  });
}

export async function getImpressions(params?: any): Promise<PaginatedResponse<ImpressionLog>> {
  return request<PaginatedResponse<ImpressionLog>>({
    method: 'GET',
    url: '/data/impressions',
    params,
  });
}

export async function importClicks(data: ClickLog[]): Promise<{ count: number }> {
  return request<{ count: number }>({
    method: 'POST',
    url: '/data/clicks/import',
    data,
  });
}

export async function getClicks(params?: any): Promise<PaginatedResponse<ClickLog>> {
  return request<PaginatedResponse<ClickLog>>({
    method: 'GET',
    url: '/data/clicks',
    params,
  });
}

export async function checkClickMissing(
  channelId: string,
  startDate: string,
  endDate: string
): Promise<{ missingCount: number; impressionCount: number; clickCount: number }> {
  return request<{ missingCount: number; impressionCount: number; clickCount: number }>({
    method: 'GET',
    url: '/data/clicks/check-missing',
    params: { channelId, startDate, endDate },
  });
}

export async function createConversion(data: Partial<ConversionOrder>): Promise<ConversionOrder> {
  return request<ConversionOrder>({
    method: 'POST',
    url: '/data/conversions',
    data,
  });
}

export async function importConversions(data: ConversionOrder[]): Promise<{ count: number }> {
  return request<{ count: number }>({
    method: 'POST',
    url: '/data/conversions/import',
    data,
  });
}

export async function getConversions(params?: any): Promise<PaginatedResponse<ConversionOrder>> {
  return request<PaginatedResponse<ConversionOrder>>({
    method: 'GET',
    url: '/data/conversions',
    params,
  });
}
