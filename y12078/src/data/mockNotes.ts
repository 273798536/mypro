import type { DoctorNote } from '@/types'

export const mockNotes: DoctorNote[] = [
  {
    id: 'note-001',
    author: '张医生',
    timestamp: '2024-03-16 09:30:00',
    content: '骨折类型为Evans-Jensen II型，建议使用DHS固定，注意颈干角保持130°',
    relatedImplantId: 'impl-001',
    relatedAnnotationId: 'ann-003',
    source: '术前讨论记录 2024-03-16',
  },
  {
    id: 'note-002',
    author: '李工程师',
    timestamp: '2024-03-16 14:20:00',
    content: 'XL型号侧板超出可用长度，已标记尺寸越界，请确认是否改用标准型',
    relatedImplantId: 'impl-002',
    relatedAnnotationId: null,
    source: '器械匹配检查单 2024-03-16',
  },
  {
    id: 'note-003',
    author: '王医生',
    timestamp: '2024-03-17 10:15:00',
    content: '空心螺钉需避开股骨距禁区，进钉角度建议外展10°，前倾15°',
    relatedImplantId: 'impl-004',
    relatedAnnotationId: 'ann-006',
    source: '术前规划备注 2024-03-17',
  },
  {
    id: 'note-004',
    author: '李工程师',
    timestamp: '2024-03-17 11:00:00',
    content: '⚠️ 左右侧核对：impl-003为左侧板，本例为右侧骨折，已标记侧别混淆',
    relatedImplantId: 'impl-003',
    relatedAnnotationId: null,
    source: '器械匹配检查单 2024-03-17',
  },
]
