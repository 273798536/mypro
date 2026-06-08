import type { BoundaryScene } from '@/types';

export const BOUNDARY_SCENES: BoundaryScene[] = [
  {
    id: 'scene-delay-01',
    name: '切片延迟错位',
    description:
      '点云帧到达滞后，截面切在了前一帧的位置。实际第10帧的截面结果被第9帧数据污染，导致截面积计算偏小约 18%。若未修正将直接误判为"截面缩小异常"。',
    triggerFrame: 10,
    type: 'delay',
    expectedFix: {
      timeOffset: 280,
      positionY: 0.12,
    },
    consequence:
      '修正前截面积 ≈ 4.82，判定为异常收缩；修正后截面积 ≈ 5.91，判定为正常波动。结论完全相反。',
    changesResult: true,
  },
  {
    id: 'scene-skip-01',
    name: '跳帧导致误判',
    description:
      '第 18 帧被系统丢弃（网络丢包），但截面计算仍按帧号推进。关键的高密度薄结构恰好位于被跳过的帧中，导致"结构缺失"的错误结论。',
    triggerFrame: 18,
    type: 'skip',
    expectedFix: {
      thickness: 0.55,
      timeOffset: -100,
    },
    consequence:
      '修正前截面点数 47 且无薄结构特征，判定"结构断裂"；修正后截面点数 132，含完整薄结构，判定正常。',
    changesResult: true,
  },
  {
    id: 'scene-offset-01',
    name: '双源数据偏移',
    description:
      '点云数据源与剖面图参考系存在标定偏差（Y 轴方向 -0.22），截面切在空区域导致截面特征丢失。常见于多传感器联采时的时间戳漂移。',
    triggerFrame: 25,
    type: 'offset',
    expectedFix: {
      positionY: -0.22,
      normalY: 0.96,
      normalZ: 0.28,
    },
    consequence:
      '修正前截面仅 11 点（疑似空洞），判定"严重缺陷"；修正后截面 98 点且质心位置正确，判定为标定偏差导致的假阳性。',
    changesResult: true,
  },
];

export function getSceneAtFrame(frame: number): BoundaryScene | null {
  return BOUNDARY_SCENES.find((s) => s.triggerFrame === frame) || null;
}

export const USERS = [
  { name: '张工-运维', role: 'operator' as const, avatar: 'Z' },
  { name: '李主管', role: 'reviewer' as const, avatar: 'L' },
  { name: '王观察员', role: 'observer' as const, avatar: 'W' },
];

export const ACTION_LABELS: Record<string, string> = {
  param_change: '参数变更',
  outlier_mark: '标记离群点',
  outlier_approve: '复核通过',
  outlier_reject: '复核驳回',
  frame_skip: '跳帧处理',
  sync_fix: '时间同步修正',
  game_start: '开始游戏',
  game_pause: '暂停游戏',
  game_finish: '结算本局',
};
