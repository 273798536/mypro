from fractions import Fraction
from typing import List, Tuple, Optional, Dict, Any
from copy import deepcopy


class RowOperationChecker:
    def __init__(self, tolerance: float = 1e-9):
        self.tolerance = tolerance

    def matrices_equal(self, mat1: List[List[Fraction]], mat2: List[List[Fraction]]) -> bool:
        if len(mat1) != len(mat2):
            return False
        for i in range(len(mat1)):
            if len(mat1[i]) != len(mat2[i]):
                return False
            for j in range(len(mat1[i])):
                if abs(mat1[i][j] - mat2[i][j]) > self.tolerance:
                    return False
        return True

    def apply_swap(self, matrix: List[List[Fraction]], row1: int, row2: int) -> List[List[Fraction]]:
        result = deepcopy(matrix)
        if 0 <= row1 < len(result) and 0 <= row2 < len(result):
            result[row1], result[row2] = result[row2], result[row1]
        return result

    def apply_multiply(self, matrix: List[List[Fraction]], row: int, scalar: Fraction) -> List[List[Fraction]]:
        result = deepcopy(matrix)
        if 0 <= row < len(result):
            for j in range(len(result[row])):
                result[row][j] = result[row][j] * scalar
        return result

    def apply_add(self, matrix: List[List[Fraction]], target_row: int, source_row: int, scalar: Fraction) -> List[List[Fraction]]:
        result = deepcopy(matrix)
        if 0 <= target_row < len(result) and 0 <= source_row < len(result):
            for j in range(len(result[target_row])):
                result[target_row][j] = result[target_row][j] + scalar * result[source_row][j]
        return result

    def is_row_multiple(self, row1: List[Fraction], row2: List[Fraction]) -> Tuple[bool, Optional[Fraction]]:
        if len(row1) != len(row2):
            return False, None
        
        scalar = None
        for j in range(len(row1)):
            if abs(row2[j]) <= self.tolerance:
                if abs(row1[j]) > self.tolerance:
                    return False, None
                continue
            if abs(row1[j]) <= self.tolerance:
                return False, None
            
            current_scalar = row1[j] / row2[j]
            if scalar is None:
                scalar = current_scalar
            elif abs(current_scalar - scalar) > self.tolerance:
                return False, None
        
        if scalar is None:
            return True, Fraction(1)
        return True, scalar

    def check_swap_operation(self, prev_matrix: List[List[Fraction]], curr_matrix: List[List[Fraction]]) -> Dict[str, Any]:
        result = {
            'is_valid': False,
            'row1': None,
            'row2': None,
            'type': 'swap',
            'details': ''
        }
        
        n = len(prev_matrix)
        if len(curr_matrix) != n:
            result['details'] = '矩阵行数不匹配'
            return result
        
        diff_rows = []
        for i in range(n):
            if prev_matrix[i] != curr_matrix[i]:
                diff_rows.append(i)
        
        if len(diff_rows) != 2:
            result['details'] = f'交换操作应恰好有2行变化，实际变化了{len(diff_rows)}行'
            return result
        
        r1, r2 = diff_rows
        if prev_matrix[r1] == curr_matrix[r2] and prev_matrix[r2] == curr_matrix[r1]:
            result['is_valid'] = True
            result['row1'] = r1
            result['row2'] = r2
            result['details'] = f'正确：第{r1+1}行与第{r2+1}行交换'
            return result
        
        result['details'] = f'行{r1+1}和行{r2+1}不是简单交换关系'
        return result

    def check_multiply_operation(self, prev_matrix: List[List[Fraction]], curr_matrix: List[List[Fraction]]) -> Dict[str, Any]:
        result = {
            'is_valid': False,
            'row': None,
            'scalar': None,
            'type': 'multiply',
            'details': ''
        }
        
        n = len(prev_matrix)
        if len(curr_matrix) != n:
            result['details'] = '矩阵行数不匹配'
            return result
        
        diff_rows = []
        for i in range(n):
            if prev_matrix[i] != curr_matrix[i]:
                diff_rows.append(i)
        
        if len(diff_rows) != 1:
            result['details'] = f'数乘操作应仅1行变化，实际变化了{len(diff_rows)}行'
            return result
        
        row_idx = diff_rows[0]
        is_multiple, scalar = self.is_row_multiple(curr_matrix[row_idx], prev_matrix[row_idx])
        
        if is_multiple and scalar is not None:
            if abs(scalar) <= self.tolerance:
                result['details'] = f'错误：不能用0乘以第{row_idx+1}行'
                return result
            result['is_valid'] = True
            result['row'] = row_idx
            result['scalar'] = scalar
            result['details'] = f'正确：第{row_idx+1}行乘以{scalar}'
            return result
        
        result['details'] = f'第{row_idx+1}行不是原行的常数倍'
        return result

    def check_add_operation(self, prev_matrix: List[List[Fraction]], curr_matrix: List[List[Fraction]]) -> Dict[str, Any]:
        result = {
            'is_valid': False,
            'target_row': None,
            'source_row': None,
            'scalar': None,
            'type': 'add',
            'details': ''
        }
        
        n = len(prev_matrix)
        if len(curr_matrix) != n:
            result['details'] = '矩阵行数不匹配'
            return result
        
        diff_rows = []
        for i in range(n):
            if prev_matrix[i] != curr_matrix[i]:
                diff_rows.append(i)
        
        if len(diff_rows) != 1:
            result['details'] = f'行加操作应仅目标行变化，实际变化了{len(diff_rows)}行'
            return result
        
        target_idx = diff_rows[0]
        
        for source_idx in range(n):
            if source_idx == target_idx:
                continue
            
            diff = []
            valid_diff = True
            for j in range(len(curr_matrix[target_idx])):
                d = curr_matrix[target_idx][j] - prev_matrix[target_idx][j]
                diff.append(d)
                if abs(prev_matrix[source_idx][j]) <= self.tolerance and abs(d) > self.tolerance:
                    valid_diff = False
                    break
            
            if not valid_diff:
                continue
            
            is_multiple, scalar = self.is_row_multiple(diff, prev_matrix[source_idx])
            if is_multiple and scalar is not None:
                result['is_valid'] = True
                result['target_row'] = target_idx
                result['source_row'] = source_idx
                result['scalar'] = scalar
                result['details'] = f'正确：第{target_idx+1}行 = 第{target_idx+1}行 + ({scalar}) × 第{source_idx+1}行'
                return result
        
        result['details'] = f'无法识别第{target_idx+1}行的行加操作来源'
        return result

    def identify_operation(self, prev_matrix: List[List[Fraction]], curr_matrix: List[List[Fraction]]) -> Dict[str, Any]:
        swap_check = self.check_swap_operation(prev_matrix, curr_matrix)
        if swap_check['is_valid']:
            return swap_check
        
        add_check = self.check_add_operation(prev_matrix, curr_matrix)
        if add_check['is_valid']:
            return add_check
        
        mult_check = self.check_multiply_operation(prev_matrix, curr_matrix)
        if mult_check['is_valid']:
            return mult_check
        
        return {
            'is_valid': False,
            'type': 'unknown',
            'details': '无法识别为任何标准行变换'
        }

    def find_element_errors(self, prev_matrix: List[List[Fraction]], curr_matrix: List[List[Fraction]]) -> List[Dict[str, Any]]:
        errors = []
        n_rows = min(len(prev_matrix), len(curr_matrix))
        
        for i in range(n_rows):
            n_cols = min(len(prev_matrix[i]), len(curr_matrix[i]))
            for j in range(n_cols):
                if abs(prev_matrix[i][j] - curr_matrix[i][j]) > self.tolerance:
                    errors.append({
                        'row': i,
                        'col': j,
                        'expected': prev_matrix[i][j],
                        'actual': curr_matrix[i][j],
                        'diff': curr_matrix[i][j] - prev_matrix[i][j]
                    })
        
        return errors
