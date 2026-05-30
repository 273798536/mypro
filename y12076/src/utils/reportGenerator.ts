import { IssueReport, IssueType } from '../types';

const issueTemplates: Record<IssueType, {
  title: string;
  plainTextExplanation: string;
  solution: string;
}> = {
  'pole-reverse-failed': {
    title: '磁极反向未生效',
    plainTextExplanation: `【问题】磁极反向为什么没生效？

简单说：就像你把磁铁翻了个面，但系统"忘了"更新场线的走向。

【为啥会这样】
1. 只点了"反向"按钮，但场线没重新计算
2. 或者3D模型翻了，但磁场计算还用的老数据
3. 就像你把遥控器反过来按，但电视没反应——遥控器变了，电视没收到信号

【怎么解决】
按一下旁边的"🔄 重新生成场线"按钮就好。
如果还不行，刷新页面试试——这相当于把电视重启一下。`,
    solution: '点击"重新生成场线"按钮，或按R键快速重置。如果问题持续，请检查是否有未解决的配置冲突。',
  },
  'sample-too-dense': {
    title: '采样密度过高',
    plainTextExplanation: `【问题】采样过密是什么意思？

简单说：就像你用显微镜看地图，看得太细了，电脑算不过来。

【为啥会这样】
你把"采样密度"拉太高了。本来只需要画100条线，现在要画1000条。
就像老师让你画10个点，你硬要画100个——不是不行，就是手会酸，时间会久。

【怎么解决】
把采样密度滑块往左拉一点，降到5-7之间就好。
教学演示用默认值5就够清楚了，不用追求极致精细。`,
    solution: '将采样密度滑块向左拖动到5-7的推荐范围。系统会自动根据设备性能调整。',
  },
  'field-explosion': {
    title: '场强超出范围',
    plainTextExplanation: `【问题】场强"爆炸"是什么？

简单说：就像你把两块磁铁N极对N极硬挤在一起，中间的磁场太强了，超出了系统能显示的范围。

【为啥会这样】
1. 两个磁体贴太近了
2. 或者磁场强度设得太高
3. 就像往气球里吹气太多——不是真的爆炸，是数值太大超出显示范围了

【怎么解决】
把磁体拉开一点距离，或者把"磁场强度"调低一些。
真实物理世界里，磁场太强也会出问题的哦！`,
    solution: '将磁体之间的距离增大到0.5以上，或降低磁场强度参数。系统已自动截断异常场线。',
  },
};

export const generatePlainTextReport = (issue: IssueReport): string => {
  const template = issueTemplates[issue.type];
  if (!template) return '未知问题，请联系技术支持。';
  
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 问题报告：${template.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${template.plainTextExplanation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 技术详情
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${issue.technicalDetails}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 解决方案
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${template.solution}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 相关记录
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${issue.relatedRecords.map((r, i) => `${i + 1}. ${r}`).join('\n')}
  `;
};

export const createIssueReport = (
  type: IssueType,
  technicalDetails: string,
  relatedRecords: string[] = []
): Omit<IssueReport, 'id'> => {
  const template = issueTemplates[type];
  return {
    type,
    title: template?.title || '未知问题',
    plainTextExplanation: template?.plainTextExplanation || '',
    technicalDetails,
    solution: template?.solution || '请联系技术支持',
    relatedRecords,
  };
};

export const formatValueForDisplay = (value: any): string => {
  if (typeof value === 'object' && value !== null) {
    if ('x' in value && 'y' in value && 'z' in value) {
      return `(x: ${value.x.toFixed(2)}, y: ${value.y.toFixed(2)}, z: ${value.z.toFixed(2)})`;
    }
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};
