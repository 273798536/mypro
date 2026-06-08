import type { RiskLevel, AnomalyType, NextAction } from '@shared/types';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, FileWarning } from 'lucide-react';

export const riskLevelInfo: Record<RiskLevel, { label: string; color: string; bg: string; icon: any }> = {
  normal: { label: '正常', color: 'text-safety-green', bg: 'bg-safety-green/15 border-safety-green/30', icon: CheckCircle2 },
  warning: { label: '警告', color: 'text-safety-yellow', bg: 'bg-safety-yellow/15 border-safety-yellow/30', icon: AlertTriangle },
  error: { label: '错误', color: 'text-safety-red', bg: 'bg-safety-red/15 border-safety-red/30', icon: AlertCircle },
  pending_material: { label: '待补材料', color: 'text-safety-orange', bg: 'bg-safety-orange/15 border-safety-orange/30', icon: Clock },
};

export const anomalyTypeInfo: Record<Exclude<AnomalyType, null>, { label: string; desc: string }> = {
  time_mismatch: { label: '时间参数不符', desc: '记录的起止时间与风险评估有效期不一致' },
  risk_mismatch: { label: '风险备注不符', desc: '风险等级标注与实际角度数据存在偏差' },
  occlusion_misread: { label: '透明遮挡误读', desc: '剖切图中绳索与透明层重叠率过高' },
  section_missing: { label: '剖面数据缺失', desc: '剖切帧数量不足或部分帧数据缺失' },
};

export const nextActionInfo: Record<Exclude<NextAction, null>, { label: string; desc: string; color: string; steps: string[] }> = {
  fill_material: {
    label: '补材料',
    desc: '当前数据材料不完整，需要补充证据后再复核',
    color: 'safety-orange',
    steps: [
      '根据缺失项补录对应剖切帧或原始数据',
      '确保每帧剖切图分辨率与清晰度达标',
      '补录后系统自动重新校验，状态随之更新',
    ],
  },
  adjust_criteria: {
    label: '改口径',
    desc: '当前参数或标注口径有误，需要调整记录内容',
    color: 'safety-green',
    steps: [
      '核对原始记录，确认正确的时间参数与风险等级',
      '在修正面板中修改对应字段并填写变更原因',
      '保存后自动生成新版本，历史记录可追溯',
    ],
  },
};

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export { FileWarning };
