import { Annotation } from '@/types';

export const MOCK_ANNOTATIONS: Annotation[] = [
  {
    id: 'anno-1',
    levelId: 'level-1',
    type: 'curve',
    color: '#2DD4BF',
    points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 4 }],
    status: 'valid',
    note: '标准抛物线绘制',
    sourceMaterial: '教材第三章第2节',
    issues: []
  },
  {
    id: 'anno-2',
    levelId: 'level-1',
    type: 'region',
    color: '#F59E0B',
    points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 4 }, { x: 0, y: 4 }],
    status: 'pending_review',
    note: '',
    sourceMaterial: '练习册P23',
    issues: [{
      type: 'empty_value',
      description: '备注为空，请补充说明涂色区域的含义',
      sourceReference: '标注草稿第3行'
    }]
  }
];
