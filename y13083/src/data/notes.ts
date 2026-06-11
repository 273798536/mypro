import type { ManualNote } from '@/types';

export const mockNotes: ManualNote[] = [
  {
    id: 'note-001',
    objectId: 'tank-002',
    content: '上周巡检发现密封圈有轻微泄漏，已上报采购部，预计下周更换',
    author: '阿宁',
    createdAt: '2026-06-08 14:30',
  },
  {
    id: 'note-002',
    objectId: 'pipe-002',
    content: '焊缝位置在1.5米高度处，需搭脚手架作业，已联系维修班',
    author: '阿宁',
    createdAt: '2026-06-10 09:15',
  },
  {
    id: 'note-003',
    objectId: 'pipe-003-old',
    content: '这条旧管线2023年就拆了，老CAD图没删干净，别当新管线看',
    author: '阿宁',
    createdAt: '2026-06-05 16:45',
  },
];
