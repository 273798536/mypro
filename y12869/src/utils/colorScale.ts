export function depthToColor(depth: number, minDepth = -5, maxDepth = 25): [number, number, number] {
  const clamped = Math.max(minDepth, Math.min(maxDepth, depth));
  const t = (clamped - minDepth) / (maxDepth - minDepth);

  if (depth < 0) {
    return [0.93, 0.27, 0.27];
  }
  if (t < 0.2) {
    const s = t / 0.2;
    return lerpRGB([0.07, 0.15, 0.25], [0.11, 0.31, 0.55], s);
  }
  if (t < 0.5) {
    const s = (t - 0.2) / 0.3;
    return lerpRGB([0.11, 0.31, 0.55], [0.16, 0.57, 0.68], s);
  }
  if (t < 0.8) {
    const s = (t - 0.5) / 0.3;
    return lerpRGB([0.16, 0.57, 0.68], [0.96, 0.77, 0.26], s);
  }
  const s = (t - 0.8) / 0.2;
  return lerpRGB([0.96, 0.77, 0.26], [0.91, 0.33, 0.23], s);
}

export function depthColorToHex(depth: number, min?: number, max?: number): string {
  const [r, g, b] = depthToColor(depth, min, max);
  return rgbToHex(r, g, b);
}

function lerpRGB(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const DEPTH_LEGEND = [
  { label: '< 0 m (异常)', color: '#EF4444', depth: 0 },
  { label: '0 – 4 m', color: '#1C3859', depth: 2 },
  { label: '4 – 10 m', color: '#2C6FB4', depth: 7 },
  { label: '10 – 15 m', color: '#2A91AD', depth: 12 },
  { label: '15 – 20 m', color: '#F5C542', depth: 17 },
  { label: '> 20 m', color: '#E8543B', depth: 22 },
];

export function anomalyTypeToLabel(type: string): string {
  const map: Record<string, string> = {
    negative_depth: '深度负值',
    water_quality_mismatch: '水质-养殖对账不一致',
    trajectory_drift: '轨迹漂移',
    tide_delayed: '潮汐表延迟',
    log_gap: '养殖日志缺口',
    other: '其他异常',
  };
  return map[type] || type;
}

export function anomalySeverityToLabel(sev: string): string {
  const map: Record<string, string> = {
    red: '严重',
    orange: '较重',
    yellow: '一般',
    blue: '提示',
  };
  return map[sev] || sev;
}

export function disposalDirectionToLabel(d: string): string {
  return d === 'supplement_material' ? '补材料' : '改口径';
}

export function anomalyStatusToLabel(s: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    reviewing: '待复核',
    closed: '已闭环',
  };
  return map[s] || s;
}
