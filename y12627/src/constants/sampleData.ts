import type { SampleData } from '@/types';

export const SAMPLE_DATA_LIST: SampleData[] = [
  {
    id: 'sample-old',
    name: '海洋馆二楼展缸旧表',
    description: '2019年归档的旧数据表，包含补录备注、漏填单位等真实场景',
    initialScaleRatio: '1:100',
    tanks: [
      {
        id: 't1',
        name: '热带观赏鱼展缸',
        x: 100, y: 100, width: 200, height: 150,
        status: 'normal',
        source: 'original',
        unit: 'cm',
        remark: '数据来源：2019年验收档案第3册'
      },
      {
        id: 't2',
        name: '水母展示缸',
        x: 350, y: 120, width: 180, height: 180,
        status: 'warning',
        source: 'supplement',
        unit: 'cm',
        remark: '2024.03.15 补录，原表缺失，来源：张工工作笔记'
      },
      {
        id: 't3',
        name: '珊瑚礁生态缸',
        x: 150, y: 300, width: 250, height: 120,
        status: 'error',
        source: 'original',
        missingUnit: true,
        remark: '漏填单位，原始记录字迹模糊'
      },
      {
        id: 't4',
        name: '企鹅生活展区',
        x: 450, y: 320, width: 220, height: 200,
        status: 'normal',
        source: 'original',
        unit: 'cm',
        remark: '含陆地休息区和水池区'
      },
      {
        id: 't5',
        name: '海底隧道入口',
        x: 120, y: 500, width: 300, height: 80,
        status: 'warning',
        source: 'supplement',
        unit: 'cm',
        remark: '2024.05.20 补录，根据现场照片估算'
      }
    ]
  },
  {
    id: 'sample-new',
    name: '新馆规划草案',
    description: '2025年新馆规划方案，数据较为完整',
    initialScaleRatio: '1:100',
    tanks: [
      {
        id: 'n1',
        name: '大型鲨鱼缸',
        x: 150, y: 150, width: 400, height: 300,
        status: 'normal',
        source: 'original',
        unit: 'cm'
      },
      {
        id: 'n2',
        name: '触摸池',
        x: 600, y: 200, width: 200, height: 150,
        status: 'normal',
        source: 'original',
        unit: 'cm'
      }
    ]
  }
];

export const DEMO_ERROR_SCENARIO = {
  wrongScale: '1:500',
  correctScale: '1:100',
  affectedTankIds: ['t1', 't2', 't3', 't4', 't5'],
  errorDescription: '比例尺误设为1:500，导致所有展缸实际尺寸被错误放大5倍',
  recoveryDescription: '已将比例尺恢复为正确的1:100，展缸尺寸计算回归正常'
};
