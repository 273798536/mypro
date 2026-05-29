"""
数据读取模块
负责从Excel/CSV文件中读取充电订单数据，支持多格式、多Sheet、别名映射
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field

from ..config.settings import get_config


@dataclass
class RawData:
    """原始数据容器"""
    df: pd.DataFrame
    bad_rows: List[Dict[str, Any]] = field(default_factory=list)
    empty_rows: List[int] = field(default_factory=list)
    remark_rows: List[int] = field(default_factory=list)
    column_mapping: Dict[str, str] = field(default_factory=dict)
    missing_columns: List[str] = field(default_factory=list)
    extra_columns: List[str] = field(default_factory=list)
    original_row_numbers: List[int] = field(default_factory=list)
    source_file: str = ""


class DataReader:
    """数据读取器"""

    def __init__(self):
        self.config = get_config()
        self._column_alias_map = self._build_alias_map()

    def _build_alias_map(self) -> Dict[str, str]:
        """构建列别名映射表"""
        alias_map = {}
        for col_def in self.config.required_columns + self.config.optional_columns:
            canonical_name = col_def["name"]
            alias_map[canonical_name.lower()] = canonical_name
            for alias in col_def.get("aliases", []):
                alias_map[str(alias).lower()] = canonical_name
                alias_map[str(alias).strip().lower()] = canonical_name
        return alias_map

    def _detect_header_row(self, df_raw: pd.DataFrame) -> int:
        """检测表头行位置"""
        for i in range(min(10, len(df_raw))):
            row_data = df_raw.iloc[i]
            if isinstance(row_data, dict):
                row = pd.Series(row_data).astype(str).str.lower().str.strip()
            else:
                row = row_data.astype(str).str.lower().str.strip()
            matched = sum(1 for cell in row if cell in self._column_alias_map)
            if matched >= 4:
                return i
        return 0

    def _is_remark_row(self, row: pd.Series) -> bool:
        """判断是否为备注行"""
        non_null = row.dropna()
        if len(non_null) == 0:
            return False
        if len(non_null) == 1:
            val = str(non_null.iloc[0]).strip()
            if val.startswith(("#", "备注", "说明", "注：", "注:")):
                return True
        return False

    def _is_empty_row(self, row: pd.Series) -> bool:
        """判断是否为空行"""
        return row.isna().all() or (row.astype(str).str.strip() == "").all()

    def _map_columns(self, columns: List[str]) -> Tuple[Dict[str, str], List[str], List[str]]:
        """映射列名到标准名"""
        mapping = {}
        missing = []
        extra = []

        required_names = [c["name"] for c in self.config.required_columns]
        optional_names = [c["name"] for c in self.config.optional_columns]
        all_known = set(required_names + optional_names)

        for col in columns:
            col_lower = str(col).strip().lower()
            if col_lower in self._column_alias_map:
                canonical = self._column_alias_map[col_lower]
                mapping[col] = canonical
            else:
                extra.append(col)

        mapped_names = set(mapping.values())
        for req in required_names:
            if req not in mapped_names:
                missing.append(req)

        return mapping, missing, extra

    def read_excel(self, file_path: str, sheet_name: Optional[str] = None) -> RawData:
        """读取Excel文件"""
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        df_raw = pd.read_excel(file_path, sheet_name=sheet_name, header=None, dtype=object)

        if isinstance(df_raw, dict):
            first_sheet = list(df_raw.keys())[0]
            df_raw = df_raw[first_sheet]

        header_row = self._detect_header_row(df_raw)
        df_with_header = pd.read_excel(
            file_path, sheet_name=sheet_name, header=header_row, dtype=object
        )

        if isinstance(df_with_header, dict):
            first_sheet = list(df_with_header.keys())[0]
            df_with_header = df_with_header[first_sheet]

        column_mapping, missing_columns, extra_columns = self._map_columns(df_with_header.columns)

        df_renamed = df_with_header.rename(columns=column_mapping)

        bad_rows = []
        empty_rows = []
        remark_rows = []
        original_row_numbers = []

        valid_rows = []
        for idx, row in df_renamed.iterrows():
            actual_row_num = header_row + idx + 2

            if self._is_empty_row(row):
                empty_rows.append(actual_row_num)
                continue

            if self._is_remark_row(row):
                remark_rows.append(actual_row_num)
                continue

            has_required = all(
                not pd.isna(row.get(col, None))
                for col in [c["name"] for c in self.config.required_columns]
                if col in df_renamed.columns
            )

            if not has_required:
                bad_rows.append({
                    "row_number": actual_row_num,
                    "reason": "缺少必填列数据",
                    "missing_fields": [
                        col for col in [c["name"] for c in self.config.required_columns]
                        if pd.isna(row.get(col, None))
                    ],
                    "raw_data": row.to_dict()
                })
                continue

            original_row_numbers.append(actual_row_num)
            valid_rows.append(row)

        if valid_rows:
            df_clean = pd.DataFrame(valid_rows).reset_index(drop=True)
        else:
            df_clean = pd.DataFrame(columns=list(column_mapping.values()))

        df_clean["_original_row_number"] = original_row_numbers

        return RawData(
            df=df_clean,
            bad_rows=bad_rows,
            empty_rows=empty_rows,
            remark_rows=remark_rows,
            column_mapping=column_mapping,
            missing_columns=missing_columns,
            extra_columns=extra_columns,
            original_row_numbers=original_row_numbers,
            source_file=str(file_path)
        )

    def read_file(self, file_path: str, sheet_name: Optional[str] = None) -> RawData:
        """通用文件读取入口"""
        file_path = Path(file_path)
        suffix = file_path.suffix.lower()

        if suffix in [".xlsx", ".xls"]:
            return self.read_excel(file_path, sheet_name)
        elif suffix == ".csv":
            raise NotImplementedError("CSV读取暂未实现")
        else:
            raise ValueError(f"不支持的文件格式: {suffix}")
