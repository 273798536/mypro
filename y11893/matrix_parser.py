import re
from fractions import Fraction
from typing import List, Optional, Tuple, Dict, Any


class MatrixParser:
    def __init__(self, tolerance: float = 1e-9):
        self.tolerance = tolerance

    def clean_element(self, element_str: str) -> Optional[Fraction]:
        element_str = str(element_str).strip()
        
        if not element_str or element_str.lower() in ['', 'nan', 'none', 'null', '-', '—', '空', '无']:
            return None
        
        element_str = re.sub(r'#.*$', '', element_str).strip()
        element_str = re.sub(r'\(.*?\)', '', element_str).strip()
        element_str = re.sub(r'（.*?）', '', element_str).strip()
        element_str = element_str.strip()
        
        if not element_str:
            return None
        
        try:
            if '/' in element_str:
                return Fraction(element_str)
            return Fraction(element_str)
        except ValueError:
            try:
                return Fraction(float(element_str))
            except ValueError:
                match = re.match(r'^\s*(-?\d*\.?\d+)\s*$', element_str)
                if match:
                    return Fraction(float(match.group(1)))
                return None

    def parse_row(self, row_str: str) -> List[Optional[Fraction]]:
        row_str = str(row_str).strip()
        
        if row_str.lower().startswith(('备注', 'note', '#', '//', '--')):
            return []
        
        row_str = re.sub(r'#.*$', '', row_str).strip()
        row_str = re.sub(r'\[.*?\]', '', row_str)
        row_str = re.sub(r'\(.*?\)', '', row_str)
        
        separators = [r'\s+', ',', ';', '&', '\t']
        elements = None
        max_parts = 0
        
        for sep in separators:
            parts = re.split(sep, row_str)
            parts = [p.strip() for p in parts if p.strip()]
            if len(parts) > max_parts:
                max_parts = len(parts)
                elements = parts
            if max_parts >= len(row_str.split()):
                break
        
        if elements is None:
            elements = [row_str] if row_str else []
        
        result = []
        for elem in elements:
            val = self.clean_element(elem)
            result.append(val)
        
        return result

    def parse_matrix(self, matrix_input: List[str]) -> List[List[Optional[Fraction]]]:
        rows = []
        for row_str in matrix_input:
            parsed = self.parse_row(row_str)
            if parsed:
                rows.append(parsed)
        
        if not rows:
            return []
        
        max_cols = max(len(r) for r in rows)
        for row in rows:
            while len(row) < max_cols:
                row.append(None)
        
        return rows

    def is_valid_matrix(self, matrix: List[List[Optional[Fraction]]]) -> bool:
        if not matrix:
            return False
        for row in matrix:
            has_valid = any(elem is not None for elem in row)
            if has_valid:
                return True
        return False

    def fill_missing(self, matrix: List[List[Optional[Fraction]]], fill_value: Fraction = Fraction(0)) -> List[List[Fraction]]:
        result = []
        for row in matrix:
            new_row = []
            for elem in row:
                if elem is None:
                    new_row.append(fill_value)
                else:
                    new_row.append(elem)
            result.append(new_row)
        return result

    def parse_step_description(self, step_str: str) -> Dict[str, Any]:
        step_str = str(step_str).strip()
        
        result = {
            'operation': None,
            'row1': None,
            'row2': None,
            'scalar': Fraction(1),
            'original': step_str
        }
        
        step_lower = step_str.lower()
        
        swap_match = re.search(r'r(\d+)\s*[↔<>]\s*r(\d+)', step_lower)
        if swap_match:
            result['operation'] = 'swap'
            result['row1'] = int(swap_match.group(1)) - 1
            result['row2'] = int(swap_match.group(2)) - 1
            return result
        
        swap_match2 = re.search(r'交换\s*[↔<>]\s*(\d+)', step_lower)
        if swap_match2:
            result['operation'] = 'swap'
            result['row1'] = int(swap_match2.group(1)) - 1
            result['row2'] = int(swap_match2.group(2)) - 1
            return result
        
        mult_match = re.search(r'(\d*\.?\d+)\s*\*\s*r(\d+)', step_lower)
        if mult_match:
            result['operation'] = 'multiply'
            scalar_str = mult_match.group(1)
            result['scalar'] = Fraction(scalar_str) if scalar_str else Fraction(1)
            result['row1'] = int(mult_match.group(2)) - 1
            return result
        
        add_match = re.search(r'r(\d+)\s*[\+\-]\s*(\d*\.?\d+)\s*\*\s*r(\d+)', step_lower)
        if add_match:
            result['operation'] = 'add'
            result['row1'] = int(add_match.group(1)) - 1
            scalar_str = add_match.group(2)
            result['scalar'] = Fraction(scalar_str) if scalar_str else Fraction(1)
            if '-' in step_lower[add_match.start():add_match.start() + 10]:
                result['scalar'] = -result['scalar']
            result['row2'] = int(add_match.group(3)) - 1
            return result
        
        return result

    def matrix_to_string(self, matrix: List[List[Fraction]]) -> str:
        lines = []
        for row in matrix:
            row_str = []
            for elem in row:
                if elem.denominator == 1:
                    row_str.append(str(elem.numerator))
                else:
                    row_str.append(f"{elem.numerator}/{elem.denominator}")
            lines.append("\t".join(row_str))
        return "\n".join(lines)
