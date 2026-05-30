import { ErrorType, ProblemType, ToolType } from '@/types/game';

export const problemExplanations: Record<ProblemType, string> = {
  noise: '噪声是持续的背景杂音，通常由唱片磨损或灰尘积累造成。听起来像"沙沙"声，需要用噪声消除工具处理。',
  pop: '爆音是瞬间的尖锐爆破声，通常由唱片划痕或污点引起。听起来像"啪"的一声，需要用爆音修复工具处理。',
  drift: '节拍漂移是指音乐节奏与标准节拍线不同步。表现为节拍忽快忽慢，需要用节拍校准工具在正确时机调整。',
};

export const toolDescriptions: Record<ToolType, { name: string; description: string; icon: string }> = {
  removeNoise: {
    name: '消除噪声',
    description: '用于处理持续的背景杂音',
    icon: 'volume-x',
  },
  fixPop: {
    name: '修复爆音',
    description: '用于处理瞬间的尖锐爆破声',
    icon: 'zap',
  },
  calibrateBeat: {
    name: '校准节拍',
    description: '用于调整与节拍线不同步的节奏',
    icon: 'clock',
  },
};

export const errorExplanations: Record<ErrorType, { title: string; message: string; impact: string }> = {
  wrongTool: {
    title: '用错工具',
    message: '每种工具只能处理特定类型的问题。噪声需要"消除噪声"工具，爆音需要"修复爆音"工具，节拍问题需要"校准节拍"工具。',
    impact: '扣10分',
  },
  missedOriginal: {
    title: '⚠️ 严重错误：误删原声',
    message: '这里是正常的音乐内容！不是所有区域都有问题。仔细观察唱片轨道上的标记：灰色斑点是噪声，红色星号是爆音，黄色箭头表示节拍偏移。没有标记的地方就是原声，不要随意修改！',
    impact: '扣20分 - 这是最严重的错误！',
  },
  beatDrift: {
    title: '节拍漂移',
    message: '校准节拍的时机不对！需要在节拍线与黄色箭头标记完全对齐的瞬间点击校准。太早或太晚都会造成新的节拍漂移。',
    impact: '扣15分',
  },
  noProblem: {
    title: '无问题区域',
    message: '这个位置没有需要修复的问题。请仔细观察唱片上的标记，只在有问题的地方操作。',
    impact: '扣5分',
  },
};

export const getSuccessMessage = (problemType: ProblemType): string => {
  const messages: Record<ProblemType, string> = {
    noise: '正确！噪声已成功消除。持续的背景杂音就是这样处理的。',
    pop: '正确！爆音已成功修复。瞬间的尖锐声音需要用专门的修复工具。',
    drift: '正确！节拍已校准。时机把握得很好，节奏恢复同步了。',
  };
  return messages[problemType];
};

export const getWrongToolExplanation = (usedTool: ToolType, actualProblem: ProblemType): string => {
  const toolName = toolDescriptions[usedTool].name;
  const problemName = problemExplanations[actualProblem];
  return `你使用了【${toolName}】，但这是${actualProblem === 'noise' ? '噪声' : actualProblem === 'pop' ? '爆音' : '节拍漂移'}问题。${problemName}`;
};
