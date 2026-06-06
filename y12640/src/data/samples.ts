import type { SampleData } from '@/types';

export const sampleDatas: SampleData[] = [
  {
    id: 'smooth',
    name: '顺利记录',
    description: '坐标完整、比例尺正确、数据一致的标准样例',
    hotspots: [
      { id: 'h1', x: 100, y: 100, value: 85, label: '主舞台' },
      { id: 'h2', x: 250, y: 150, value: 72, label: '美食区' },
      { id: 'h3', x: 180, y: 250, value: 65, label: '休息区' },
      { id: 'h4', x: 350, y: 200, value: 58, label: '文创市集' },
      { id: 'h5', x: 120, y: 180, value: 45, label: '饮水点' },
    ],
    mapConfig: {
      width: 400,
      height: 300,
      scale: 10,
      scaleUnit: '米/像素',
      name: '音乐节场地A区'
    }
  },
  {
    id: 'pending',
    name: '待确认记录',
    description: '存在空值和未标注比例尺，需要人工复核',
    hotspots: [
      { id: 'h1', x: 100, y: 100, value: 85, label: '主舞台' },
      { id: 'h2', x: null, y: 150, value: 72, label: '美食区', notes: 'X坐标待补充' },
      { id: 'h3', x: 180, y: null, value: 65, label: '休息区' },
      { id: 'h4', x: 350, y: 200, value: 58, label: '文创市集' },
      { id: 'h5', x: 120, y: 180, value: 45, label: '饮水点' },
    ],
    mapConfig: {
      width: 400,
      height: 300,
      scale: null,
      scaleUnit: '',
      name: '音乐节场地B区'
    }
  },
  {
    id: 'bad',
    name: '坏数据记录',
    description: '存在坐标翻转、重复和备注混写的问题数据',
    hotspots: [
      { id: 'h1', x: 100, y: 100, value: 85, label: '主舞台' },
      { id: 'h2', x: 250, y: 500, value: 72, label: '美食区', notes: '坐标可能翻转' },
      { id: 'h3', x: 180, y: 250, value: 65, label: '休息区' },
      { id: 'h4', x: 180, y: 250, value: 65, label: '休息区', notes: '重复记录' },
      { id: 'h5', x: '120备注' as unknown as number, y: 180, value: 45, label: '饮水点', notes: '坐标混写' },
    ],
    mapConfig: {
      width: 400,
      height: 300,
      scale: -5,
      scaleUnit: '米/像素',
      name: '音乐节场地C区'
    }
  }
];

export const getSampleById = (id: string): SampleData | undefined => {
  return sampleDatas.find(s => s.id === id);
};
