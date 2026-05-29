import { Obstacle, JointConfig } from '@/types';
import {
  getDefaultDHParams,
  getDefaultJointLimits,
  getDefaultLinkLengths,
  degToRad,
} from './kinematics';

export function getMockObstacles(): Obstacle[] {
  return [
    {
      id: 'obstacle-1',
      type: 'box',
      position: [0.5, 0.2, 0.3],
      size: [0.3, 0.4, 0.3],
      rotation: [0, 0.3, 0],
      color: '#ff6b6b',
    },
    {
      id: 'obstacle-2',
      type: 'sphere',
      position: [-0.4, 0.5, 0.2],
      size: [0.2, 0.2, 0.2],
      rotation: [0, 0, 0],
      color: '#4ecdc4',
    },
    {
      id: 'obstacle-3',
      type: 'box',
      position: [0.3, -0.3, 0.5],
      size: [0.25, 0.25, 0.4],
      rotation: [0.2, -0.2, 0.1],
      color: '#ffe66d',
    },
  ];
}

export function getDefaultJointConfig(): JointConfig {
  return {
    jointAngles: [0, -Math.PI / 4, 0, -Math.PI / 2, 0, 0],
    jointLimits: getDefaultJointLimits(),
    linkLengths: getDefaultLinkLengths(),
    dhParameters: getDefaultDHParams(),
  };
}

export function getTestJointConfigs(): Array<{ name: string; config: JointConfig }> {
  const baseConfig = getDefaultJointConfig();

  return [
    {
      name: '默认姿态',
      config: { ...baseConfig },
    },
    {
      name: '关节1越界',
      config: {
        ...baseConfig,
        jointAngles: [degToRad(270), -Math.PI / 4, 0, -Math.PI / 2, 0, 0],
      },
    },
    {
      name: '关节2越界',
      config: {
        ...baseConfig,
        jointAngles: [0, degToRad(120), 0, -Math.PI / 2, 0, 0],
      },
    },
    {
      name: '奇异位形1',
      config: {
        ...baseConfig,
        jointAngles: [0, 0, 0, 0, 0, 0],
      },
    },
    {
      name: '多关节越界',
      config: {
        ...baseConfig,
        jointAngles: [degToRad(200), degToRad(-120), degToRad(200), -Math.PI / 2, 0, 0],
      },
    },
  ];
}

export function getSampleResolutionOptions(): Array<{ label: string; value: number }> {
  return [
    { label: '低 (200点)', value: 200 },
    { label: '中 (500点)', value: 500 },
    { label: '高 (1000点)', value: 1000 },
    { label: '超高 (2000点)', value: 2000 },
  ];
}
