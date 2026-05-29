import { request } from './client';
import type { Channel, RateHistory, PaginationParams, PaginatedResponse } from '../../shared/types';

export async function getChannels(params?: PaginationParams): Promise<PaginatedResponse<Channel>> {
  return request<PaginatedResponse<Channel>>({
    method: 'GET',
    url: '/channels',
    params,
  });
}

export async function createChannel(data: Partial<Channel>): Promise<Channel> {
  return request<Channel>({
    method: 'POST',
    url: '/channels',
    data,
  });
}

export async function updateChannel(id: string, data: Partial<Channel>): Promise<Channel> {
  return request<Channel>({
    method: 'PUT',
    url: `/channels/${id}`,
    data,
  });
}

export async function getRateHistory(channelId: string): Promise<RateHistory[]> {
  return request<RateHistory[]>({
    method: 'GET',
    url: `/channels/${channelId}/rate-history`,
  });
}
