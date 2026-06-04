import type { ColorRule, TankStatus, FriendlyMessageKey } from '@/types';

export const COLOR_RULES: Record<TankStatus, ColorRule> = {
  normal: {
    status: 'normal',
    color: '#27AE60',
    label: '数据正常',
    description: '该展缸数据完整、格式规范，符合地图编辑要求。',
    handling: '可直接使用，无需额外处理。'
  },
  warning: {
    status: 'warning',
    color: '#F39C12',
    label: '补录数据',
    description: '该数据为后期补录，原始档案中缺失，来源可能是工作笔记或口头记录。',
    handling: '建议核对原始测量记录，如有条件可现场复测确认。'
  },
  error: {
    status: 'error',
    color: '#E74C3C',
    label: '数据异常',
    description: '该数据存在明显问题，可能是单位缺失、比例尺错误或数值超出合理范围。',
    handling: '必须修正后才能使用。请查找原始资料或联系数据提交人核实。'
  },
  recovered: {
    status: 'recovered',
    color: '#48C9B0',
    label: '已修正',
    description: '该数据曾存在问题，现已按照处理意见完成修正。',
    handling: '可正常使用，建议在备注中保留修正记录以便追溯。'
  }
};

export const FRIENDLY_MESSAGES: Record<FriendlyMessageKey, string> = {
  missingUnit: '该展缸数据未标注长度单位，请核实原始测量记录后补充填写。常见单位包括厘米(cm)、米(m)等。',
  wrongScale: '当前比例尺设置与原始资料不符。原始图纸使用1:100比例尺（图上1厘米代表实际1米），误设为1:500会导致展缸尺寸被错误放大5倍。',
  supplementData: '此条记录为2024年3月补录，原2019版档案中缺失该展缸信息。',
  correctedData: '此条记录已根据原始测量照片完成修正，修正前数据存在单位缺失问题。',
  normalData: '此条记录来源于2019年正式验收档案，数据完整规范。',
  offlineAsset: '相关原始图纸为纸质档案，目前存放于办公楼B栋3层资料室302柜第5格，如需查阅请联系档案管理员。'
};

export const STATUS_COLOR_MAP: Record<TankStatus, string> = {
  normal: '#27AE60',
  warning: '#F39C12',
  error: '#E74C3C',
  recovered: '#48C9B0'
};
