import type { ExplanationItem } from '@/types';

export const mainExplanations: ExplanationItem[] = [
  {
    id: 'exp-001',
    icon: 'droplets',
    title: '当前水位 22.5m',
    content: '闸室现在的水位，就像浴缸装了约2/3的水。目标是放到27.8m和上游齐平，还差5米多。',
    highlight: '还差 5.3m 齐平',
  },
  {
    id: 'exp-002',
    icon: 'alert-triangle',
    title: '检测到 2 处危险异常',
    content: '红色的都是要立即处理的：右边阀门没完全打开、两边水位差太大。黄色的是需要关注但不紧急的。',
    highlight: '1小时内需响应',
  },
  {
    id: 'exp-003',
    icon: 'gauge',
    title: '充水慢了 16%',
    content: '按设计每小时应该过5闸，现在只能过4闸。一天算下来少过大约8艘船，相当于少收一轮过闸费。',
    highlight: '效率损失 ≈ 16%',
  },
];

export const reviewExplanations: Record<string, string> = {
  repeat: '重复运行不是没事找事——仿真模型有时候对初始条件很敏感，第一次跑和第二次跑结果不一样，说明数据里有不稳定的地方。一定要先跑两次确认结论稳定，再给运维组看。',
  supplement: '补录是给机器擦屁股。传感器掉线、通讯中断都会留下数据缺口，默认插值会把问题掩盖掉。必须把真实缺失的数据手动补回来，或者明确标记"这段不可信"。',
  confirm: '人工确认是最后一道闸门。前面算法跑出来的结论，得有工程师拍板说"我看过了，这个结论站得住脚"。没有签字的结论，运维组有权不认。',
};

export const riskCompareExplanation = '并排看新旧结论的意义：不是为了证明谁对谁错，而是让你一眼看到"改了这一句话，影响了哪几条结论"。给运维组看之前，自己先确认影响范围是不是你预期的那样，别改错了地方还不知道。';
