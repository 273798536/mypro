import io
import pandas as pd
from typing import List, Tuple, Optional
from app.models.matrix import MatrixData, MatrixRecord
from app.services.matrix_service import generate_id


def parse_csv(content: bytes, filename: str) -> List[MatrixRecord]:
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        text = content.decode('gbk', errors='ignore')

    lines = [line.rstrip('\n\r') for line in text.split('\n')]

    records = []
    matrix_rows: List[List[float]] = []
    current_name: Optional[str] = None

    def flush_record():
        nonlocal matrix_rows, current_name
        if current_name is not None and (matrix_rows or True):
            record = _build_record(current_name, matrix_rows, filename)
            records.append(record)
        matrix_rows = []
        current_name = None

    for raw_line in lines:
        line = raw_line.strip()

        if not line:
            flush_record()
            continue

        parts = [p.strip() for p in line.split(',')]
        parts = [p for p in parts if p != '']

        if not parts:
            flush_record()
            continue

        numeric_values: List[float] = []
        all_numeric = True
        for p in parts:
            try:
                numeric_values.append(float(p))
            except ValueError:
                all_numeric = False
                break

        if all_numeric and len(numeric_values) > 0:
            matrix_rows.append(numeric_values)
        else:
            if matrix_rows or current_name is not None:
                flush_record()
            current_name = parts[0] if parts else f"{filename}_matrix_{len(records) + 1}"

    flush_record()

    if not records:
        raise ValueError(
            "CSV文件解析失败：未找到有效的矩阵数据。"
            "请检查文件格式：每个矩阵第一行是名称，接下来各行是用逗号分隔的数字，矩阵之间用空行分隔。"
        )

    return records


def parse_excel(content: bytes, filename: str) -> List[MatrixRecord]:
    try:
        xls = pd.ExcelFile(io.BytesIO(content))
    except Exception as e:
        raise ValueError(f"Excel文件读取失败：{str(e)}。请检查文件是否为有效的Excel格式。")

    records = []

    for sheet_name in xls.sheet_names:
        try:
            df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
        except Exception as e:
            continue

        matrix_rows: List[List[float]] = []

        for _, row in df.iterrows():
            values: List[float] = []
            for v in row.tolist():
                if pd.notna(v):
                    try:
                        values.append(float(v))
                    except (ValueError, TypeError):
                        pass
            if values:
                matrix_rows.append(values)

        if matrix_rows:
            record = _build_record(str(sheet_name), matrix_rows, filename)
            records.append(record)

    if not records:
        raise ValueError(
            "Excel文件解析失败：未找到有效的数值矩阵。"
            "每个Sheet应为一个矩阵，数据需为纯数值格式。"
        )

    return records


def _build_record(name: str, rows: List[List[float]], source_file: str) -> MatrixRecord:
    if not rows:
        matrix_data = MatrixData(rows=0, cols=0, values=[])
    else:
        max_cols = max(len(r) for r in rows)
        normalized_rows: List[List[float]] = []
        for r in rows:
            if len(r) < max_cols:
                r = r + [0.0] * (max_cols - len(r))
            normalized_rows.append(r)

        matrix_data = MatrixData(
            rows=len(normalized_rows),
            cols=max_cols,
            values=normalized_rows
        )

    return MatrixRecord(
        id=generate_id(),
        name=name,
        matrix=matrix_data,
        source_file=source_file
    )


def parse_file(content: bytes, filename: str) -> List[MatrixRecord]:
    lower_name = filename.lower()
    if lower_name.endswith('.csv'):
        return parse_csv(content, filename)
    elif lower_name.endswith(('.xlsx', '.xls')):
        return parse_excel(content, filename)
    else:
        raise ValueError(
            f"不支持的文件格式：{filename}。"
            "仅支持 CSV（.csv）和 Excel（.xlsx/.xls）格式。"
        )
