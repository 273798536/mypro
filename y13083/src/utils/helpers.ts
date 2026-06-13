export const sourceLabels: Record<string, string> = {
  cad_old: 'CAD旧版',
  normal: '正常记录',
  verbal: '口头备注',
};

export const sourceColors: Record<string, string> = {
  cad_old: '#94a3b8',
  normal: '#10b981',
  verbal: '#fbbf24',
};

export const typeLabels: Record<string, string> = {
  tank: '储罐',
  pipe: '管线',
  valve: '阀门',
  storage: '仓储区',
};

export function formatNow(): string {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}
