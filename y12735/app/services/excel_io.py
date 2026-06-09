from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Optional

import pandas as pd

from app.models import DataPoint, FitBounds, FitConstraint


class ExcelParseError(ValueError):
    pass


@dataclass
class ExcelReadResult:
    data_points: list[DataPoint]
    constraints: list[FitConstraint]
    bounds: Optional[FitBounds]
    sheet_names: list[str]
    title: str


def _locate_xy_columns(df: pd.DataFrame) -> tuple[str, str]:
    cols_lower = {str(c).strip().lower(): str(c) for c in df.columns}

    candidates_x = ["x", "自变量", "x值", "x轴"]
    candidates_y = ["y", "因变量", "y值", "y轴", "测量值"]

    x_col = None
    y_col = None
    for key in candidates_x:
        if key in cols_lower:
            x_col = cols_lower[key]
            break
    for key in candidates_y:
        if key in cols_lower:
            y_col = cols_lower[key]
            break

    if x_col is None or y_col is None:
        if len(df.columns) >= 2:
            x_col = str(df.columns[0])
            y_col = str(df.columns[1])
        else:
            raise ExcelParseError(
                "无法自动识别 x/y 列。请确保计算草稿中至少存在两列数据，"
                "或使用『x』『y』作为列名。若计算草稿缺页，请补全后重新上传。"
            )
    return x_col, y_col


def read_excel_draft(file_bytes: bytes, filename: str) -> ExcelReadResult:
    try:
        xls = pd.ExcelFile(io.BytesIO(file_bytes), engine="openpyxl")
    except Exception as exc:  # noqa: BLE001
        raise ExcelParseError(
            f"无法读取文件 {filename}：{exc}。请确认该文件是有效的 .xlsx 计算草稿，且未损坏或缺页。"
        ) from exc

    sheet_names = xls.sheet_names
    if not sheet_names:
        raise ExcelParseError(
            f"文件 {filename} 中没有任何工作表，请检查计算草稿是否为空或上传了错误的文件。"
        )

    all_points: list[DataPoint] = []
    constraints: list[FitConstraint] = []
    bounds = FitBounds()
    title = filename.rsplit(".", 1)[0]

    global_index = 0
    for sheet in sheet_names:
        df = pd.read_excel(xls, sheet_name=sheet)
        if df.empty:
            continue

        if "标题" in df.columns and not df["标题"].dropna().empty:
            title = str(df["标题"].dropna().iloc[0])

        constraint_cols = [c for c in df.columns if "约束" in str(c) or "constraint" in str(c).lower()]
        for cc in constraint_cols:
            for _, row in df.iterrows():
                val = row.get(cc)
                if pd.isna(val):
                    continue
                text = str(val).strip()
                if "≤" in text or ">=" in text or "<=" in text or "≥" in text:
                    try:
                        param_name, rest = text.split(":", 1) if ":" in text else (text.split()[0], text)
                        if "≤" in rest or "<=" in rest:
                            sep = "≤" if "≤" in rest else "<="
                            upper = float(rest.split(sep)[-1].strip())
                            constraints.append(
                                FitConstraint(param_name=param_name.strip(), upper=upper, description=text)
                            )
                        if "≥" in rest or ">=" in rest:
                            sep = "≥" if "≥" in rest else ">="
                            lower = float(rest.split(sep)[-1].strip())
                            constraints.append(
                                FitConstraint(param_name=param_name.strip(), lower=lower, description=text)
                            )
                    except (ValueError, IndexError):
                        continue

        bound_map = {
            "x_min": ("x_min", "x下限", "x最小值"),
            "x_max": ("x_max", "x上限", "x最大值"),
            "y_min": ("y_min", "y下限", "y最小值"),
            "y_max": ("y_max", "y上限", "y最大值"),
        }
        for attr, candidates in bound_map.items():
            for cand in candidates:
                if cand in df.columns:
                    vals = df[cand].dropna()
                    if not vals.empty:
                        setattr(bounds, attr, float(vals.iloc[0]))
                        break

        try:
            x_col, y_col = _locate_xy_columns(df)
        except ExcelParseError:
            continue

        for i, (_, row) in enumerate(df.iterrows()):
            try:
                x_val = float(row[x_col])
                y_val = float(row[y_col])
            except (ValueError, TypeError):
                continue
            all_points.append(
                DataPoint(
                    x=x_val,
                    y=y_val,
                    index=global_index,
                    source_sheet=sheet,
                    source_cell=f"{chr(ord('A') + df.columns.get_loc(x_col))}{i + 2}",
                )
            )
            global_index += 1

    if not all_points:
        raise ExcelParseError(
            f"文件 {filename} 中未读取到任何有效 x/y 数据。请检查计算草稿中是否存在数据，"
            f"以及列名是否规范。若计算草稿存在缺页，请补全对应数据页。"
        )

    has_any_bound = any(
        [bounds.x_min, bounds.x_max, bounds.y_min, bounds.y_max]
    )
    return ExcelReadResult(
        data_points=all_points,
        constraints=constraints,
        bounds=bounds if has_any_bound else None,
        sheet_names=sheet_names,
        title=title,
    )
