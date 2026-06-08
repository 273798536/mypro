import type { ImportBatch } from '@/types';
import { uid } from '@/utils/formatters';

export const mockBatches: ImportBatch[] = [
  {
    id: uid('b_'),
    name: 'B2026-06-01-音乐厅A区-声线测量',
    importedAt: '2026-06-01T10:23:00',
    importedBy: '李工',
    recordCount: 8,
  },
  {
    id: uid('b_'),
    name: 'B2026-06-05-音乐厅B区-补充测量',
    importedAt: '2026-06-05T14:40:00',
    importedBy: '王工',
    recordCount: 6,
  },
];
