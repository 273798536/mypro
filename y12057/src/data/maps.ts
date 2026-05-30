import { v4 as uuidv4 } from 'uuid';
import type { FestivalMap, DataSource } from '../engine/types';

function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export const festivalMaps: FestivalMap[] = [
  {
    id: 'map-sunset-2024',
    name: '日落音乐节 2024',
    width: 800,
    height: 600,
    expectedAttendance: 15000,
    duration: 480,
    elements: [
      { id: 'stage-main', type: 'stage', x: 300, y: 50, width: 200, height: 120, name: '主舞台', capacity: 8000 },
      { id: 'stage-indie', type: 'stage', x: 50, y: 200, width: 120, height: 80, name: '独立音乐舞台', capacity: 3000 },
      { id: 'stage-edm', type: 'stage', x: 630, y: 200, width: 120, height: 80, name: 'EDM舞台', capacity: 4000 },
      { id: 'exit-north', type: 'exit', x: 350, y: 0, width: 100, height: 30, name: '北出口', capacity: 2000 },
      { id: 'exit-south', type: 'exit', x: 350, y: 570, width: 100, height: 30, name: '南出口', capacity: 2000 },
      { id: 'exit-east', type: 'exit', x: 770, y: 280, width: 30, height: 80, name: '东出口', capacity: 1500 },
      { id: 'exit-west', type: 'exit', x: 0, y: 280, width: 30, height: 80, name: '西出口', capacity: 1500 },
      { id: 'entrance-main', type: 'entrance', x: 350, y: 520, width: 100, height: 40, name: '主入口' },
      { id: 'food-1', type: 'food', x: 100, y: 400, width: 60, height: 40, name: '美食区A' },
      { id: 'food-2', type: 'food', x: 640, y: 400, width: 60, height: 40, name: '美食区B' },
      { id: 'restroom-1', type: 'restroom', x: 200, y: 320, width: 50, height: 30, name: '卫生间1' },
      { id: 'restroom-2', type: 'restroom', x: 550, y: 320, width: 50, height: 30, name: '卫生间2' },
      { id: 'barrier-1', type: 'barrier', x: 250, y: 180, width: 300, height: 10, name: '前排围栏' },
    ]
  },
  {
    id: 'map-electro-dock',
    name: '电音码头音乐节',
    width: 900,
    height: 500,
    expectedAttendance: 20000,
    duration: 540,
    elements: [
      { id: 'stage-main', type: 'stage', x: 350, y: 30, width: 200, height: 100, name: '主舞台', capacity: 12000 },
      { id: 'stage-bass', type: 'stage', x: 50, y: 150, width: 100, height: 70, name: '贝斯舞台', capacity: 4000 },
      { id: 'stage-techno', type: 'stage', x: 750, y: 150, width: 100, height: 70, name: '铁克诺舞台', capacity: 4000 },
      { id: 'exit-north1', type: 'exit', x: 200, y: 0, width: 80, height: 25, name: '东北出口', capacity: 1800 },
      { id: 'exit-north2', type: 'exit', x: 620, y: 0, width: 80, height: 25, name: '西北出口', capacity: 1800 },
      { id: 'exit-south', type: 'exit', x: 400, y: 475, width: 100, height: 25, name: '南出口', capacity: 2500 },
      { id: 'entrance-main', type: 'entrance', x: 400, y: 420, width: 100, height: 40, name: '主入口' },
      { id: 'food-court', type: 'food', x: 100, y: 300, width: 150, height: 60, name: '美食广场' },
      { id: 'restroom-main', type: 'restroom', x: 650, y: 300, width: 100, height: 40, name: '主卫生间' },
      { id: 'barrier-vip', type: 'barrier', x: 300, y: 140, width: 300, height: 8, name: 'VIP区围栏' },
    ]
  }
];

export const mapDataSources: DataSource[] = festivalMaps.map(map => {
  const content = `
舞台地图文件: ${map.name}.json
导入时间: ${new Date().toISOString()}
场地尺寸: ${map.width}m × ${map.height}m
预计人数: ${map.expectedAttendance}人
演出时长: ${Math.floor(map.duration / 60)}小时${map.duration % 60}分钟

舞台配置:
${map.elements.filter(e => e.type === 'stage').map(e => `- ${e.name}: ${e.capacity}人容量, 位置(${e.x},${e.y})`).join('\n')}

出口配置:
${map.elements.filter(e => e.type === 'exit').map(e => `- ${e.name}: ${e.capacity}人/小时流量`).join('\n')}

风险评估备注:
- 主舞台前方区域预计为高密度区
- 南北出口为主要疏散通道
- 建议在各出口部署固定岗
  `.trim();

  const stageCount = map.elements.filter(e => e.type === 'stage').length;
  const exitCount = map.elements.filter(e => e.type === 'exit').length;
  
  return {
    id: `ds-map-${map.id}`,
    type: 'stage_map',
    name: `${map.name} - 场地布局图`,
    title: `${map.name}场地布局图及风险评估`,
    content,
    originalFile: `${map.name}_stage_map.json`,
    originalPath: `/maps/${map.name}_stage_map.json`,
    hash: generateHash(content),
    contentHash: 'sha256:' + generateHash(content),
    timestamp: Date.now() - 86400000 * 3,
    source: '场地设计部',
    summary: `${map.name}场地布局图，场地尺寸${map.width}m×${map.height}m，预计人数${map.expectedAttendance}人。包含${stageCount}个舞台和${exitCount}个出口。主舞台前方为高密度区，南北出口为主要疏散通道，建议在各出口部署固定岗。`,
    format: 'json',
    notes: '地图坐标已与现场GPS校准',
    tags: ['场地地图', map.name, '布局图', '风险评估']
  };
});

export const getMapById = (id: string): FestivalMap | undefined => {
  return festivalMaps.find(m => m.id === id);
};

export const getDataSourceById = (id: string): DataSource | undefined => {
  return mapDataSources.find(d => d.id === id);
};
