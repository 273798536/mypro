import type { CollisionIssue } from '@/types'

export const mockIssues: CollisionIssue[] = [
  {
    id: 'issue-001',
    type: 'size_out_of_bound',
    severity: 'critical',
    implantId: 'impl-002',
    annotationId: null,
    description: '侧板长度(135mm)超出髓腔可用长度(110mm)，远端螺钉孔位于皮质薄弱区',
    explanation: '产品目录标注适用股骨干长度≥120mm，当前CT测量可用长度仅110mm。建议改用标准型(95mm)或加用单皮质锁定螺钉辅助固定。',
  },
  {
    id: 'issue-002',
    type: 'side_mismatch',
    severity: 'critical',
    implantId: 'impl-003',
    annotationId: null,
    description: '选用了左侧(135°)板，但病例为右侧骨折',
    explanation: 'DHS钢板有明确的左右侧区分，左侧板的颈干角指向与右侧相反。将左侧板植入右侧会导致螺钉进入股骨头的位置偏前下，降低把持力，增加切割风险。请立即更换为右侧型号 DHS-135-R。',
  },
  {
    id: 'issue-003',
    type: 'forbidden_zone_collision',
    severity: 'warning',
    implantId: 'impl-004',
    annotationId: 'ann-006',
    description: '空心螺钉尖端距股骨距禁区仅2.1mm，低于安全阈值5mm',
    explanation: 'CT骨窗测量显示螺钉尖端位于股骨距后方皮质薄弱区2.1mm处。该区域皮质厚度不足1mm，螺钉可能穿出皮质。建议调整进钉角度，使尖端向内上方偏移≥5mm，或改用短一号(55mm)螺钉。',
  },
]
