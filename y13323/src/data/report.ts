import type { ReplayReport } from '@/types';

export const mockReplayReport: ReplayReport = {
  id: 'report-001',
  title: '作文批改误判回放报告 - 三年级语文期末',
  generatedAt: '2024-01-18T16:00:00Z',
  conclusionImpact: {
    originalConclusion: '三年级期末作文优秀率45%，整体表现良好',
    newConclusion: '三年级期末作文优秀率32%，需加强写景类作文训练',
    changeReason: '撤回记录#001导致23份样本重新评分，加上v2.2模型bug回溯，优秀率下降13个百分点',
    evidenceChain: [
      {
        id: 'ev-1',
        type: 'withdrawal',
        title: '撤回记录#001：评分校准',
        description: '发现写景类作文系统性偏高，撤回23份样本',
        timestamp: '2024-01-18T10:00:00Z',
      },
      {
        id: 'ev-2',
        type: 'sample_change',
        title: '样本重新评分',
        description: '23份撤回样本平均降低3.2分',
        timestamp: '2024-01-18T11:30:00Z',
      },
      {
        id: 'ev-3',
        type: 'threshold_change',
        title: '优秀线阈值调整',
        description: '优秀线从80分提高到85分',
        timestamp: '2024-01-12T09:00:00Z',
      },
      {
        id: 'ev-4',
        type: 'human_review',
        title: '人工复核调整',
        description: '王老师复核5份边缘样本，2份降档',
        timestamp: '2024-01-17T14:00:00Z',
      },
    ],
  },
  grayscaleBreakdown: {
    sampleChange: {
      contribution: 45,
      description: '样本变化是最主要因素，撤回的23份样本中11份从优秀降为良好',
      details: [
        '写景类作文平均分下降4.1分',
        '11份样本从优秀降为良好',
        '3份样本从良好降为及格',
        '新增5份疑似泄漏样本',
      ],
    },
    thresholdChange: {
      contribution: 30,
      description: '优秀线从80分提高到85分，导致7份样本跨档',
      details: [
        '优秀线：80 → 85分',
        '良好线：60 → 65分',
        '7份样本从优秀降为良好',
        '4份样本从及格降为不及格',
      ],
    },
    humanReview: {
      contribution: 25,
      description: '人工复核修正了算法对部分边缘样本的误判',
      details: [
        '共复核15份边缘样本',
        '3份算法低估的作文提分',
        '2份算法高估的作文降分',
        '修正了1份样本的内容深度评估',
      ],
    },
  },
  actionGuide: {
    toSupplement: [
      {
        id: 'act-1',
        title: '补充sample-001的来源证明',
        description: '疑似训练集泄漏，需要提供该样本的原始采集渠道和时间',
        priority: 'high',
        relatedSampleId: 'sample-001',
      },
      {
        id: 'act-2',
        title: '补充四年级二班学生信息表',
        description: '撤回记录#002涉及3份学号错误样本，需对照花名册修正',
        priority: 'high',
      },
      {
        id: 'act-3',
        title: '补充v2.3模型的测试报告',
        description: '新模型修复修辞手法识别bug，需提供回归测试数据',
        priority: 'medium',
      },
    ],
    toApprove: [
      {
        id: 'act-4',
        title: 'sample-003可放行',
        description: '内容完整、评分合理、无泄漏嫌疑，已通过两轮人工复核',
        priority: 'low',
        relatedSampleId: 'sample-003',
      },
      {
        id: 'act-5',
        title: '五年级样本整体放行',
        description: '五年级样本整体质量稳定，无撤回记录和泄漏预警',
        priority: 'low',
      },
      {
        id: 'act-6',
        title: '撤回记录#002可结案',
        description: '学生信息已修正，不影响评分结论，可标记为已解决',
        priority: 'medium',
      },
    ],
    toConfirm: [
      {
        id: 'act-7',
        title: '确认sample-005的评分标准',
        description: '处于优秀/良好边缘，建议人工再复核一次',
        priority: 'medium',
        relatedSampleId: 'sample-005',
      },
      {
        id: 'act-8',
        title: '确认优秀线85分是否合理',
        description: '调整后优秀率下降明显，需确认是否符合教学预期',
        priority: 'high',
      },
      {
        id: 'act-9',
        title: '确认sample-004是否需要重写',
        description: '目前判定为驳回，需确认是否给学生修改机会',
        priority: 'medium',
        relatedSampleId: 'sample-004',
      },
    ],
  },
};
