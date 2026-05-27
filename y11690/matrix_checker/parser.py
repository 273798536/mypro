"""矩阵文件解析模块 - 支持多种格式的矩阵输入"""

import re
from pathlib import Path
from typing import List, Tuple, Union
import numpy as np


class MatrixParseError(Exception):
    """矩阵解析错误"""
    def __init__(self, message: str, line: int = None, column: int = None):
        self.line = line
        self.column = column
        super().__init__(f"[第{line}行]" if line else "" + message)


class MatrixParser:
    """矩阵文件解析器"""

    SUPPORTED_FORMATS = {'.txt', '.csv', '.mat', '.json'}

    @staticmethod
    def parse_file(file_path: Union[str, Path]) -> Tuple[np.ndarray, dict]:
        """
        从文件解析矩阵
        返回: (矩阵数据, 元数据字典)
        """
        path = Path(file_path)
        if not path.exists():
            raise MatrixParseError(f"文件不存在: {file_path}")

        suffix = path.suffix.lower()
        if suffix not in MatrixParser.SUPPORTED_FORMATS:
            raise MatrixParseError(
                f"不支持的格式: {suffix}，支持: {MatrixParser.SUPPORTED_FORMATS}"
            )

        if suffix == '.txt':
            return MatrixParser._parse_txt(path)
        elif suffix == '.csv':
            return MatrixParser._parse_csv(path)
        elif suffix == '.mat':
            return MatrixParser._parse_mat(path)
        elif suffix == '.json':
            return MatrixParser._parse_json(path)

    @staticmethod
    def parse_string(content: str, fmt: str = 'txt') -> Tuple[np.ndarray, dict]:
        """从字符串解析矩阵"""
        if fmt == 'txt':
            return MatrixParser._parse_txt_content(content)
        elif fmt == 'csv':
            return MatrixParser._parse_csv_content(content)
        else:
            raise MatrixParseError(f"不支持的字符串格式: {fmt}")

    @staticmethod
    def _parse_txt(path: Path) -> Tuple[np.ndarray, dict]:
        """解析空格/制表符分隔的文本矩阵"""
        content = path.read_text(encoding='utf-8')
        return MatrixParser._parse_txt_content(content, source_file=str(path))

    @staticmethod
    def _parse_txt_content(content: str, source_file: str = None) -> Tuple[np.ndarray, dict]:
        """解析文本格式矩阵内容"""
        lines = content.strip().split('\n')
        metadata = {}
        data_lines = []
        in_data = False

        for i, line in enumerate(lines, 1):
            line = line.strip()
            if not line or line.startswith('#'):
                if line.startswith('#') and '=' in line:
                    key, value = line[1:].split('=', 1)
                    metadata[key.strip()] = value.strip()
                continue

            if not in_data:
                in_data = True

            try:
                values = [float(x) for x in re.split(r'[\s,]+', line) if x]
                data_lines.append(values)
            except ValueError as e:
                raise MatrixParseError(f"无效数值: {line}", line=i)

        if not data_lines:
            raise MatrixParseError("矩阵数据为空")

        row_lengths = [len(row) for row in data_lines]
        if len(set(row_lengths)) > 1:
            raise MatrixParseError(
                f"行长度不一致: {set(row_lengths)}，请检查矩阵维度"
            )

        matrix = np.array(data_lines, dtype=np.float64)
        metadata['source'] = source_file or 'string'
        metadata['format'] = 'txt'
        metadata['shape'] = matrix.shape
        return matrix, metadata

    @staticmethod
    def _parse_csv(path: Path) -> Tuple[np.ndarray, dict]:
        """解析CSV格式矩阵"""
        content = path.read_text(encoding='utf-8')
        return MatrixParser._parse_csv_content(content, source_file=str(path))

    @staticmethod
    def _parse_csv_content(content: str, source_file: str = None) -> Tuple[np.ndarray, dict]:
        """解析CSV格式内容"""
        lines = content.strip().split('\n')
        metadata = {}
        data_lines = []
        header_skipped = False

        for i, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue

            if line.startswith('#'):
                if '=' in line:
                    key, value = line[1:].split('=', 1)
                    metadata[key.strip()] = value.strip()
                continue

            values = line.split(',')
            try:
                numeric_values = [float(v.strip()) for v in values]
                data_lines.append(numeric_values)
            except ValueError:
                if not header_skipped and i == 1:
                    metadata['header'] = values
                    header_skipped = True
                    continue
                raise MatrixParseError(f"无效CSV数据: {line}", line=i)

        if not data_lines:
            raise MatrixParseError("矩阵数据为空")

        row_lengths = [len(row) for row in data_lines]
        if len(set(row_lengths)) > 1:
            raise MatrixParseError(
                f"CSV行长度不一致: {set(row_lengths)}"
            )

        matrix = np.array(data_lines, dtype=np.float64)
        metadata['source'] = source_file or 'string'
        metadata['format'] = 'csv'
        metadata['shape'] = matrix.shape
        return matrix, metadata

    @staticmethod
    def _parse_mat(path: Path) -> Tuple[np.ndarray, dict]:
        """解析MATLAB格式矩阵(简化)"""
        content = path.read_text(encoding='utf-8')
        metadata = {}
        matrices = {}

        pattern = r'(\w+)\s*=\s*\[([^\]]+)\]'
        for match in re.finditer(pattern, content):
            name = match.group(1)
            data_str = match.group(2)
            rows = data_str.strip().split(';')
            data = []
            for row in rows:
                row = row.strip()
                if row:
                    values = [float(x) for x in re.split(r'[\s,]+', row) if x]
                    data.append(values)
            if data:
                matrices[name] = np.array(data, dtype=np.float64)

        if not matrices:
            raise MatrixParseError("未找到MATLAB格式矩阵")

        matrix = list(matrices.values())[0]
        metadata['source'] = str(path)
        metadata['format'] = 'mat'
        metadata['matrix_names'] = list(matrices.keys())
        metadata['shape'] = matrix.shape
        return matrix, metadata

    @staticmethod
    def _parse_json(path: Path) -> Tuple[np.ndarray, dict]:
        """解析JSON格式矩阵"""
        import json
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as e:
            raise MatrixParseError(f"JSON解析错误: {e}")

        if isinstance(data, dict):
            if 'matrix' in data or 'data' in data:
                key = 'matrix' if 'matrix' in data else 'data'
                matrix = np.array(data[key], dtype=np.float64)
                metadata = {k: v for k, v in data.items() if k not in ('matrix', 'data')}
            else:
                raise MatrixParseError("JSON中未找到matrix或data字段")
        elif isinstance(data, list):
            matrix = np.array(data, dtype=np.float64)
            metadata = {}
        else:
            raise MatrixParseError("JSON格式必须是数组或对象")

        metadata['source'] = str(path)
        metadata['format'] = 'json'
        metadata['shape'] = matrix.shape
        return matrix, metadata

    @staticmethod
    def parse_steps(steps_str: str) -> List[dict]:
        """
        解析学生步骤字符串
        格式: 每行一个步骤，用逗号分隔参数
        例如:
          # 注释行
          0,0,0,0,2,2,2,2  # A的(0,0)块 x B的(0,0)块
          0,1,0,0,2,2,2,2  # A的(0,1)块 x B的(1,0)块
        """
        steps = []
        lines = steps_str.strip().split('\n')

        for i, line in enumerate(lines, 1):
            line = line.strip()
            if not line or line.startswith('#'):
                continue

            parts = [x.strip() for x in line.split('#')[0].split(',')]
            if len(parts) < 8:
                raise MatrixParseError(
                    f"步骤格式错误，需要8个参数(ai,aj,bi,bj,ar,ac,br,bc)，实际{len(parts)}个",
                    line=i
                )

            try:
                step = {
                    'a_block_row': int(parts[0]),
                    'a_block_col': int(parts[1]),
                    'b_block_row': int(parts[2]),
                    'b_block_col': int(parts[3]),
                    'a_rows': int(parts[4]),
                    'a_cols': int(parts[5]),
                    'b_rows': int(parts[6]),
                    'b_cols': int(parts[7]),
                    'line_number': i
                }
                if len(parts) > 8:
                    step['comment'] = ','.join(parts[8:])
                steps.append(step)
            except ValueError:
                raise MatrixParseError(f"无效的步骤参数: {line}", line=i)

        return steps

    @staticmethod
    def validate_dimensions(a_shape: Tuple, b_shape: Tuple, block_size: int) -> dict:
        """
        验证矩阵维度和分块大小
        返回包含各类问题的字典
        """
        issues = {
            'errors': [],
            'warnings': [],
            'info': []
        }

        if a_shape[1] != b_shape[0]:
            issues['errors'].append(
                f"矩阵维度不匹配: A({a_shape[0]}x{a_shape[1]}) "
                f"和 B({b_shape[0]}x{b_shape[1]}) 无法相乘"
            )

        if block_size <= 0:
            issues['errors'].append(f"分块大小必须为正整数，当前: {block_size}")

        if a_shape[1] % block_size != 0:
            issues['warnings'].append(
                f"A的列({a_shape[1]})不能被分块大小({block_size})整除，"
                f"会产生不规则分块"
            )

        if b_shape[0] % block_size != 0:
            issues['warnings'].append(
                f"B的行({b_shape[0]})不能被分块大小({block_size})整除，"
                f"会产生不规则分块"
            )

        if block_size > min(a_shape[0], a_shape[1], b_shape[1]):
            issues['warnings'].append(
                f"分块大小({block_size})超过矩阵最小维度，分块无意义"
            )

        return issues
