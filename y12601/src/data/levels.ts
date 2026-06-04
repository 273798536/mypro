import type { StainingLevel } from '@/types/staining'
import { PALETTE_COLORS } from './colors'

const LEVELS: StainingLevel[] = [
  {
    id: 'level_basic',
    name: '基础涂色',
    description: '练习基本的细胞切片涂色操作，熟悉调色板和网格交互',
    gridSize: 6,
    correctPattern: [
      [0, 0, 1, 1, 0, 0],
      [0, 1, 1, 2, 2, 0],
      [1, 1, 2, 2, 3, 3],
      [1, 2, 2, 3, 3, 0],
      [0, 2, 3, 3, 0, 0],
      [0, 0, 3, 0, 0, 0],
    ],
    boundaryCells: [],
    colorPalette: PALETTE_COLORS,
    scenario: 'basic',
    tips: [
      '选择下方调色板中的颜色，点击网格涂色',
      '紫色对应细胞核(苏木精)，红色对应细胞质(伊红)',
      '绿色对应特殊染色区域',
      '涂完后点击提交查看结果',
    ],
    undoSyncBugs: [],
    snapOffsetCells: [],
  },
  {
    id: 'level_boundary',
    name: '边界失败',
    description: '涂色时注意区域边界，超出边界的涂色会被检测为失败',
    gridSize: 6,
    correctPattern: [
      [0, 1, 1, 1, 0, 0],
      [1, 2, 2, 2, 1, 0],
      [1, 2, 3, 2, 1, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 0],
      [0, 0, 1, 0, 0, 0],
    ],
    boundaryCells: [
      [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5],
    ],
    colorPalette: PALETTE_COLORS,
    scenario: 'boundary',
    tips: [
      '第4行(中间横排)是边界区域，不应涂色',
      '如果给边界区域涂色，将触发边界失败',
      '关闭网格吸附后，涂色更容易"溢出"到边界',
      '提交后可对比吸附开关对命中检测的影响',
    ],
    undoSyncBugs: [],
    snapOffsetCells: [
      { row: 2, col: 3, offsetRow: 3, offsetCol: 3 },
      { row: 4, col: 2, offsetRow: 3, offsetCol: 2 },
      { row: 4, col: 3, offsetRow: 3, offsetCol: 3 },
    ],
  },
  {
    id: 'level_undo',
    name: '撤销与重开',
    description: '体验撤销后状态不同步的边界问题，观察结果如何被改变',
    gridSize: 6,
    correctPattern: [
      [1, 0, 0, 1, 0, 0],
      [0, 2, 0, 2, 0, 0],
      [0, 0, 3, 0, 0, 0],
      [0, 2, 0, 2, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 3, 0],
    ],
    boundaryCells: [],
    colorPalette: PALETTE_COLORS,
    scenario: 'undo',
    tips: [
      '按提示顺序涂色，然后尝试撤销',
      '撤销后观察：某些边界标记或状态可能未正确恢复',
      '重开后部分状态可能残留，影响后续结果',
      '每次撤销同步问题都会实际改变最终判定结果',
    ],
    undoSyncBugs: [
      {
        id: 'bug_boundary_mark',
        triggerStep: 2,
        triggerDescription: '涂色第3行第4列(紫色)后撤销，邻近的第3行第3列边界标记未清除',
        afterUndoState: '第3行第3列仍标记为"已触碰边界"，实际应恢复为未触碰',
        expectedState: '撤销后第3行第3列边界标记应一并恢复',
        resultDifference: '第3行第3列因残留边界标记，命中判定从"正确"变为"边界失败"',
      },
      {
        id: 'bug_color_select',
        triggerStep: 4,
        triggerDescription: '涂色第5行第3列(红色)后撤销，再涂其他颜色，调色板仍显示红色为选中',
        afterUndoState: '调色板显示红色选中，但实际最后操作的颜色已变更',
        expectedState: '撤销后调色板应恢复到上一次有效的颜色选择',
        resultDifference: '后续涂色使用了错误颜色，导致第5行第3列涂色判定从"正确"变为"错误"',
      },
      {
        id: 'bug_snap_residual',
        triggerStep: 6,
        triggerDescription: '切换网格吸附后重开，吸附状态从上一局残留',
        afterUndoState: '重开后网格吸附开关显示关闭，但内部仍为开启状态',
        expectedState: '重开应将网格吸附状态完全重置为默认(关闭)',
        resultDifference: '吸附残留导致第2行第2列的涂色实际命中了第2行第3列，判定结果反转',
      },
    ],
    snapOffsetCells: [
      { row: 1, col: 1, offsetRow: 1, offsetCol: 2 },
      { row: 3, col: 3, offsetRow: 3, offsetCol: 2 },
    ],
  },
]

export default LEVELS
