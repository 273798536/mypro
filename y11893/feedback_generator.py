from fractions import Fraction
from typing import List, Dict, Any, Optional
from copy import deepcopy
import json
from matrix_parser import MatrixParser
from row_operations import RowOperationChecker
from gaussian_elimination import GaussianElimination
from step_tracker import StepTracker


class FeedbackGenerator:
    def __init__(self, tolerance: float = 1e-9):
        self.tolerance = tolerance
        self.parser = MatrixParser(tolerance)
        self.row_checker = RowOperationChecker(tolerance)
        self.eliminator = GaussianElimination(tolerance)
        self.tracker = StepTracker(tolerance)
        
        self.deduction_rules = {
            'invalid_operation': {'points': 2, 'reason': '行变换操作不正确'},
            'element_mismatch': {'points': 1, 'reason': '元素计算错误'},
            'missing_swap': {'points': 2, 'reason': '主元为0时未执行行交换'},
            'fraction_not_simplified': {'points': 0.5, 'reason': '分数未化简'},
            'description_mismatch': {'points': 1, 'reason': '操作描述与实际不符'},
            'pivot_left_shift': {'points': 1.5, 'reason': '主元位置左移，破坏行阶梯形'},
            'zero_multiplication': {'points': 3, 'reason': '使用0乘以某行'},
            'same_row_add': {'points': 2, 'reason': '行加操作使用同一行'}
        }

    def generate_step_feedback(self, validation_result: Dict[str, Any]) -> Dict[str, Any]:
        feedback = {
            'step_index': validation_result['step_index'],
            'is_correct': validation_result['is_valid'],
            'operation_type': validation_result['operation_type'],
            'operation_details': validation_result['operation_details'],
            'deduction_points': 0.0,
            'deduction_reasons': [],
            'warnings': [],
            'next_action': '',
            'related_question': ''
        }
        
        if not validation_result['is_valid']:
            for error in validation_result['errors']:
                if isinstance(error, dict):
                    error_type = error.get('type', 'unknown')
                    if error_type in self.deduction_rules:
                        rule = self.deduction_rules[error_type]
                        feedback['deduction_points'] += rule['points']
                        feedback['deduction_reasons'].append({
                            'type': error_type,
                            'points': rule['points'],
                            'reason': rule['reason'],
                            'details': error.get('details', '')
                        })
                    else:
                        feedback['deduction_points'] += 1.0
                        feedback['deduction_reasons'].append({
                            'type': error_type,
                            'points': 1.0,
                            'reason': '未知类型错误',
                            'details': error.get('details', '')
                        })
                elif isinstance(error, str):
                    feedback['deduction_points'] += 1.0
                    feedback['deduction_reasons'].append({
                        'type': 'general_error',
                        'points': 1.0,
                        'reason': error,
                        'details': ''
                    })
        
        for warning in validation_result['warnings']:
            if isinstance(warning, dict) and warning.get('type') == 'fraction_simplify':
                feedback['warnings'].append({
                    'type': 'fraction_simplify',
                    'message': warning['details'],
                    'suggestion': '建议化简分数以保持矩阵简洁'
                })
                feedback['deduction_points'] += 0.5 * warning.get('count', 1)
        
        feedback['next_action'] = self._generate_next_action(validation_result)
        
        return feedback

    def _generate_next_action(self, validation_result: Dict[str, Any]) -> str:
        if validation_result['is_valid']:
            return '继续下一步消元，注意选择正确的主元位置'
        
        for error in validation_result['errors']:
            if isinstance(error, dict):
                error_type = error.get('type')
                
                if error_type == 'element_mismatch':
                    locations = error.get('locations', [])
                    if locations:
                        row, col = locations[0]
                        return f'请检查第{row}行第{col}列的计算，重新核对该行变换后的所有元素'
                
                if error_type == 'missing_swap':
                    return '当前主元位置为0，请先与下方非零行交换，再继续消元'
                
                if error_type == 'pivot_left_shift':
                    return '注意保持行阶梯形结构，主元位置只能右移或不变'
                
                if error_type == 'zero_multiplication':
                    return '行变换中不能用0乘以某行，请使用非零常数'
        
        return '请核对该行变换，确保只使用三种基本行变换中的一种'

    def check_missing_swap(self, step_matrix: List[List[Fraction]], 
                           next_matrix: List[List[Fraction]]) -> Optional[Dict[str, Any]]:
        n_rows = len(step_matrix)
        n_cols = len(step_matrix[0]) if n_rows > 0 else 0
        
        for col in range(n_cols):
            for row in range(n_rows):
                pivot_info = self.eliminator.check_pivot_issues(step_matrix, row, col)
                if pivot_info['has_issue'] and pivot_info['suggested_swap_row'] is not None:
                    next_pivot_info = self.eliminator.check_pivot_issues(next_matrix, row, col)
                    if next_pivot_info['has_issue']:
                        return {
                            'type': 'missing_swap',
                            'row': row,
                            'col': col,
                            'suggested_swap_with': pivot_info['suggested_swap_row'],
                            'details': f'第{row+1}行第{col+1}列主元为0，应先与第{pivot_info["suggested_swap_row"]+1}行交换'
                        }
                break
        
        return None

    def generate_overall_feedback(self, all_feedback: List[Dict[str, Any]], 
                                   student_steps: List[Dict[str, Any]],
                                   original_matrix: List[List[Fraction]]) -> Dict[str, Any]:
        overall = {
            'total_steps': len(student_steps),
            'correct_steps': sum(1 for f in all_feedback if f['is_correct']),
            'total_deduction': sum(f['deduction_points'] for f in all_feedback),
            'first_error_step': None,
            'error_summary': {},
            'progress_score': 0.0,
            'recommendations': [],
            'chart_data': self._generate_chart_data(all_feedback, student_steps)
        }
        
        for i, feedback in enumerate(all_feedback):
            if not feedback['is_correct']:
                overall['first_error_step'] = i + 1
                break
        
        for feedback in all_feedback:
            for reason in feedback['deduction_reasons']:
                error_type = reason['type']
                if error_type not in overall['error_summary']:
                    overall['error_summary'][error_type] = {
                        'count': 0,
                        'total_points': 0.0,
                        'reason': reason['reason']
                    }
                overall['error_summary'][error_type]['count'] += 1
                overall['error_summary'][error_type]['total_points'] += reason['points']
        
        total_possible = len(student_steps) - 1
        if total_possible > 0:
            overall['progress_score'] = overall['correct_steps'] / total_possible * 100
        
        overall['recommendations'] = self._generate_recommendations(overall)
        
        return overall

    def _generate_chart_data(self, all_feedback: List[Dict[str, Any]], 
                              student_steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            'step_accuracy': {
                'labels': [f'步骤{i+1}' for i in range(len(all_feedback))],
                'values': [1 if f['is_correct'] else 0 for f in all_feedback],
                'description': '每步正确性分布图（1表示正确，0表示错误）'
            },
            'error_distribution': {
                'labels': list(set(f['operation_type'] or 'unknown' for f in all_feedback)),
                'values': [],
                'description': '各类型操作的错误分布统计'
            },
            'deduction_by_step': {
                'labels': [f'步骤{i+1}' for i in range(len(all_feedback))],
                'values': [f['deduction_points'] for f in all_feedback],
                'description': '每步扣分数值，反映错误严重程度'
            }
        }

    def _generate_recommendations(self, overall: Dict[str, Any]) -> List[Dict[str, Any]]:
        recommendations = []
        
        if overall['first_error_step'] is not None:
            recommendations.append({
                'priority': 'high',
                'action': f'回到步骤{overall["first_error_step"]}重新计算',
                'reason': '该步骤是第一个错误，后续步骤可能受此影响',
                'related_content': '请检查该步的行变换计算是否正确'
            })
        
        error_types = sorted(
            overall['error_summary'].items(),
            key=lambda x: x[1]['total_points'],
            reverse=True
        )
        
        for error_type, info in error_types[:3]:
            recommendations.append({
                'priority': 'medium',
                'action': f'加强"{info["reason"]}"相关练习',
                'reason': f'此类型错误共出现{info["count"]}次，累计扣分{info["total_points"]}',
                'related_content': f'错误类型：{error_type}'
            })
        
        if overall['progress_score'] < 50:
            recommendations.append({
                'priority': 'high',
                'action': '复习三种基本行变换规则',
                'reason': '正确率不足50%，建议巩固基础知识',
                'related_content': '行交换、某行乘非零常数、某行加另一行的倍数'
            })
        
        return recommendations

    def format_feedback_for_download(self, all_feedback: List[Dict[str, Any]], 
                                      overall: Dict[str, Any],
                                      student_steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            'report_info': {
                'title': '矩阵消元步骤批改报告',
                'generated_at': '',
                'total_steps': overall['total_steps'],
                'correct_steps': overall['correct_steps'],
                'total_deduction': overall['total_deduction'],
                'progress_score': round(overall['progress_score'], 1)
            },
            'error_summary': overall['error_summary'],
            'step_details': [
                {
                    'step_index': i + 1,
                    'is_correct': fb['is_correct'],
                    'operation': fb['operation_details'],
                    'deduction_points': fb['deduction_points'],
                    'errors': fb['deduction_reasons'],
                    'next_action': fb['next_action']
                }
                for i, fb in enumerate(all_feedback)
            ],
            'recommendations': overall['recommendations'],
            'chart_data': overall['chart_data']
        }

    def print_feedback_report(self, all_feedback: List[Dict[str, Any]], 
                               overall: Dict[str, Any]) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("矩阵消元步骤批改报告")
        lines.append("=" * 60)
        
        lines.append(f"\n【总体情况】")
        lines.append(f"总步骤数：{overall['total_steps']}")
        lines.append(f"正确步骤：{overall['correct_steps']}")
        lines.append(f"累计扣分：{overall['total_deduction']}")
        lines.append(f"进度得分：{overall['progress_score']:.1f}%")
        
        if overall['first_error_step'] is not None:
            lines.append(f"⚠️  第一个错误出现在步骤：{overall['first_error_step']}")
        
        lines.append(f"\n【错误统计】")
        if overall['error_summary']:
            for error_type, info in overall['error_summary'].items():
                lines.append(f"  - {info['reason']}: {info['count']}次，共扣{info['total_points']}分")
        else:
            lines.append("  无错误")
        
        lines.append(f"\n【分步详情】")
        for i, fb in enumerate(all_feedback):
            status = "✅" if fb['is_correct'] else "❌"
            lines.append(f"\n步骤{i+1} {status}")
            lines.append(f"  操作：{fb['operation_details']}")
            if fb['deduction_points'] > 0:
                lines.append(f"  扣分：{fb['deduction_points']}分")
                for reason in fb['deduction_reasons']:
                    lines.append(f"    - {reason['reason']}")
            if fb['next_action']:
                lines.append(f"  👉 下一步：{fb['next_action']}")
        
        lines.append(f"\n【改进建议】")
        for rec in overall['recommendations']:
            priority_mark = "🔴" if rec['priority'] == 'high' else "🟡"
            lines.append(f"{priority_mark} {rec['action']}")
            lines.append(f"   原因：{rec['reason']}")
            if rec['related_content']:
                lines.append(f"   相关内容：{rec['related_content']}")
        
        lines.append(f"\n【图表说明】")
        lines.append(f"  1. step_accuracy: 每步正确性分布图，可直观看出错误发生位置")
        lines.append(f"  2. error_distribution: 错误类型分布，帮助识别薄弱环节")
        lines.append(f"  3. deduction_by_step: 每步扣分数值，反映各步错误严重程度")
        
        lines.append("\n" + "=" * 60)
        
        return "\n".join(lines)
