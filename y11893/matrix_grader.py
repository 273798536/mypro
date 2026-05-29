from fractions import Fraction
from typing import List, Dict, Any, Optional
import json
from matrix_parser import MatrixParser
from row_operations import RowOperationChecker
from gaussian_elimination import GaussianElimination
from step_tracker import StepTracker
from feedback_generator import FeedbackGenerator


class MatrixGrader:
    def __init__(self, tolerance: float = 1e-9):
        self.tolerance = tolerance
        self.parser = MatrixParser(tolerance)
        self.row_checker = RowOperationChecker(tolerance)
        self.eliminator = GaussianElimination(tolerance)
        self.tracker = StepTracker(tolerance)
        self.feedback = FeedbackGenerator(tolerance)

    def grade_student_work(self, problem_matrix: List[str], 
                            student_steps: List[str],
                            answer_matrix: Optional[List[str]] = None) -> Dict[str, Any]:
        raw_problem = self.parser.parse_matrix(problem_matrix)
        if not self.parser.is_valid_matrix(raw_problem):
            return {'error': '题目矩阵无效'}
        problem_clean = self.parser.fill_missing(raw_problem)
        
        parsed_steps = self.tracker.parse_student_steps(student_steps)
        parsed_steps.insert(0, {
            'step_index': 0,
            'original_input': '原始矩阵',
            'matrix_raw': raw_problem,
            'matrix_clean': problem_clean,
            'description': '初始矩阵',
            'parse_warnings': []
        })
        
        validation_results = self.tracker.validate_step_sequence(parsed_steps)
        
        step_feedback = []
        for val_result in validation_results:
            fb = self.feedback.generate_step_feedback(val_result)
            
            if val_result['step_index'] >= 1 and val_result['step_index'] < len(parsed_steps):
                prev_matrix = parsed_steps[val_result['step_index'] - 1]['matrix_clean']
                curr_matrix = parsed_steps[val_result['step_index']]['matrix_clean']
                if prev_matrix and curr_matrix:
                    missing_swap = self.feedback.check_missing_swap(prev_matrix, curr_matrix)
                    if missing_swap:
                        fb['deduction_points'] += 2
                        fb['deduction_reasons'].append({
                            'type': 'missing_swap',
                            'points': 2,
                            'reason': '主元为0时未执行行交换',
                            'details': missing_swap['details']
                        })
                        fb['next_action'] = missing_swap['details']
            
            step_feedback.append(fb)
        
        overall = self.feedback.generate_overall_feedback(step_feedback, parsed_steps, problem_clean)
        
        answer_compare = None
        if answer_matrix:
            raw_answer = self.parser.parse_matrix(answer_matrix)
            if self.parser.is_valid_matrix(raw_answer):
                answer_clean = self.parser.fill_missing(raw_answer)
                if parsed_steps[-1]['matrix_clean']:
                    answer_compare = self.tracker.compare_with_expected(
                        parsed_steps[-1]['matrix_clean'],
                        answer_clean
                    )
        
        report = {
            'problem_matrix': problem_clean,
            'parsed_steps': parsed_steps,
            'validation_results': validation_results,
            'step_feedback': step_feedback,
            'overall_feedback': overall,
            'answer_comparison': answer_compare
        }
        
        return report

    def generate_report_text(self, report: Dict[str, Any]) -> str:
        if 'error' in report:
            return f"错误：{report['error']}"
        return self.feedback.print_feedback_report(
            report['step_feedback'],
            report['overall_feedback']
        )

    def save_report_json(self, report: Dict[str, Any], filepath: str) -> None:
        if 'error' in report:
            print(f"无法保存报告：{report['error']}")
            return
        download_data = self.feedback.format_feedback_for_download(
            report['step_feedback'],
            report['overall_feedback'],
            report['parsed_steps']
        )
        
        def convert_fraction(obj):
            if isinstance(obj, Fraction):
                return str(obj)
            raise TypeError
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(download_data, f, ensure_ascii=False, indent=2, default=convert_fraction)

    def print_chart_explanation(self, report: Dict[str, Any]) -> str:
        if 'error' in report:
            return f"无法显示图表：{report['error']}"
        chart_data = report['overall_feedback']['chart_data']
        lines = []
        lines.append("【图表数据说明】")
        lines.append("")
        
        for chart_name, data in chart_data.items():
            lines.append(f"■ {chart_name}")
            lines.append(f"  描述：{data['description']}")
            if 'labels' in data and 'values' in data:
                lines.append(f"  数据：")
                for label, value in zip(data['labels'], data['values']):
                    lines.append(f"    - {label}: {value}")
            lines.append("")
        
        return "\n".join(lines)
