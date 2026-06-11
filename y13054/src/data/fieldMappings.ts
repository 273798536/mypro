import type { FieldMapping } from '@/types';

export const fieldMappings: FieldMapping[] = [
  { sourceField: 'gps_x', targetField: 'lng', examplePointId: 'BH-01' },
  { sourceField: 'gps_y', targetField: 'lat', examplePointId: 'BH-01' },
  { sourceField: '经度', targetField: 'lng', examplePointId: 'BH-04' },
  { sourceField: '纬度', targetField: 'lat', examplePointId: 'BH-04' },
  { sourceField: '点位编号', targetField: 'id', examplePointId: 'BH-04' },
  { sourceField: '风速读数', targetField: 'windSpeed', examplePointId: 'BH-04' },
  { sourceField: '风速', targetField: 'windSpeed', examplePointId: 'BH-01' },
  { sourceField: '现场负责人', targetField: 'reporter', examplePointId: 'BH-04' },
  { sourceField: '上报人', targetField: 'reporter', examplePointId: 'BH-01' },
];
