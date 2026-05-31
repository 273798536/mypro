import type { Case, Clue, Risk, Difficulty } from '@/types';

export const createMockCases = (): Case[] => {
  return [
    {
      id: 'case-1',
      title: '《夜曲》翻唱授权案',
      description: '某音乐人申请翻唱《夜曲》并在平台上线，需要审核授权文件是否有效。',
      correctVerdict: 'reject',
      verdictExplanation: '授权证书已过期，且未提供新的授权协议，应驳回申请。',
      humanVerdictExplanation: '这个案子里，《夜曲》的授权合同在2023年12月31日就已经到期了，相当于你租的房子合同过期了还想继续住，房东没同意那就是违法的。所以必须驳回，不能让翻唱版上线。',
      requiredClueTypes: ['auth_certificate', 'platform_notice', 'song_segment'],
      requiredClueCount: 3,
      clues: [],
      risks: [],
      userVerdict: null,
      isCompleted: false,
      completedAt: null,
    },
    {
      id: 'case-2',
      title: '《夏天的风》采样纠纷案',
      description: '某说唱歌手在新歌中采样了《夏天的风》的旋律，需要判断采样是否合规。',
      correctVerdict: 'reject',
      verdictExplanation: '采样时长15秒，超过合同约定的8秒上限，属于超范围使用，应驳回。',
      humanVerdictExplanation: '这个采样有点贪心了——合同明明说最多只能用8秒，但这位歌手足足用了15秒，超了快一倍。这就像你跟朋友说借100块，结果拿了200块就跑，肯定不行。所以必须驳回，要求重新协商授权。',
      requiredClueTypes: ['sample_record', 'contract', 'song_segment'],
      requiredClueCount: 3,
      clues: [],
      risks: [],
      userVerdict: null,
      isCompleted: false,
      completedAt: null,
    },
    {
      id: 'case-3',
      title: '《后来》同名曲混淆案',
      description: '平台收到两首同名《后来》的上线申请，需要判断是否存在授权混淆。',
      correctVerdict: 'need_more',
      verdictExplanation: '存在两首同名但完全不同的歌曲，当前材料不足以判断授权归属，需要补充两首歌的完整版权证明。',
      humanVerdictExplanation: '这里有个大坑——有两首歌都叫《后来》，一首是刘若英的经典老歌，另一首是新人的原创。现在的材料把两首歌的授权混在一起了，张冠李戴。就像两个同名的人，你拿张三的身份证去给李四办业务，肯定不行。得让他们把两首歌的版权证明分开交上来，才能继续审核。',
      requiredClueTypes: ['song_segment', 'auth_certificate', 'platform_notice'],
      requiredClueCount: 3,
      clues: [],
      risks: [],
      userVerdict: null,
      isCompleted: false,
      completedAt: null,
    },
  ];
};

export const createMockClues = (cases: Case[]): Clue[] => {
  return [
    {
      id: 'clue-1',
      title: '《夜曲》授权证书',
      content: '授权方：杰威尔音乐有限公司\n被授权方：张三\n授权期限：2020年1月1日 - 2023年12月31日\n授权范围：中文翻唱、网络发行',
      type: 'auth_certificate',
      correctCaseId: 'case-1',
      currentCaseId: null,
      triggerRisk: 'risk-1',
      isKeyEvidence: true,
      metadata: { expiryDate: '2023-12-31' },
    },
    {
      id: 'clue-2',
      title: '平台下架通知',
      content: '尊敬的用户，您上传的《夜曲（翻唱版）》因授权问题已被暂时下架，请提供有效授权文件以便重新审核。',
      type: 'platform_notice',
      correctCaseId: 'case-1',
      currentCaseId: null,
      isKeyEvidence: false,
    },
    {
      id: 'clue-3',
      title: '《夜曲》翻唱片段',
      content: '时长：4分25秒\n歌词内容：一群嗜血的蚂蚁...\n编曲风格：钢琴+弦乐重新编配',
      type: 'song_segment',
      correctCaseId: 'case-1',
      currentCaseId: null,
      isKeyEvidence: true,
    },
    {
      id: 'clue-4',
      title: '续签沟通邮件',
      content: '发件人：张三\n收件人：杰威尔版权部\n日期：2024年3月15日\n内容：您好，关于《夜曲》翻唱授权的续签事宜，希望能进一步沟通...',
      type: 'platform_notice',
      correctCaseId: 'case-1',
      currentCaseId: null,
      isKeyEvidence: false,
    },
    {
      id: 'clue-5',
      title: '《夏天的风》采样记录',
      content: '采样作品：《夏天的风》（原唱：温岚）\n采样位置：副歌部分\n采样时长：15秒\n使用方式：循环用于副歌beat',
      type: 'sample_record',
      correctCaseId: 'case-2',
      currentCaseId: null,
      triggerRisk: 'risk-2',
      isKeyEvidence: true,
      metadata: { sampleDuration: 15, maxAllowed: 8 },
    },
    {
      id: 'clue-6',
      title: '采样授权合同',
      content: '合同编号：SAM-2024-0088\n授权采样时长：不超过8秒\n授权费用：按使用时长计算，8秒内5000元\n签署日期：2024年2月20日',
      type: 'contract',
      correctCaseId: 'case-2',
      currentCaseId: null,
      isKeyEvidence: true,
    },
    {
      id: 'clue-7',
      title: '《夏风吹》说唱片段',
      content: '时长：3分18秒\n副歌部分：含有《夏天的风》旋律采样\n歌词内容：原创说唱词',
      type: 'song_segment',
      correctCaseId: 'case-2',
      currentCaseId: null,
      isKeyEvidence: true,
    },
    {
      id: 'clue-8',
      title: '版税结算单',
      content: '作品名称：《夏风吹》\n采样使用费：已支付5000元（8秒标准）\n结算日期：2024年3月1日',
      type: 'contract',
      correctCaseId: 'case-2',
      currentCaseId: null,
      isKeyEvidence: false,
    },
    {
      id: 'clue-9',
      title: '《后来》（刘若英版）片段',
      content: '时长：5分36秒\n歌词开头：后来，我总算学会了如何去爱...\n版权归属：滚石唱片',
      type: 'song_segment',
      correctCaseId: 'case-3',
      currentCaseId: null,
      isKeyEvidence: true,
      metadata: { artist: '刘若英', version: 'original' },
    },
    {
      id: 'clue-10',
      title: '《后来》（新人版）片段',
      content: '时长：4分12秒\n歌词开头：后来的我们，走散在人海...\n版权归属：独立音乐人李四',
      type: 'song_segment',
      correctCaseId: 'case-3',
      currentCaseId: null,
      triggerRisk: 'risk-3',
      isKeyEvidence: true,
      metadata: { artist: '李四', version: 'new' },
    },
    {
      id: 'clue-11',
      title: '混淆授权证书',
      content: '授权作品：《后来》\n被授权方：某音乐平台\n注意：证书未明确标注具体版本，两首同名歌曲均提交了此证书作为授权证明。',
      type: 'auth_certificate',
      correctCaseId: 'case-3',
      currentCaseId: null,
      isKeyEvidence: true,
    },
    {
      id: 'clue-12',
      title: '平台审核备注',
      content: '审核员备注：两首《后来》同时提交上线申请，授权材料存在混淆，请版权部门协助甄别。',
      type: 'platform_notice',
      correctCaseId: 'case-3',
      currentCaseId: null,
      isKeyEvidence: false,
    },
  ];
};

export const createMockRisks = (): Risk[] => {
  return [
    {
      id: 'risk-1',
      type: 'auth_expired',
      title: '授权过期风险',
      description: '《夜曲》的翻唱授权已于2023年12月31日到期，当前没有有效的授权文件。',
      triggerClueId: 'clue-1',
      caseId: 'case-1',
      nextStep: '驳回上线申请，要求申请人提供新的授权协议或与版权方重新协商授权。',
      isDiscovered: false,
      discoveredAt: null,
    },
    {
      id: 'risk-2',
      type: 'sample_exceed',
      title: '采样超限风险',
      description: '实际采样时长15秒，超过合同约定的8秒上限，属于超范围使用。',
      triggerClueId: 'clue-5',
      caseId: 'case-2',
      nextStep: '驳回上线申请，要求申请人重新协商采样授权，补足超时长部分的版权费用。',
      isDiscovered: false,
      discoveredAt: null,
    },
    {
      id: 'risk-3',
      type: 'name_confusion',
      title: '同名曲混淆风险',
      description: '存在两首同名但完全不同的《后来》，授权材料未明确区分版本，可能导致张冠李戴。',
      triggerClueId: 'clue-10',
      caseId: 'case-3',
      nextStep: '暂缓审核，要求申请人分别提供两首歌曲的完整版权证明，明确授权对应的具体版本。',
      isDiscovered: false,
      discoveredAt: null,
    },
  ];
};

export const initializeGameData = (difficulty: Difficulty) => {
  const cases = createMockCases();
  const allClues = createMockClues(cases);
  const risks = createMockRisks();

  cases.forEach((caseItem) => {
    caseItem.risks = risks.filter((r) => r.caseId === caseItem.id);
  });

  const shuffledClues = [...allClues].sort(() => Math.random() - 0.5);

  return {
    cases,
    clues: allClues,
    unassignedClues: shuffledClues,
    risks,
  };
};
