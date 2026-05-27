"""分块追踪和步骤验证核心逻辑"""

from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional
import numpy as np


@dataclass
class BlockResult:
    """单个分块计算结果"""
    block_idx: Tuple[int, int]
    block_row: int
    block_col: int
    expected: np.ndarray
    student_result: Optional[np.ndarray] = None
    error: Optional[float] = None
    status: str = 'pending'  # pending/correct/incorrect/skipped/mismatch
    message: str = ''
    correction_trace: List[dict] = field(default_factory=list)


@dataclass
class StepRecord:
    """步骤记录"""
    step_number: int
    a_block: Tuple[int, int]
    b_block: Tuple[int, int]
    a_rows: int
    a_cols: int
    b_rows: int
    b_cols: int
    line_number: int
    comment: str = ''
    is_valid: bool = True
    issues: List[str] = field(default_factory=list)
    partial_result: Optional[np.ndarray] = None
    expected_contribution: Optional[np.ndarray] = None


class BlockTracker:
    """分块追踪器 - 追踪分块乘法过程"""

    def __init__(self, matrix_a: np.ndarray, matrix_b: np.ndarray, block_size: int):
        self.A = matrix_a
        self.B = matrix_b
        self.block_size = block_size

        self.a_rows, self.a_cols = matrix_a.shape
        self.b_rows, self.b_cols = matrix_b.shape
        self.c_rows = self.a_rows
        self.c_cols = self.b_cols

        self.a_blocks_row = (self.a_rows + block_size - 1) // block_size
        self.a_blocks_col = (self.a_cols + block_size - 1) // block_size
        self.b_blocks_row = (self.b_rows + block_size - 1) // block_size
        self.b_blocks_col = (self.b_cols + block_size - 1) // block_size
        self.c_blocks_row = self.a_blocks_row
        self.c_blocks_col = self.b_blocks_col

        self.block_results: Dict[Tuple[int, int], BlockResult] = {}
        self.steps: List[StepRecord] = []
        self.step_counter = 0

        self._init_block_results()

    def _init_block_results(self):
        """初始化所有分块结果"""
        for i in range(self.c_blocks_row):
            for j in range(self.c_blocks_col):
                self.block_results[(i, j)] = BlockResult(
                    block_idx=(i, j),
                    block_row=i,
                    block_col=j,
                    expected=self._compute_block(i, j)
                )

    def _get_block(self, matrix: np.ndarray, block_row: int, block_col: int,
                   is_a: bool = True) -> np.ndarray:
        """获取矩阵的指定分块"""
        rows, cols = matrix.shape

        row_start = block_row * self.block_size
        row_end = min(row_start + self.block_size, rows)
        col_start = block_col * self.block_size
        col_end = min(col_start + self.block_size, cols)

        return matrix[row_start:row_end, col_start:col_end]

    def _compute_block(self, c_row: int, c_col: int) -> np.ndarray:
        """计算C的某个分块的标准结果"""
        result = None
        for k in range(self.a_blocks_col):
            a_block = self._get_block(self.A, c_row, k, is_a=True)
            b_block = self._get_block(self.B, k, c_col, is_a=False)
            partial = a_block @ b_block

            if result is None:
                result = partial
            else:
                result += partial

        return result

    def get_c_block_shape(self, c_row: int, c_col: int) -> Tuple[int, int]:
        """获取C分块的实际形状"""
        row_start = c_row * self.block_size
        row_end = min(row_start + self.block_size, self.c_rows)
        col_start = c_col * self.block_size
        col_end = min(col_start + self.block_size, self.c_cols)
        return (row_end - row_start, col_end - col_start)

    def validate_step(self, step: dict) -> StepRecord:
        """
        验证单个步骤
        参数: step - 包含 a_block_row, a_block_col, b_block_row, b_block_col,
                    a_rows, a_cols, b_rows, b_cols 的字典
        """
        self.step_counter += 1
        record = StepRecord(
            step_number=self.step_counter,
            a_block=(step['a_block_row'], step['a_block_col']),
            b_block=(step['b_block_row'], step['b_block_col']),
            a_rows=step['a_rows'],
            a_cols=step['a_cols'],
            b_rows=step['b_rows'],
            b_cols=step['b_cols'],
            line_number=step.get('line_number', 0),
            comment=step.get('comment', '')
        )

        issues = []

        a_br, a_bc = record.a_block
        b_br, b_bc = record.b_block

        if a_br < 0 or a_br >= self.a_blocks_row:
            issues.append(f"A块行索引越界: {a_br}，有效范围[0, {self.a_blocks_row - 1}]")
        if a_bc < 0 or a_bc >= self.a_blocks_col:
            issues.append(f"A块列索引越界: {a_bc}，有效范围[0, {self.a_blocks_col - 1}]")
        if b_br < 0 or b_br >= self.b_blocks_row:
            issues.append(f"B块行索引越界: {b_br}，有效范围[0, {self.b_blocks_row - 1}]")
        if b_bc < 0 or b_bc >= self.b_blocks_col:
            issues.append(f"B块列索引越界: {b_bc}，有效范围[0, {self.b_blocks_col - 1}]")

        if a_bc != b_br:
            issues.append(
                f"维度不匹配: A块列({a_bc}) != B块行({b_br})，"
                f"无法相乘"
            )

        a_block_shape = self._get_block_shape(self.A, a_br, a_bc)
        b_block_shape = self._get_block_shape(self.B, b_br, b_bc, is_a=False)

        if record.a_rows > 0 and record.a_rows != a_block_shape[0]:
            issues.append(
                f"A块行数不匹配: 声明{record.a_rows}，实际{a_block_shape[0]}"
            )
        if record.a_cols > 0 and record.a_cols != a_block_shape[1]:
            issues.append(
                f"A块列数不匹配: 声明{record.a_cols}，实际{a_block_shape[1]}"
            )
        if record.b_rows > 0 and record.b_rows != b_block_shape[0]:
            issues.append(
                f"B块行数不匹配: 声明{record.b_rows}，实际{b_block_shape[0]}"
            )
        if record.b_cols > 0 and record.b_cols != b_block_shape[1]:
            issues.append(
                f"B块列数不匹配: 声明{record.b_cols}，实际{b_block_shape[1]}"
            )

        record.is_valid = len(issues) == 0
        record.issues = issues

        if record.is_valid:
            a_block = self._get_block(self.A, a_br, a_bc)
            b_block = self._get_block(self.B, b_br, b_bc, is_a=False)
            record.partial_result = a_block @ b_block
            record.expected_contribution = record.partial_result.copy()

        return record

    def _get_block_shape(self, matrix: np.ndarray, block_row: int,
                         block_col: int, is_a: bool = True) -> Tuple[int, int]:
        """获取分块形状"""
        rows, cols = matrix.shape
        row_start = block_row * self.block_size
        row_end = min(row_start + self.block_size, rows)
        col_start = block_col * self.block_size
        col_end = min(col_start + self.block_size, cols)
        return (row_end - row_start, col_end - col_start)

    def apply_step(self, record: StepRecord) -> Optional[Tuple[int, int]]:
        """
        应用步骤到累积结果
        返回影响的C块索引
        """
        if not record.is_valid:
            return None

        a_br, _ = record.a_block
        _, b_bc = record.b_block
        c_block_idx = (a_br, b_bc)

        if c_block_idx not in self.block_results:
            return None

        block_result = self.block_results[c_block_idx]

        if block_result.student_result is None:
            block_result.student_result = record.partial_result.copy()
        else:
            block_result.student_result += record.partial_result

        block_result.correction_trace.append({
            'step': record.step_number,
            'contribution': record.partial_result,
            'a_block': record.a_block,
            'b_block': record.b_block,
            'line': record.line_number
        })

        return c_block_idx

    def check_skips(self, c_row: int, c_col: int) -> List[Tuple[int, int]]:
        """
        检查C的某个分块是否有跳过的必要步骤
        返回跳过的(A块列, B块行)对列表
        """
        c_block = self.block_results.get((c_row, c_col))
        if not c_block:
            return []

        traced_k = set()
        for trace in c_block.correction_trace:
            a_block = trace['a_block']
            b_block = trace['b_block']
            if a_block[0] == c_row and b_block[1] == c_col:
                traced_k.add(a_block[1])

        all_k = set(range(self.a_blocks_col))
        skipped = all_k - traced_k
        return [(c_row, k) for k in sorted(skipped)]

    def compute_final_status(self, error_threshold: float = 1e-6):
        """计算所有分块的最终状态"""
        for (i, j), block_result in self.block_results.items():
            if block_result.student_result is None:
                block_result.status = 'skipped'
                block_result.message = '该分块未计算'
                continue

            if block_result.student_result.shape != block_result.expected.shape:
                block_result.status = 'mismatch'
                block_result.message = (
                    f"形状不匹配: 学生{block_result.student_result.shape} "
                    f"!= 标准{block_result.expected.shape}"
                )
                continue

            error = np.max(np.abs(block_result.student_result - block_result.expected))
            block_result.error = float(error)

            if error <= error_threshold:
                block_result.status = 'correct'
                block_result.message = '正确'
            else:
                block_result.status = 'incorrect'
                block_result.message = f"最大误差: {error:.2e}，超过阈值{error_threshold:.2e}"

                skips = self.check_skips(i, j)
                if skips:
                    skip_desc = ', '.join([f"A({i},{k})*B({k},{j})" for i, k in skips])
                    block_result.message += f"，可能缺少步骤: {skip_desc}"

    def get_block_contributions(self, c_row: int, c_col: int) -> List[dict]:
        """获取C的某个分块的所有贡献"""
        contributions = []
        for k in range(self.a_blocks_col):
            a_block = self._get_block(self.A, c_row, k)
            b_block = self._get_block(self.B, k, c_col, is_a=False)
            partial = a_block @ b_block
            contributions.append({
                'k': k,
                'a_block': (c_row, k),
                'b_block': (k, c_col),
                'contribution': partial
            })
        return contributions

    def get_all_skips(self) -> Dict[Tuple[int, int], List[Tuple[int, int]]]:
        """获取所有分块的跳过情况"""
        all_skips = {}
        for (i, j) in self.block_results:
            skips = self.check_skips(i, j)
            if skips:
                all_skips[(i, j)] = skips
        return all_skips

    def get_summary(self) -> dict:
        """获取追踪摘要"""
        status_counts = {}
        for block_result in self.block_results.values():
            status = block_result.status
            status_counts[status] = status_counts.get(status, 0) + 1

        return {
            'total_blocks': len(self.block_results),
            'status_counts': status_counts,
            'total_steps': self.step_counter,
            'block_size': self.block_size,
            'matrix_a_shape': self.A.shape,
            'matrix_b_shape': self.B.shape,
            'output_shape': (self.c_rows, self.c_cols)
        }
