import re
from fractions import Fraction
from typing import List, Dict, Any, Optional, Tuple
from copy import deepcopy
from matrix_parser import MatrixParser
from row_operations import RowOperationChecker
from gaussian_elimination import GaussianElimination


class StepTracker:
    def __init__(self, tolerance: float = 1e-9):
        self.tolerance = tolerance
        self.parser = MatrixParser(tolerance)
        self.row_checker = RowOperationChecker(tolerance)
        self.eliminator = GaussianElimination(tolerance)

    def parse_student_steps(self, step_inputs: List[str]) -> List[Dict[str, Any]]:
        parsed_steps = []
        
        for i, step_str in enumerate(step_inputs):
            step_data = {
                'step_index': i,
                'original_input': step_str,
                'matrix_raw': None,
                'matrix_clean': None,
                'description': None,
                'parse_warnings': []
            }
            
            lines = step_str.strip().split('\n')
            matrix_lines = []
            desc_lines = []
            
            for line in lines:
                line_stripped = line.strip()
                if not line_stripped:
                    continue
                
                is_descriptive = False
                
                if line_stripped.startswith(('步骤', 'Step', '#', '//')):
                    is_descriptive = True
                
                if not is_descriptive and re.match(r'^[Rr]\d', line_stripped):
                    is_descriptive = True
                
                if not is_descriptive:
                    op_patterns = ['↔', '←', '×', '=']
                    has_op = any(op in line_stripped for op in op_patterns)
                    if has_op:
                        tokens = line_stripped.replace('=', ' ').replace('×', ' ').replace('+', ' ').replace('-', ' ').split()
                        has_row_ref = any(re.match(r'^[Rr]\d+', t) for t in tokens)
                        if has_row_ref:
                            is_descriptive = True
                
                if not is_descriptive:
                    test_row = self.parser.parse_row(line_stripped)
                    valid_count = sum(1 for x in test_row if x is not None)
                    if valid_count >= 2:
                        matrix_lines.append(line_stripped)
                    else:
                        desc_lines.append(line_stripped)
                else:
                    desc_lines.append(line_stripped)
            
            if matrix_lines:
                raw_matrix = self.parser.parse_matrix(matrix_lines)
                step_data['matrix_raw'] = raw_matrix
                
                if self.parser.is_valid_matrix(raw_matrix):
                    step_data['matrix_clean'] = self.parser.fill_missing(raw_matrix)
                else:
                    step_data['parse_warnings'].append('矩阵数据不完整或无效')
            
            if desc_lines:
                step_data['description'] = ' '.join(desc_lines)
            
            parsed_steps.append(step_data)
        
        return parsed_steps

    def validate_step_sequence(self, steps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        validation_results = []
        
        for i in range(1, len(steps)):
            prev_step = steps[i - 1]
            curr_step = steps[i]
            
            result = {
                'step_index': i,
                'from_step': i - 1,
                'to_step': i,
                'is_valid': False,
                'operation_type': None,
                'operation_details': '',
                'errors': [],
                'warnings': []
            }
            
            if prev_step['matrix_clean'] is None or curr_step['matrix_clean'] is None:
                result['errors'].append('无法比较：某一步矩阵数据无效')
                validation_results.append(result)
                continue
            
            op_result = self.row_checker.identify_operation(
                prev_step['matrix_clean'],
                curr_step['matrix_clean']
            )
            
            result['is_valid'] = op_result['is_valid']
            result['operation_type'] = op_result['type']
            result['operation_details'] = op_result['details']
            
            if not op_result['is_valid']:
                element_errors = self.row_checker.find_element_errors(
                    prev_step['matrix_clean'],
                    curr_step['matrix_clean']
                )
                if element_errors:
                    result['errors'].append({
                        'type': 'element_mismatch',
                        'count': len(element_errors),
                        'locations': [(e['row'] + 1, e['col'] + 1) for e in element_errors[:5]]
                    })
                
                pivot_issues = self._check_pivot_related_errors(
                    prev_step['matrix_clean'],
                    curr_step['matrix_clean']
                )
                if pivot_issues:
                    result['errors'].extend(pivot_issues)
                
                if curr_step['description']:
                    desc_op = self.parser.parse_step_description(curr_step['description'])
                    if desc_op['operation']:
                        result['errors'].append({
                            'type': 'description_mismatch',
                            'described_operation': desc_op['operation'],
                            'details': '描述的操作与实际矩阵变化不符'
                        })
            
            fraction_issues = self.eliminator.fraction_simplify_check(curr_step['matrix_clean'])
            if fraction_issues:
                result['warnings'].append({
                    'type': 'fraction_simplify',
                    'count': len(fraction_issues),
                    'details': f'有{len(fraction_issues)}处分数可化简'
                })
            
            validation_results.append(result)
        
        return validation_results

    def _check_pivot_related_errors(self, prev_matrix: List[List[Fraction]], 
                                     curr_matrix: List[List[Fraction]]) -> List[Dict[str, Any]]:
        errors = []
        n_rows = min(len(prev_matrix), len(curr_matrix))
        
        for i in range(n_rows):
            prev_pivot_col = None
            curr_pivot_col = None
            
            for j in range(len(prev_matrix[i])):
                if abs(prev_matrix[i][j]) > self.tolerance:
                    prev_pivot_col = j
                    break
            
            for j in range(len(curr_matrix[i])):
                if abs(curr_matrix[i][j]) > self.tolerance:
                    curr_pivot_col = j
                    break
            
            if prev_pivot_col is not None and curr_pivot_col is not None:
                if curr_pivot_col < prev_pivot_col:
                    errors.append({
                        'type': 'pivot_left_shift',
                        'row': i + 1,
                        'details': f'第{i+1}行主元位置左移，可能破坏行阶梯形'
                    })
        
        return errors

    def find_first_error(self, validation_results: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        for result in validation_results:
            if not result['is_valid']:
                return result
        return None

    def track_against_standard(self, student_steps: List[Dict[str, Any]], 
                                standard_matrix: List[List[Fraction]]) -> Dict[str, Any]:
        result = {
            'overall_progress': 0.0,
            'correct_steps': 0,
            'total_steps': len(student_steps),
            'matches_standard': False,
            'deviation_point': None,
            'deviation_details': ''
        }
        
        _, standard_steps = self.eliminator.reduced_row_echelon_form(standard_matrix)
        
        correct_count = 0
        for i, student_step in enumerate(student_steps):
            if student_step['matrix_clean'] is None:
                continue
            
            for std_step in standard_steps:
                if self.row_checker.matrices_equal(student_step['matrix_clean'], std_step['matrix']):
                    correct_count += 1
                    break
        
        result['correct_steps'] = correct_count
        result['overall_progress'] = correct_count / len(standard_steps) if standard_steps else 0.0
        
        if student_steps and student_steps[-1]['matrix_clean'] is not None:
            final_rref, _ = self.eliminator.reduced_row_echelon_form(standard_matrix)
            result['matches_standard'] = self.row_checker.matrices_equal(
                student_steps[-1]['matrix_clean'],
                final_rref
            )
        
        return result

    def compare_with_expected(self, student_matrix: List[List[Fraction]], 
                               expected_matrix: List[List[Fraction]]) -> Dict[str, Any]:
        result = {
            'is_equal': False,
            'element_errors': [],
            'row_errors': [],
            'similarity_score': 0.0
        }
        
        result['is_equal'] = self.row_checker.matrices_equal(student_matrix, expected_matrix)
        
        if not result['is_equal']:
            result['element_errors'] = self.row_checker.find_element_errors(
                expected_matrix,
                student_matrix
            )
        
        n_rows = min(len(student_matrix), len(expected_matrix))
        correct_rows = 0
        
        for i in range(n_rows):
            if student_matrix[i] == expected_matrix[i]:
                correct_rows += 1
            else:
                result['row_errors'].append({
                    'row': i + 1,
                    'expected': expected_matrix[i] if i < len(expected_matrix) else None,
                    'actual': student_matrix[i] if i < len(student_matrix) else None
                })
        
        total_rows = max(len(student_matrix), len(expected_matrix))
        result['similarity_score'] = correct_rows / total_rows if total_rows > 0 else 0.0
        
        return result
