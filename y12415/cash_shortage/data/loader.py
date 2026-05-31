import pandas as pd
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

from cash_shortage.config import FIELD_SPECS


@dataclass
class RawDataset:
    raw_df: pd.DataFrame
    canonical_df: pd.DataFrame
    source_file: str


class DataLoader:
    def __init__(self, keep_raw: bool = True):
        self.keep_raw = keep_raw

    def load(self, file_path: str) -> RawDataset:
        file = Path(file_path)
        if not file.exists():
            raise FileNotFoundError(f"数据源文件不存在: {file_path}")

        if file.suffix == ".csv":
            raw_df = pd.read_csv(file, dtype=str, keep_default_na=False)
        elif file.suffix in (".xlsx", ".xls"):
            raw_df = pd.read_excel(file, dtype=str, keep_default_na=False)
        else:
            raise ValueError(f"不支持的文件格式: {file.suffix}")

        canonical_df = self._to_canonical(raw_df)

        if not self.keep_raw:
            raw_df = pd.DataFrame()

        return RawDataset(
            raw_df=raw_df,
            canonical_df=canonical_df,
            source_file=str(file),
        )

    def _to_canonical(self, raw_df: pd.DataFrame) -> pd.DataFrame:
        col_mapping = {}
        for canonical_key, spec in FIELD_SPECS.items():
            if spec.raw_column in raw_df.columns:
                col_mapping[spec.raw_column] = canonical_key

        df = raw_df.rename(columns=col_mapping).copy()

        for canonical_key, spec in FIELD_SPECS.items():
            if canonical_key not in df.columns:
                df[canonical_key] = ""
                continue
            if spec.dtype == "date":
                df[canonical_key] = pd.to_datetime(df[canonical_key], errors="coerce").dt.date
            elif spec.dtype == "float":
                df[canonical_key] = pd.to_numeric(df[canonical_key], errors="coerce").fillna(0.0)
            elif spec.dtype == "int":
                df[canonical_key] = pd.to_numeric(df[canonical_key], errors="coerce").fillna(0).astype(int)

        return df[list(FIELD_SPECS.keys())]
