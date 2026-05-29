from fractions import Fraction
from typing import List, Tuple, Optional, Dict, Any
from copy import deepcopy
from row_operations import RowOperationChecker


class GaussianElimination:
    def __init__(self, tolerance: float = 1e-9):
        self.tolerance = tolerance
        self.row_checker = RowOperationChecker(tolerance)

    def find_pivot(self, matrix: List[List[Fraction]], row: int, col: int) -> Tuple[Optional[int], bool]:
        n_rows = len(matrix)
        has_zero_pivot = False
        
        if row >= n_rows or col >= len(matrix[row]):
            return None, has_zero_pivot
        
        if abs(matrix[row][col]) > self.tolerance:
            return row, has_zero_pivot
        
        has_zero_pivot = True
        
        for i in range(row + 1, n_rows):
            if abs(matrix[i][col]) > self.tolerance:
                return i, has_zero_pivot
        
        return None, has_zero_pivot

    def check_pivot_issues(self, matrix: List[List[Fraction]], target_row: int, col: int) -> Dict[str, Any]:
        result = {
            'has_issue': False,
            'issue_type': None,
            'pivot_row': None,
            'current_pivot': None,
            'details': '',
            'suggested_swap_row': None
        }
        
        n_rows = len(matrix)
        if target_row >= n_rows or col >= len(matrix[target_row]):
            result['details'] = '行列索引超出范围'
            return result
        
        current_val = matrix[target_row][col]
        result['current_pivot'] = current_val
        
        if abs(current_val) <= self.tolerance:
            result['has_issue'] = True
            result['issue_type'] = 'zero_pivot'
            
            swap_row = None
            for i in range(target_row + 1, n_rows):
                if abs(matrix[i][col]) > self.tolerance:
                    swap_row = i
                    break
            
            if swap_row is not None:
                result['suggested_swap_row'] = swap_row
                result['details'] = f'警告：第{target_row+1}行第{col+1}列主元为0，建议与第{swap_row+1}行交换'
            else:
                result['details'] = f'注意：第{col+1}列从第{target_row+1}行起全为0，该列无主元'
        else:
            result['details'] = f'主元正常：第{target_row+1}行第{col+1}列值为{current_val}'
        
        return result

    def forward_elimination(self, matrix: List[List[Fraction]]) -> List[Dict[str, Any]]:
        steps = []
        current = deepcopy(matrix)
        n_rows = len(current)
        n_cols = len(current[0]) if n_rows > 0 else 0
        
        row = 0
        col = 0
        
        while row < n_rows and col < n_cols:
            pivot_info = self.check_pivot_issues(current, row, col)
            pivot_row = pivot_info['suggested_swap_row']
            
            if pivot_info['has_issue'] and pivot_info['suggested_swap_row'] is not None:
                steps.append({
                    'step_type': 'pivot_check',
                    'matrix': deepcopy(current),
                    'pivot_info': pivot_info,
                    'action': 'need_swap',
                    'row': row,
                    'col': col,
                    'details': f'需要行交换：R{row+1} ↔ R{pivot_row+1}'
                })
                
                current = self.row_checker.apply_swap(current, row, pivot_row)
                steps.append({
                    'step_type': 'swap',
                    'matrix': deepcopy(current),
                    'row1': row,
                    'row2': pivot_row,
                    'details': f'执行行交换：R{row+1} ↔ R{pivot_row+1}'
                })
            
            if abs(current[row][col]) <= self.tolerance:
                col += 1
                continue
            
            pivot_val = current[row][col]
            
            for i in range(row + 1, n_rows):
                factor = current[i][col] / pivot_val
                if abs(factor) > self.tolerance:
                    current = self.row_checker.apply_add(current, i, row, -factor)
                    steps.append({
                        'step_type': 'eliminate',
                        'matrix': deepcopy(current),
                        'target_row': i,
                        'source_row': row,
                        'factor': -factor,
                        'pivot_col': col,
                        'details': f'消元：R{i+1} = R{i+1} + ({-factor}) × R{row+1}（消去第{col+1}列）'
                    })
            
            row += 1
            col += 1
        
        return steps

    def get_echelon_form(self, matrix: List[List[Fraction]]) -> List[List[Fraction]]:
        steps = self.forward_elimination(matrix)
        if steps:
            return steps[-1]['matrix']
        return deepcopy(matrix)

    def normalize_pivots(self, matrix: List[List[Fraction]]) -> List[Dict[str, Any]]:
        steps = []
        current = deepcopy(matrix)
        n_rows = len(current)
        
        for i in range(n_rows):
            pivot_col = None
            pivot_val = None
            
            for j in range(len(current[i])):
                if abs(current[i][j]) > self.tolerance:
                    pivot_col = j
                    pivot_val = current[i][j]
                    break
            
            if pivot_val is not None and abs(pivot_val - 1) > self.tolerance:
                factor = Fraction(1, 1) / pivot_val
                current = self.row_checker.apply_multiply(current, i, factor)
                steps.append({
                    'step_type': 'normalize',
                    'matrix': deepcopy(current),
                    'row': i,
                    'pivot_col': pivot_col,
                    'factor': factor,
                    'details': f'主元归一化：R{i+1} = ({factor}) × R{i+1}'
                })
        
        return steps

    def back_substitution(self, matrix: List[List[Fraction]]) -> List[Dict[str, Any]]:
        steps = []
        current = deepcopy(matrix)
        n_rows = len(current)
        
        for i in range(n_rows - 1, -1, -1):
            pivot_col = None
            
            for j in range(len(current[i])):
                if abs(current[i][j]) > self.tolerance:
                    pivot_col = j
                    break
            
            if pivot_col is None:
                continue
            
            for j in range(i - 1, -1, -1):
                if abs(current[j][pivot_col]) > self.tolerance:
                    factor = -current[j][pivot_col]
                    current = self.row_checker.apply_add(current, j, i, factor)
                    steps.append({
                        'step_type': 'back_substitute',
                        'matrix': deepcopy(current),
                        'target_row': j,
                        'source_row': i,
                        'factor': factor,
                        'pivot_col': pivot_col,
                        'details': f'回代：R{j+1} = R{j+1} + ({factor}) × R{i+1}'
                    })
        
        return steps

    def reduced_row_echelon_form(self, matrix: List[List[Fraction]]) -> Tuple[List[List[Fraction]], List[Dict[str, Any]]]:
        all_steps = []
        
        forward_steps = self.forward_elimination(matrix)
        all_steps.extend(forward_steps)
        
        current = forward_steps[-1]['matrix'] if forward_steps else deepcopy(matrix)
        
        normalize_steps = self.normalize_pivots(current)
        all_steps.extend(normalize_steps)
        
        current = normalize_steps[-1]['matrix'] if normalize_steps else current
        
        back_steps = self.back_substitution(current)
        all_steps.extend(back_steps)
        
        result = back_steps[-1]['matrix'] if back_steps else current
        
        return result, all_steps

    def analyze_special_cases(self, matrix: List[List[Fraction]]) -> Dict[str, Any]:
        result = {
            'rank': 0,
            'has_zero_row': False,
            'has_zero_pivot': False,
            'zero_pivot_locations': [],
            'zero_row_locations': [],
            'is_consistent': True,
            'details': ''
        }
        
        n_rows = len(matrix)
        if n_rows == 0:
            return result
        
        echelon = self.get_echelon_form(matrix)
        
        rank = 0
        for i in range(n_rows):
            is_zero_row = all(abs(echelon[i][j]) <= self.tolerance for j in range(len(echelon[i])))
            
            if is_zero_row:
                result['has_zero_row'] = True
                result['zero_row_locations'].append(i)
            else:
                rank += 1
        
        result['rank'] = rank
        
        for i in range(n_rows):
            pivot_info = self.check_pivot_issues(echelon, i, i)
            if pivot_info['has_issue']:
                result['has_zero_pivot'] = True
                result['zero_pivot_locations'].append((i, i))
        
        details_parts = []
        if result['has_zero_pivot']:
            details_parts.append(f"检测到{len(result['zero_pivot_locations'])}处零主元")
        if result['has_zero_row']:
            details_parts.append(f"存在{len(result['zero_row_locations'])}个零行")
        
        result['details'] = '; '.join(details_parts) if details_parts else '矩阵结构正常'
        
        return result

    def fraction_simplify_check(self, matrix: List[List[Fraction]]) -> List[Dict[str, Any]]:
        issues = []
        
        for i in range(len(matrix)):
            for j in range(len(matrix[i])):
                val = matrix[i][j]
                if val.denominator != 1:
                    gcd_val = self._gcd(val.numerator, val.denominator)
                    if gcd_val > 1:
                        simplified = Fraction(val.numerator // gcd_val, val.denominator // gcd_val)
                        issues.append({
                            'row': i,
                            'col': j,
                            'original': val,
                            'simplified': simplified,
                            'details': f'第{i+1}行第{j+1}列{val}可化简为{simplified}'
                        })
        
        return issues

    def _gcd(self, a: int, b: int) -> int:
        a = abs(a)
        b = abs(b)
        while b:
            a, b = b, a % b
        return a
