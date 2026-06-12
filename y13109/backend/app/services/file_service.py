import io
import pandas as pd
from typing import List, Tuple
from app.models.matrix import MatrixData, MatrixRecord
from app.services.matrix_service import generate_id


def parse_csv(content: bytes, filename: str) -> List[MatrixRecord]:
    df = pd.read_csv(io.BytesIO(content), header=None)
    records = []

    matrix_rows = []
    current_name = None
    row_idx = 0

    for _, row in df.iterrows():
        values = [float(v) for v in row.tolist() if pd.notna(v)]

        if not values:
            if matrix_rows and current_name:
                record = _build_record(current_name, matrix_rows, filename)
                records.append(record)
            matrix_rows = []
            current_name = None
            row_idx = 0
            continue

        if row_idx == 0 and len(values) == 1:
            current_name = str(values[0])
            row_idx += 1
        else:
            matrix_rows.append(values)
            row_idx += 1

    if matrix_rows and current_name:
        record = _build_record(current_name, matrix_rows, filename)
        records.append(record)

    if not records and matrix_rows:
        record = _build_record(f"{filename}_matrix_1", matrix_rows, filename)
        records.append(record)

    return records


def parse_excel(content: bytes, filename: str) -> List[MatrixRecord]:
    xls = pd.ExcelFile(io.BytesIO(content))
    records = []

    for sheet_name in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
        matrix_rows = []

        for _, row in df.iterrows():
            values = [float(v) for v in row.tolist() if pd.notna(v)]
            if values:
                matrix_rows.append(values)

        if matrix_rows:
            record = _build_record(sheet_name, matrix_rows, filename)
            records.append(record)

    return records


def _build_record(name: str, rows: List[List[float]], source_file: str) -> MatrixRecord:
    if not rows:
        matrix_data = MatrixData(rows=0, cols=0, values=[])
    else:
        max_cols = max(len(r) for r in rows)
        normalized_rows = []
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
        raise ValueError(f"不支持的文件格式: {filename}")
