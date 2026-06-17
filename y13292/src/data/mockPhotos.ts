import type { PhotoRecord } from '../types';

export const mockPhotos: PhotoRecord[] = [
  {
    id: 'photo-001',
    complaintId: 'pt-002',
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=busy%20pedestrian%20bridge%20ramp%20with%20crowd%20of%20people%20during%20morning%20rush%20hour%20urban%20city%20scene&image_size=landscape_16_9',
    description: '早高峰现场照片，坡道入口拥堵',
    uploadedAt: '2026-06-12T09:15:00Z',
    uploadedBy: '规划师小赵',
  },
  {
    id: 'photo-002',
    complaintId: 'pt-002',
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wheelchair%20accessibility%20ramp%20narrow%20walkway%20urban%20pedestrian%20bridge%20overcrowded&image_size=landscape_16_9',
    description: '轮椅通行困难的现场记录',
    uploadedAt: '2026-06-12T09:45:00Z',
    uploadedBy: '规划师小赵',
  },
  {
    id: 'photo-003',
    complaintId: 'pt-003',
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=worn%20out%20anti-slip%20mat%20on%20pedestrian%20ramp%20safety%20hazard%20park%20bridge&image_size=landscape_16_9',
    description: '防滑垫磨损情况照片',
    uploadedAt: '2026-06-13T16:00:00Z',
    uploadedBy: '市民投诉人',
  },
  {
    id: 'photo-004',
    complaintId: 'pt-004',
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=heavily%20crowded%20pedestrian%20overpass%20ramp%20tech%20park%20commuters%20evening%20rush%20hour&image_size=landscape_16_9',
    description: '科技园晚高峰严重拥堵',
    uploadedAt: '2026-06-11T18:30:00Z',
    uploadedBy: '现场勘测组',
  },
  {
    id: 'photo-005',
    complaintId: 'pt-004',
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=pedestrian%20bridge%20capacity%20survey%20field%20measurement%20urban%20planning&image_size=landscape_16_9',
    description: '第二次勘测确认超限',
    uploadedAt: '2026-06-14T17:20:00Z',
    uploadedBy: '现场勘测组',
  },
  {
    id: 'photo-006',
    complaintId: 'pt-005',
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cultural%20plaza%20pedestrian%20overpass%20renovation%20construction%20expansion%20work%20in%20progress&image_size=landscape_16_9',
    description: '改造施工中现场照片',
    uploadedAt: '2026-06-15T11:00:00Z',
    uploadedBy: '工程确认组',
  },
];
