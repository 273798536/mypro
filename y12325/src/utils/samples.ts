import { SampleData } from '@/types';

export const sampleData: SampleData[] = [
  {
    id: 'koch-normal',
    name: '科赫雪花（正常）',
    description: '经典的科赫雪花分形，迭代规则正确，展示完美的分形结构',
    category: 'normal',
    config: {
      iterationRule: 'koch',
      initialShape: 'koch',
      colorScheme: {
        stroke: '#0A2463',
        fill: 'transparent',
        background: '#F8F9FA',
      },
      maxIterations: 4,
      zoomLevel: 1,
      note: '标准科赫雪花迭代，分形维度约为1.26',
    },
  },
  {
    id: 'sierpinski-normal',
    name: '谢尔宾斯基三角形（正常）',
    description: '经典的谢尔宾斯基三角形，展示自相似结构',
    category: 'normal',
    config: {
      iterationRule: 'sierpinski',
      initialShape: 'sierpinski',
      colorScheme: {
        stroke: '#2A9D8F',
        fill: 'rgba(42, 157, 143, 0.3)',
        background: '#F8F9FA',
      },
      maxIterations: 5,
      zoomLevel: 1,
      note: '谢尔宾斯基三角形，分形维度约为1.58',
    },
  },
  {
    id: 'cantor-normal',
    name: '康托尔集（正常）',
    description: '经典的康托尔三分集，展示一维分形结构',
    category: 'normal',
    config: {
      iterationRule: 'cantor',
      initialShape: 'cantor',
      colorScheme: {
        stroke: '#F4A261',
        fill: 'transparent',
        background: '#F8F9FA',
      },
      maxIterations: 5,
      zoomLevel: 1,
      note: '康托尔集，分形维度约为0.63',
    },
  },
  {
    id: 'explosion-1',
    name: '迭代爆炸示例',
    description: '缩放因子过大，导致迭代过程中图形迅速膨胀',
    category: 'explosion',
    config: {
      iterationRule: 'scale: 2.5',
      initialShape: 'triangle',
      colorScheme: {
        stroke: '#E63946',
        fill: 'transparent',
        background: '#F8F9FA',
      },
      maxIterations: 10,
      zoomLevel: 1,
      scaleFactor: 2.5,
      note: '此例会触发迭代爆炸检测',
    },
    expectedError: 'explosion',
    expectedMessage: '迭代在第 N 步发生爆炸：图形范围超出限制',
  },
  {
    id: 'explosion-2',
    name: '爆炸关键字检测',
    description: '规则中包含爆炸相关关键字会被提前检测',
    category: 'explosion',
    config: {
      iterationRule: 'explode test',
      initialShape: 'square',
      colorScheme: {
        stroke: '#E63946',
        fill: 'transparent',
        background: '#F8F9FA',
      },
      maxIterations: 5,
      zoomLevel: 1,
      note: '包含"explode"关键字，会触发规则校验失败',
    },
    expectedError: 'invalid_rule',
    expectedMessage: '检测到可能导致迭代爆炸的关键字',
  },
  {
    id: 'invalid-rule-1',
    name: '空规则错误',
    description: '迭代规则为空时的错误处理',
    category: 'invalid_rule',
    config: {
      iterationRule: '',
      initialShape: 'triangle',
      colorScheme: {
        stroke: '#0A2463',
        fill: 'transparent',
        background: '#F8F9FA',
      },
      maxIterations: 5,
      zoomLevel: 1,
      note: '空规则会触发校验失败',
    },
    expectedError: 'invalid_rule',
    expectedMessage: '迭代规则不能为空',
  },
  {
    id: 'invalid-rule-2',
    name: '语法错误规则',
    description: '迭代规则语法不符合规范',
    category: 'invalid_rule',
    config: {
      iterationRule: 'this is an error rule!!!',
      initialShape: 'koch',
      colorScheme: {
        stroke: '#0A2463',
        fill: 'transparent',
        background: '#F8F9FA',
      },
      maxIterations: 5,
      zoomLevel: 1,
      note: '包含"error"关键字，会触发规则校验失败',
    },
    expectedError: 'invalid_rule',
    expectedMessage: '规则包含非法语法',
  },
  {
    id: 'invalid-rule-3',
    name: '格式错误规则',
    description: '不符合迭代规则格式要求的输入',
    category: 'invalid_rule',
    config: {
      iterationRule: '@#$%^&*',
      initialShape: 'koch',
      colorScheme: {
        stroke: '#0A2463',
        fill: 'transparent',
        background: '#F8F9FA',
      },
      maxIterations: 5,
      zoomLevel: 1,
      note: '特殊字符会被检测为非法语法',
    },
    expectedError: 'invalid_rule',
    expectedMessage: '规则语法错误',
  },
  {
    id: 'color-overlap-1',
    name: '颜色重叠警告',
    description: '描边色和填充色过于接近，导致视觉效果不清晰',
    category: 'color_overlap',
    config: {
      iterationRule: 'koch',
      initialShape: 'koch',
      colorScheme: {
        stroke: '#333333',
        fill: '#3a3a3a',
        background: '#F8F9FA',
      },
      maxIterations: 4,
      zoomLevel: 1,
      note: '描边色和填充色过于接近',
    },
    expectedError: 'color_overlap',
    expectedMessage: '描边色和填充色过于接近，可能导致视觉效果不清晰',
  },
  {
    id: 'color-overlap-2',
    name: '相似颜色警告',
    description: '使用相似的深色调，可能影响分形结构的可见性',
    category: 'color_overlap',
    config: {
      iterationRule: 'sierpinski',
      initialShape: 'sierpinski',
      colorScheme: {
        stroke: '#2A9D8F',
        fill: '#2B9E90',
        background: '#F8F9FA',
      },
      maxIterations: 4,
      zoomLevel: 1,
      note: '填充色和描边色几乎相同',
    },
    expectedError: 'color_overlap',
    expectedMessage: '描边色和填充色过于接近，可能导致视觉效果不清晰',
  },
];

export const getSampleById = (id: string): SampleData | undefined => {
  return sampleData.find(s => s.id === id);
};

export const getSamplesByCategory = (category: SampleData['category']): SampleData[] => {
  return sampleData.filter(s => s.category === category);
};
