import type { DataVersion } from '@/types';
import { slopes } from './slopes';
import { snowData } from './snowfall';
import { trajectories } from './trajectories';
import { accidents } from './accidents';
import { patrolReports } from './patrols';

export const dataVersions: DataVersion[] = [
  {
    id: 'v1.0.0',
    timestamp: new Date('2026-05-25T08:00:00'),
    source: '系统初始化',
    changeLog: '系统首次部署，导入基础地形和雪道数据',
    dataSnapshot: {
      slopes: slopes.slice(0, 4),
      snowData: snowData.slice(0, 4),
      trajectories: trajectories.slice(0, 20),
      accidents: accidents.slice(0, 3),
      patrolReports: patrolReports.slice(0, 4),
    },
    createdBy: 'system',
  },
  {
    id: 'v1.1.0',
    timestamp: new Date('2026-05-26T08:00:00'),
    source: '数据同步',
    changeLog: '新增高级道和专家道数据，更新事故记录',
    dataSnapshot: {
      slopes: slopes,
      snowData: snowData,
      trajectories: trajectories.slice(0, 35),
      accidents: accidents.slice(0, 5),
      patrolReports: patrolReports.slice(0, 6),
    },
    createdBy: 'admin',
  },
  {
    id: 'v1.2.0',
    timestamp: new Date('2026-05-27T06:00:00'),
    source: '每日数据更新',
    changeLog: '更新今日积雪数据、人流轨迹和巡逻报告',
    dataSnapshot: {
      slopes,
      snowData,
      trajectories,
      accidents,
      patrolReports,
    },
    createdBy: 'system',
  },
];

export const getCurrentVersion = (): DataVersion => {
  return dataVersions[dataVersions.length - 1];
};

export const getVersionById = (id: string): DataVersion | undefined => {
  return dataVersions.find((v) => v.id === id);
};
