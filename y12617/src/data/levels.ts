import type { Level } from '../types/level';
import { ID_PREFIXES } from '../utils/id';

export const LEVELS: Level[] = [
  {
    id: 'level-boundary-failure',
    name: '关卡一：边界失败',
    description: '模拟高速运动下的边界判定误差场景，标注出边界误判发生的瞬间。',
    type: 'boundary_failure',
    duration: 15,
    targetAnnotations: 2,
    hint: '提示：关注高速冲向边界的红色球体，在边界判定异常时进行标注。',
    boundaryErrorConfig: {
      ballId: `${ID_PREFIXES.BALL}-1`,
      triggerTime: 3.5,
      errorMessage: '高速运动下边界判定误差：球体实际未完全出界，但系统判定出界',
    },
    initialBalls: [
      {
        id: `${ID_PREFIXES.BALL}-1`,
        radius: 25,
        color: '#F53F3F',
        label: '红方',
        initialPosition: { x: 100, y: 200 },
        initialVelocity: { x: 900, y: 50 },
        mass: 1,
      },
      {
        id: `${ID_PREFIXES.BALL}-2`,
        radius: 30,
        color: '#165DFF',
        label: '蓝方',
        initialPosition: { x: 500, y: 300 },
        initialVelocity: { x: -200, y: 150 },
        mass: 1.2,
      },
      {
        id: `${ID_PREFIXES.BALL}-3`,
        radius: 20,
        color: '#00B42A',
        label: '绿方',
        initialPosition: { x: 300, y: 100 },
        initialVelocity: { x: 150, y: -100 },
        mass: 0.8,
      },
    ],
  },
  {
    id: 'level-undo-restart',
    name: '关卡二：撤销重开',
    description: '练习使用撤销/重做和重置功能，处理标注错误后重新开始的场景。',
    type: 'undo_restart',
    duration: 20,
    targetAnnotations: 3,
    hint: '提示：先故意做一个错误标注，然后使用撤销功能，再尝试重置关卡重新开始。',
    initialBalls: [
      {
        id: `${ID_PREFIXES.BALL}-1`,
        radius: 28,
        color: '#F53F3F',
        label: '红1',
        initialPosition: { x: 150, y: 150 },
        initialVelocity: { x: 300, y: 200 },
        mass: 1,
      },
      {
        id: `${ID_PREFIXES.BALL}-2`,
        radius: 28,
        color: '#165DFF',
        label: '蓝1',
        initialPosition: { x: 600, y: 200 },
        initialVelocity: { x: -250, y: 180 },
        mass: 1,
      },
      {
        id: `${ID_PREFIXES.BALL}-3`,
        radius: 24,
        color: '#FF7D00',
        label: '橙1',
        initialPosition: { x: 400, y: 350 },
        initialVelocity: { x: -100, y: -250 },
        mass: 0.9,
      },
      {
        id: `${ID_PREFIXES.BALL}-4`,
        radius: 24,
        color: '#722ED1',
        label: '紫1',
        initialPosition: { x: 250, y: 280 },
        initialVelocity: { x: 200, y: -150 },
        mass: 0.9,
      },
    ],
  },
  {
    id: 'level-full-settlement',
    name: '关卡三：完整结算',
    description: '完整的多球碰撞场景，标注所有异常碰撞，生成完整的结算报告。',
    type: 'full_settlement',
    duration: 30,
    targetAnnotations: 5,
    hint: '提示：仔细观察每次碰撞，标注出边界误判、漏标、重复标注等各种异常情况。',
    initialBalls: [
      {
        id: `${ID_PREFIXES.BALL}-1`,
        radius: 26,
        color: '#F53F3F',
        label: '红方1',
        initialPosition: { x: 100, y: 100 },
        initialVelocity: { x: 400, y: 300 },
        mass: 1,
      },
      {
        id: `${ID_PREFIXES.BALL}-2`,
        radius: 26,
        color: '#165DFF',
        label: '蓝方1',
        initialPosition: { x: 650, y: 150 },
        initialVelocity: { x: -350, y: 250 },
        mass: 1,
      },
      {
        id: `${ID_PREFIXES.BALL}-3`,
        radius: 22,
        color: '#00B42A',
        label: '绿方1',
        initialPosition: { x: 200, y: 380 },
        initialVelocity: { x: 300, y: -200 },
        mass: 0.85,
      },
      {
        id: `${ID_PREFIXES.BALL}-4`,
        radius: 22,
        color: '#FF7D00',
        label: '橙方1',
        initialPosition: { x: 550, y: 350 },
        initialVelocity: { x: -250, y: -180 },
        mass: 0.85,
      },
      {
        id: `${ID_PREFIXES.BALL}-5`,
        radius: 30,
        color: '#722ED1',
        label: '紫方1',
        initialPosition: { x: 380, y: 220 },
        initialVelocity: { x: 150, y: 200 },
        mass: 1.3,
      },
      {
        id: `${ID_PREFIXES.BALL}-6`,
        radius: 20,
        color: '#F7BA1E',
        label: '黄方1',
        initialPosition: { x: 450, y: 100 },
        initialVelocity: { x: -180, y: 280 },
        mass: 0.7,
      },
    ],
  },
];

export function getLevelById(id: string): Level | undefined {
  return LEVELS.find(level => level.id === id);
}

export function getLevelByType(type: Level['type']): Level | undefined {
  return LEVELS.find(level => level.type === type);
}
