import type { Anomaly } from '../types';

export const mockAnomalies: Anomaly[] = [
  {
    id: 'anom-001',
    type: 'version_override',
    severity: 'critical',
    status: 'open',
    entityType: 'preset_version',
    entityId: 'pv-serum-bass-200',
    entityName: 'Serum贝斯预设 v2.0.0',
    description: '新版本v2.0.0覆盖了现有版本v1.1.0，波表和调制路由发生重大变化',
    affectedItems: [
      { id: 'item-001', type: 'snapshot', name: '学生A - 贝斯音色修改尝试', description: '基于旧版本v1.0.0创建的快照' },
      { id: 'item-002', type: 'assignment', name: '贝斯音色设计练习 - Dubstep风格', description: '学生A的作业，已批改完成' },
      { id: 'item-003', type: 'snapshot', name: '学生A - 贝斯音色二次修改', description: '基于新版本v2.0.0创建的快照' },
    ],
    impactExplanation: '此次版本覆盖影响了1个已批改的作业和2个快照。已基于旧版本完成的作业可能与新版本音色特征不一致，建议教师在评估时注意版本差异。学生需要重新基于新版本完成后续练习。',
    detectedAt: Date.now() - 86400000 * 5,
    detectedBy: 'system',
  },
  {
    id: 'anom-002',
    type: 'version_override',
    severity: 'warning',
    status: 'acknowledged',
    entityType: 'preset_version',
    entityId: 'pv-massive-lead-101',
    entityName: 'Massive主音预设 v1.0.1',
    description: '修复版本v1.0.1覆盖了v1.0.0，主要调整了包络设置',
    affectedItems: [
      { id: 'item-004', type: 'snapshot', name: '学生B - 主音音色过度调整', description: '基于旧版本v1.0.0创建的快照' },
      { id: 'item-005', type: 'assignment', name: '主音音色设计练习 - EDM风格', description: '学生B的作业，正在审核中' },
    ],
    impactExplanation: '此次版本覆盖属于问题修复，主要调整了包络的Attack和Release参数。虽然参数有变化，但音色整体特征保持一致。已通知学生B注意版本更新，建议在重新提交时使用新版本。',
    detectedAt: Date.now() - 86400000 * 20,
    detectedBy: 'system',
    resolvedAt: Date.now() - 86400000 * 19,
    resolverId: 'teacher-002',
    resolutionNotes: '已确认此覆盖为必要修复，已通知相关学生。',
  },
  {
    id: 'anom-003',
    type: 'parameter_out_of_bounds',
    severity: 'warning',
    status: 'open',
    entityType: 'snapshot',
    entityId: 'snap-002',
    entityName: '学生B - 主音音色过度调整',
    description: '参数Osc 1 Detune值为120，超出范围[0, 100]',
    affectedItems: [
      { id: 'item-006', type: 'parameter', name: 'Osc 1 Detune', path: 'Oscillators/Osc1/Detune', description: '值120 > 最大值100，超出20%' },
    ],
    impactExplanation: 'Detune参数超出合理范围会导致音高严重偏离，破坏和声关系。在合奏场景中，这个音色会与其他乐器产生严重的不协和音程，影响整体音乐效果。同时过大的detune也可能导致声音浑浊不清。',
    detectedAt: Date.now() - 86400000 * 8,
    detectedBy: 'system',
  },
  {
    id: 'anom-004',
    type: 'parameter_out_of_bounds',
    severity: 'warning',
    status: 'open',
    entityType: 'snapshot',
    entityId: 'snap-002',
    entityName: '学生B - 主音音色过度调整',
    description: '参数Filter Cutoff值为25000Hz，超出范围[20, 20000]Hz',
    affectedItems: [
      { id: 'item-007', type: 'parameter', name: 'Filter Cutoff', path: 'Filters/Main/Cutoff', description: '值25000Hz > 最大值20000Hz，超出25%' },
    ],
    impactExplanation: '滤波器截止频率设置为25000Hz超出了人耳可听范围（约20Hz-20000Hz），因此在实际听觉上没有效果。但这个无效值会占用不必要的CPU计算资源，在复杂工程中可能导致性能问题。建议设置为18000-20000Hz之间。',
    detectedAt: Date.now() - 86400000 * 8,
    detectedBy: 'system',
  },
  {
    id: 'anom-005',
    type: 'parameter_out_of_bounds',
    severity: 'critical',
    status: 'open',
    entityType: 'snapshot',
    entityId: 'snap-002',
    entityName: '学生B - 主音音色过度调整',
    description: '参数LFO Rate值为-1Hz，低于最小值0.01Hz',
    affectedItems: [
      { id: 'item-008', type: 'parameter', name: 'LFO Rate', path: 'LFOs/Main/Rate', description: '值-1Hz < 最小值0.01Hz，为无效负值' },
    ],
    impactExplanation: 'LFO速率不能为负数，这是一个无效的参数值。合成器可能会将其钳位到0或产生不可预知的行为，导致调制效果异常或无调制。这可能使整个音色设计失效，需要立即修正。建议设置为0.1-10Hz之间以获得明显的调制效果。',
    detectedAt: Date.now() - 86400000 * 8,
    detectedBy: 'system',
  },
  {
    id: 'anom-006',
    type: 'audio_missing',
    severity: 'warning',
    status: 'open',
    entityType: 'assignment',
    entityId: 'assign-003',
    entityName: '鼓组音色调整练习 - Trap风格',
    description: '作业已提交但缺少关联的音频文件',
    affectedItems: [
      { id: 'item-009', type: 'audio', name: '鼓组混音音频', description: '作业要求提交的音频文件缺失' },
      { id: 'item-010', type: 'assignment', name: '鼓组音色调整练习 - Trap风格', description: '无法进行完整的音频质量评估' },
    ],
    impactExplanation: '缺少音频文件使得教师无法评估学生的实际混音成果和音色在音乐语境中的效果。参数快照只能证明参数设置正确，但无法验证最终的听觉效果。建议提醒学生C补充提交音频文件后再进行评审。',
    detectedAt: Date.now() - 86400000 * 3,
    detectedBy: 'system',
  },
];

export const getAnomalyById = (id: string): Anomaly | undefined => {
  return mockAnomalies.find(a => a.id === id);
};

export const getAnomaliesByType = (type: string): Anomaly[] => {
  return mockAnomalies.filter(a => a.type === type);
};

export const getAnomaliesBySeverity = (severity: string): Anomaly[] => {
  return mockAnomalies.filter(a => a.severity === severity);
};

export const getAnomaliesByStatus = (status: string): Anomaly[] => {
  return mockAnomalies.filter(a => a.status === status);
};

export const getAnomaliesByEntityId = (entityId: string): Anomaly[] => {
  return mockAnomalies.filter(a => a.entityId === entityId);
};
