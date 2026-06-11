import { FieldMapping } from '../types';

export const defaultFieldMappings: FieldMapping[] = [
  { cadField: '数据源', standardField: 'source', locked: true },
  { cadField: '处理状态', standardField: 'processStatus', locked: true },
  { cadField: 'X坐标', standardField: 'x', locked: false },
  { cadField: 'Y坐标', standardField: 'y', locked: false },
  { cadField: '高程', standardField: 'y', locked: false },
  { cadField: '时间戳', standardField: 'timestamp', locked: false },
  { cadField: '采集时间', standardField: 'timestamp', locked: false },
  { cadField: '图层', standardField: 'layer', locked: false },
  { cadField: '图层名', standardField: 'layer', locked: false },
];

export const lockedStandardFields = ['source', 'processStatus'];

export const synonymMap: Record<string, string[]> = {
  source: ['数据源', '来源', '数据来源', 'source'],
  processStatus: ['处理状态', '状态', 'process_status', 'status'],
  x: ['X坐标', 'x坐标', '横坐标', 'x'],
  y: ['Y坐标', 'y坐标', '纵坐标', '高程', 'y', 'height'],
  timestamp: ['时间戳', '采集时间', '记录时间', '时间', 'timestamp'],
  layer: ['图层', '图层名', 'layer', 'cad_layer'],
};
