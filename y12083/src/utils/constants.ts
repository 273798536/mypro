export const GIMBAL_LOCK_THRESHOLD = 85;
export const GIMBAL_LOCK_UPPER_BOUND = 95;

export const ANGLE_RANGE: [number, number] = [-180, 180];
export const ANGLE_WARNING_RANGE: [number, number] = [-360, 360];

export const AXIS_COLORS = {
  pitch: '#ff4d4f',
  yaw: '#52c41a',
  roll: '#1890ff',
} as const;

export const AXIS_NAMES = {
  pitch: '俯仰角',
  yaw: '偏航角',
  roll: '滚转角',
} as const;

export const WARNING_COLORS = {
  gimbal_lock: '#ff4d4f',
  angle_out_of_range: '#faad14',
  axis_reversed: '#fadb14',
  trend_reversed: '#e8684a',
  missing_data: '#faad14',
  late_axis: '#faad14',
} as const;

export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

export const DEFAULT_SPACECRAFT = {
  name: '示例航天器',
  dimensions: {
    length: 4,
    width: 2,
    height: 1.5,
  },
  remark: '这是一个用于教学演示的航天器模型',
};

export const SCENE_CONFIG = {
  cameraPosition: [8, 6, 8] as [number, number, number],
  fov: 50,
  near: 0.1,
  far: 1000,
  axisLength: 3,
  axisRadius: 0.05,
};
