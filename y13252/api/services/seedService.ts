import type { Complaint, Photo, ChangeRecord } from '../../shared/types.js';
import { clearAllData, addComplaint } from './dataStore.js';
import { checkCoordinates } from './coordinateService.js';
import { checkPhotoNames } from './nameCheckService.js';

function generateId(): string {
  return 'C' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6);
}

function generatePhotoId(): string {
  return 'P' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 4);
}

const samplePrompts = [
  '夜市外摆摊位，夜间街道，小吃摊，路灯照明，城市夜景，真实场景，摄影照片',
  '城管巡检现场，街道占道经营，夜市摊位，人行道，城市管理，真实场景照片',
  '夜市美食街，人流密集，外摆桌椅，霓虹灯，夜晚城市生活，写实摄影',
  '夜间占道经营检查，执法人员现场，夜市摊位，街道，政务巡检照片',
  '深夜食堂外摆，小桌子小凳子，街道旁，夜市氛围，生活气息，真实照片'
];

function getImageUrl(prompt: string): string {
  const encoded = encodeURIComponent(prompt);
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encoded}&image_size=square_hd`;
}

function generateMockData(): Complaint[] {
  const now = new Date();
  const complaints: Complaint[] = [];

  const photos1: Photo[] = [
    {
      id: generatePhotoId(),
      originalName: '夜市外摆_红旗路_20260615_0830.jpg',
      systemName: '夜市外摆_红旗路_20260615_0830.jpg',
      url: getImageUrl(samplePrompts[0]),
      latitude: 31.230412,
      longitude: 121.473701,
      address: '红旗路123号',
      takenAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      isNameMismatch: false,
      source: '早班巡检-张师傅'
    },
    {
      id: generatePhotoId(),
      originalName: '夜市外摆_红旗路_20260615_1845.jpg',
      systemName: '夜市外摆_红星路_20260615_1845.jpg',
      url: getImageUrl(samplePrompts[1]),
      latitude: 31.232215,
      longitude: 121.475508,
      address: '红星路456号',
      takenAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      isNameMismatch: true,
      source: '晚班巡检-李师傅'
    },
    {
      id: generatePhotoId(),
      originalName: '夜市外摆_红旗路_20260616_0915.jpg',
      systemName: '夜市外摆_红旗路_20260616_0915.jpg',
      url: getImageUrl(samplePrompts[2]),
      latitude: 31.230550,
      longitude: 121.473850,
      address: '红旗路123号-1',
      takenAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      isNameMismatch: false,
      source: '早班巡检-张师傅'
    },
    {
      id: generatePhotoId(),
      originalName: '夜市外摆_红旗路_20260616_1930.jpg',
      systemName: '夜市外摆_红旗路_20260616_1930.jpg',
      url: getImageUrl(samplePrompts[3]),
      latitude: 31.230380,
      longitude: 121.473620,
      address: '红旗路125号',
      takenAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      isNameMismatch: false,
      source: '晚班巡检-王师傅'
    },
    {
      id: generatePhotoId(),
      originalName: '夜市外摆_红旗路_20260616_2015.jpg',
      systemName: '夜市外摆_红旗路_20260616_2015.jpg',
      url: getImageUrl(samplePrompts[4]),
      latitude: 31.230420,
      longitude: 121.473750,
      address: '红旗路123号门口',
      takenAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      isNameMismatch: false,
      source: '晚班巡检-王师傅'
    }
  ];

  checkPhotoNames(photos1);
  const coordCheck1 = checkCoordinates(31.230412, 121.473701, photos1);

  const initialChange: ChangeRecord = {
    id: 'CH' + Date.now().toString(36),
    timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'status_update',
    description: '投诉受理，状态更新为处理中',
    beforeValue: '待处理',
    afterValue: '处理中'
  };

  const complaint1: Complaint = {
    id: 'C20260615001',
    title: '红旗路夜市外摆占道经营投诉',
    address: '红旗路123号',
    latitude: 31.230412,
    longitude: 121.473701,
    status: 'processing',
    photos: photos1,
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now.toISOString(),
    hasCoordinateOffset: coordCheck1.hasOffset,
    offsetDistance: coordCheck1.offsetDistance,
    changeHistory: [initialChange]
  };

  const photos2: Photo[] = [
    {
      id: generatePhotoId(),
      originalName: '夜市外摆_人民路_20260614.jpg',
      systemName: '夜市外摆_人民路_20260614.jpg',
      url: getImageUrl(samplePrompts[0]),
      latitude: 31.231500,
      longitude: 121.472000,
      address: '人民路789号',
      takenAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      isNameMismatch: false,
      source: '巡检-刘师傅'
    },
    {
      id: generatePhotoId(),
      originalName: '夜市外摆_人民路_20260615.jpg',
      systemName: '夜市外摆_人民路_20260615.jpg',
      url: getImageUrl(samplePrompts[1]),
      latitude: 31.231600,
      longitude: 121.472100,
      address: '人民路789号-2',
      takenAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      isNameMismatch: false,
      source: '巡检-刘师傅'
    }
  ];

  checkPhotoNames(photos2);
  const coordCheck2 = checkCoordinates(31.231500, 121.472000, photos2);

  const complaint2: Complaint = {
    id: 'C20260614002',
    title: '人民路夜市噪音扰民投诉',
    address: '人民路789号',
    latitude: 31.231500,
    longitude: 121.472000,
    status: 'resolved',
    photos: photos2,
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    hasCoordinateOffset: coordCheck2.hasOffset,
    offsetDistance: coordCheck2.offsetDistance,
    changeHistory: [
      {
        id: 'CH' + (Date.now() - 5 * 24 * 60 * 60 * 1000).toString(36),
        timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'status_update',
        description: '投诉受理',
        beforeValue: '待处理',
        afterValue: '处理中'
      },
      {
        id: 'CH' + (Date.now() - 1 * 24 * 60 * 60 * 1000).toString(36),
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'status_update',
        description: '已完成整改，摊位已规范摆放',
        beforeValue: '处理中',
        afterValue: '已完成'
      }
    ]
  };

  const photos3: Photo[] = [
    {
      id: generatePhotoId(),
      originalName: '夜市外摆_解放路_20260616.jpg',
      systemName: '夜市外摆_解放路_20260616.jpg',
      url: getImageUrl(samplePrompts[2]),
      latitude: 31.229500,
      longitude: 121.475000,
      address: '解放路321号',
      takenAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      isNameMismatch: false,
      source: '巡检-赵师傅'
    }
  ];

  checkPhotoNames(photos3);
  const coordCheck3 = checkCoordinates(31.229500, 121.475000, photos3);

  const complaint3: Complaint = {
    id: 'C20260616003',
    title: '解放路夜市外摆堵塞消防通道',
    address: '解放路321号',
    latitude: 31.229500,
    longitude: 121.475000,
    status: 'pending',
    photos: photos3,
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    hasCoordinateOffset: coordCheck3.hasOffset,
    offsetDistance: coordCheck3.offsetDistance,
    changeHistory: []
  };

  complaints.push(complaint1, complaint2, complaint3);
  return complaints;
}

export function seedDatabase(): { success: boolean; message: string; complaintsCreated: number } {
  try {
    clearAllData();
    const mockData = generateMockData();
    mockData.forEach(complaint => addComplaint(complaint));
    
    return {
      success: true,
      message: `成功生成 ${mockData.length} 条投诉数据，包含名称不一致和坐标偏移测试用例`,
      complaintsCreated: mockData.length
    };
  } catch (error) {
    return {
      success: false,
      message: `数据生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
      complaintsCreated: 0
    };
  }
}
