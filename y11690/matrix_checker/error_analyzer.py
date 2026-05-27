"""误差容忍和错因定位模块"""

from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional
import numpy as np


@dataclass
class ErrorCategory:
    """错误分类"""
    category: str  # dimension, floating_point, missing_step, shape_mismatch, value_error
    severity: str  # error, warning, info
    message: str
    affected_blocks: List[Tuple[int, int]] = field(default_factory=list)
    details: str = ''
    suggestion: str = ''


@dataclass
class CorrectionSuggestion:
    """修正建议"""
    block_idx: Tuple[int, int]
    original_error: float
    suggested_fix: str
    fix_type: str  # missing_step, rounding, recalculation, dimension
    confidence: float  # 0-1
    details: dict = field(default_factory=dict)


class ErrorAnalyzer:
    """误差分析和错因定位器"""

    def __init__(self, tracker, error_threshold: float = 1e-6):
        self.tracker = tracker
        self.error_threshold = error_threshold
        self.categories: List[ErrorCategory] = []
        self.suggestions: List[CorrectionSuggestion] = []

    def analyze(self) -> List[ErrorCategory]:
        """执行完整的误差分析"""
        self.categories = []

        self._check_dimension_issues()
        self._check_floating_point_errors()
        self._check_missing_steps()
        self._check_shape_mismatches()
        self._check_value_errors()

        return self.categories

    def _check_dimension_issues(self):
        """检查维度问题"""
        dim_issues = []

        for record in self.tracker.steps:
            if record.issues:
                for issue in record.issues:
                    if '越界' in issue or '不匹配' in issue:
                        dim_issues.append((record.step_number, issue))

        if dim_issues:
            affected = []
            for step_num, _ in dim_issues:
                record = self.tracker.steps[step_num - 1]
                affected.append(record.a_block)
                affected.append(record.b_block)

            self.categories.append(ErrorCategory(
                category='dimension',
                severity='error',
                message=f'发现{len(dim_issues)}个维度相关问题',
                affected_blocks=list(set(affected)),
                details='\n'.join([f"步骤{step}: {issue}" for step, issue in dim_issues]),
                suggestion='请检查分块索引是否在有效范围内，以及A块列数是否等于B块行数'
            ))

    def _check_floating_point_errors(self):
        """检查浮点误差"""
        fp_blocks = []
        fp_details = []

        for (i, j), block_result in self.tracker.block_results.items():
            if block_result.status == 'incorrect' and block_result.error:
                rel_error = block_result.error / (np.max(np.abs(block_result.expected)) + 1e-15)
                if rel_error < 1.0:
                    fp_blocks.append((i, j))
                    fp_details.append(
                        f"C({i},{j}): 绝对误差={block_result.error:.2e}, "
                        f"相对误差={rel_error:.2e}"
                    )

        if fp_blocks:
            self.categories.append(ErrorCategory(
                category='floating_point',
                severity='warning',
                message=f'发现{len(fp_blocks)}个分块存在浮点误差',
                affected_blocks=fp_blocks,
                details='\n'.join(fp_details),
                suggestion=f'建议检查计算精度，或适当放宽误差阈值(当前: {self.error_threshold:.2e})'
            ))

    def _check_missing_steps(self):
        """检查步骤遗漏"""
        all_skips = self.tracker.get_all_skips()

        if all_skips:
            skip_details = []
            affected = []

            for (i, j), skips in all_skips.items():
                skip_desc = ', '.join([f"A({i},{k})*B({k},{j})" for i, k in skips])
                skip_details.append(f"C({i},{j}) 缺少: {skip_desc}")
                affected.append((i, j))

            self.categories.append(ErrorCategory(
                category='missing_step',
                severity='error',
                message=f'发现{len(all_skips)}个分块存在步骤遗漏',
                affected_blocks=affected,
                details='\n'.join(skip_details),
                suggestion='请补充缺失的分块乘法步骤'
            ))

    def _check_shape_mismatches(self):
        """检查形状不匹配"""
        mismatch_blocks = []

        for (i, j), block_result in self.tracker.block_results.items():
            if block_result.status == 'mismatch':
                mismatch_blocks.append((i, j))

        if mismatch_blocks:
            self.categories.append(ErrorCategory(
                category='shape_mismatch',
                severity='error',
                message=f'发现{len(mismatch_blocks)}个分块形状不匹配',
                affected_blocks=mismatch_blocks,
                details='学生计算的分块形状与标准结果不一致',
                suggestion='请检查分块大小和矩阵索引是否正确'
            ))

    def _check_value_errors(self):
        """检查数值错误（非浮点误差导致的错误）"""
        value_blocks = []
        value_details = []

        for (i, j), block_result in self.tracker.block_results.items():
            if block_result.status == 'incorrect' and block_result.error:
                rel_error = block_result.error / (np.max(np.abs(block_result.expected)) + 1e-15)
                if rel_error >= 1.0:
                    value_blocks.append((i, j))
                    value_details.append(
                        f"C({i},{j}): 误差={block_result.error:.2e}，"
                        f"相对误差={rel_error:.2e}"
                    )

        if value_blocks:
            self.categories.append(ErrorCategory(
                category='value_error',
                severity='error',
                message=f'发现{len(value_blocks)}个分块存在明显数值错误',
                affected_blocks=value_blocks,
                details='\n'.join(value_details),
                suggestion='建议重新计算这些分块，检查乘法和加法过程'
            ))

    def generate_suggestions(self) -> List[CorrectionSuggestion]:
        """生成修正建议"""
        self.suggestions = []

        for (i, j), block_result in self.tracker.block_results.items():
            if block_result.status == 'skipped':
                self.suggestions.append(CorrectionSuggestion(
                    block_idx=(i, j),
                    original_error=float('inf'),
                    suggested_fix=f'计算C({i},{j})分块，需要累加{self.tracker.a_blocks_col}个A*B子矩阵乘积',
                    fix_type='missing_step',
                    confidence=0.95,
                    details={
                        'required_steps': self.tracker.a_blocks_col,
                        'contributions': self.tracker.get_block_contributions(i, j)
                    }
                ))

            elif block_result.status == 'incorrect':
                skips = self.tracker.check_skips(i, j)
                if skips:
                    self.suggestions.append(CorrectionSuggestion(
                        block_idx=(i, j),
                        original_error=block_result.error or 0,
                        suggested_fix=f'补充缺失步骤: {", ".join([f"A({i},{k})*B({k},{j})" for i, k in skips])}',
                        fix_type='missing_step',
                        confidence=0.9,
                        details={'missing_k': [k for _, k in skips]}
                    ))
                elif block_result.error and block_result.error < 1e-3:
                    self.suggestions.append(CorrectionSuggestion(
                        block_idx=(i, j),
                        original_error=block_result.error,
                        suggested_fix='可能是浮点精度问题，建议检查计算精度或使用更高精度计算',
                        fix_type='rounding',
                        confidence=0.6
                    ))
                else:
                    self.suggestions.append(CorrectionSuggestion(
                        block_idx=(i, j),
                        original_error=block_result.error or 0,
                        suggested_fix='建议重新计算该分块，逐行检查乘法和加法',
                        fix_type='recalculation',
                        confidence=0.7
                    ))

        return self.suggestions

    def get_error_summary(self) -> dict:
        """获取错误摘要"""
        return {
            'total_categories': len(self.categories),
            'by_severity': self._count_by_severity(),
            'by_category': self._count_by_category(),
            'total_affected_blocks': len(self._get_all_affected_blocks()),
            'suggestions_count': len(self.suggestions)
        }

    def _count_by_severity(self) -> dict:
        counts = {'error': 0, 'warning': 0, 'info': 0}
        for cat in self.categories:
            counts[cat.severity] = counts.get(cat.severity, 0) + 1
        return counts

    def _count_by_category(self) -> dict:
        counts = {}
        for cat in self.categories:
            counts[cat.category] = counts.get(cat.category, 0) + 1
        return counts

    def _get_all_affected_blocks(self) -> set:
        all_blocks = set()
        for cat in self.categories:
            all_blocks.update(cat.affected_blocks)
        return all_blocks
