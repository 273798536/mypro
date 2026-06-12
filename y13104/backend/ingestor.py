import io
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session

from models import ParameterSheet, ParameterRow, ChangeLog
from column_mapper import match_columns, extract_unit_from_row


def _coerce_float(v) -> Optional[float]:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace(",", "").replace("%", "")
    try:
        return float(s)
    except ValueError:
        return None


def _coerce_str(v) -> Optional[str]:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    s = str(v).strip()
    return s if s else None


def load_excel(file_bytes: bytes, file_name: str) -> pd.DataFrame:
    buf = io.BytesIO(file_bytes)
    if file_name.lower().endswith(".csv"):
        return pd.read_csv(buf, dtype=object)
    return pd.read_excel(buf, dtype=object)


def ingest_parameter_sheet(
    db: Session,
    df: pd.DataFrame,
    file_name: str,
    version: str,
    uploaded_by: str = "unknown",
    notes: str = "",
) -> Tuple[ParameterSheet, List[Dict], List[Dict]]:
    raw_columns = [str(c) for c in df.columns.tolist()]
    mapping, matches_report = match_columns(raw_columns)

    sheet = ParameterSheet(
        file_name=file_name,
        uploaded_by=uploaded_by,
        version=version,
        column_mapping=mapping,
        raw_columns=raw_columns,
        notes=notes,
    )
    db.add(sheet)
    db.flush()

    rows_with_issues: List[Dict] = []

    for idx, (_, row) in enumerate(df.iterrows()):
        excel_row_number = idx + 2
        raw_data = {k: (None if (isinstance(v, float) and np.isnan(v)) else v)
                    for k, v in row.to_dict().items()}

        warnings: List[str] = []

        def g(key: str):
            col = mapping.get(key)
            return raw_data.get(col) if col else None

        security_code = _coerce_str(g("security_code"))
        security_name = _coerce_str(g("security_name"))
        weight = _coerce_float(g("weight"))
        x_value = _coerce_float(g("x_value"))
        y_value = _coerce_float(g("y_value"))
        breakpoint_val = _coerce_float(g("breakpoint"))

        unit, unit_source = extract_unit_from_row(raw_data, raw_columns)
        if unit is None:
            warnings.append("未识别到单位，请复核：" +
                            "原始表字段=" + ", ".join(
                                f"{k}={v}" for k, v in raw_data.items() if v is not None)[:80])

        if x_value is None:
            warnings.append("X值缺失")
        if y_value is None:
            warnings.append("Y值缺失")
        if weight is None:
            warnings.append("权重缺失（若后续被修改请在变更日志留痕）")
        if not security_code:
            warnings.append("证券代码缺失")

        row_status = "warning" if warnings else "ok"

        param_row = ParameterRow(
            sheet_id=sheet.id,
            excel_row_number=excel_row_number,
            raw_data=raw_data,
            security_code=security_code,
            security_name=security_name,
            weight=weight,
            x_value=x_value,
            y_value=y_value,
            unit=unit,
            unit_source=unit_source,
            breakpoint=breakpoint_val,
            row_status=row_status,
            warnings=warnings,
        )
        db.add(param_row)

        if warnings:
            rows_with_issues.append({
                "excel_row_number": excel_row_number,
                "security_code": security_code,
                "security_name": security_name,
                "warnings": warnings,
                "raw_data_preview": {k: v for k, v in list(raw_data.items())[:6]},
            })

    db.commit()
    db.refresh(sheet)
    return sheet, matches_report, rows_with_issues


def update_parameter_row(
    db: Session,
    row_id: int,
    field_name: str,
    new_value: Any,
    changed_by: str = "unknown",
    reason: str = "",
) -> Optional[ParameterRow]:
    row = db.query(ParameterRow).filter(ParameterRow.id == row_id).first()
    if not row:
        return None

    old_value = getattr(row, field_name, None)
    if old_value == new_value:
        return row

    setattr(row, field_name, new_value)

    log = ChangeLog(
        sheet_id=row.sheet_id,
        param_row_id=row.id,
        changed_by=changed_by,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        reason=reason,
    )
    db.add(log)
    db.commit()
    db.refresh(row)
    return row
