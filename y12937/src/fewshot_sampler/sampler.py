from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from fewshot_sampler.schemas import (
    AnomalyDetail,
    AnomalyType,
    SampleBatch,
    SampleRecord,
    SampleSource,
    SamplingConfig,
)


class FewShotSampler:
    UNIT_PATTERN = re.compile(
        r"(元|万元|亿元|美元|斤|公斤|吨|个|件|箱|米|平方米|%|小时|天|月|年|次|人)$"
    )
    NEED_UNIT_FIELDS = {"金额", "价格", "数量", "重量", "面积", "长度", "时长", "次数", "人数"}
    SUPPLEMENT_KEYWORDS = ["补录", "补填", "更正", "修正", "后续补充", "备注", "后补", "说明:"]
    OLD_SCHEMA_FIELDS = ["旧编号", "老系统编码", "legacy_id", "old_code", "历史编号", "原ID"]
    TRUNCATE_MAX_LEN = 500

    def __init__(self, config: Optional[SamplingConfig] = None):
        self.config = config or SamplingConfig()
        self.config.validate()
        self._rng = np.random.default_rng(self.config.seed)

    def load_dataframe(self, file_path: str, sheet_name: Optional[str] = None) -> pd.DataFrame:
        if file_path.lower().endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path, sheet_name=sheet_name or 0, dtype=object)
        elif file_path.lower().endswith(".csv"):
            df = pd.read_csv(file_path, dtype=object)
        else:
            raise ValueError(f"不支持的文件格式: {file_path}")
        df = df.where(pd.notnull(df), None)
        return df

    def detect_anomalies(self, df: pd.DataFrame) -> List[List[AnomalyDetail]]:
        records_anomalies: List[List[AnomalyDetail]] = []
        columns = list(df.columns)

        version_col = self._find_version_col(columns)
        date_col = self._find_date_col(columns)

        for idx, row in df.iterrows():
            row_anomalies: List[AnomalyDetail] = []

            for col in columns:
                val = row[col]
                val_str = str(val).strip() if val is not None else ""

                if self._is_old_schema_field(col):
                    row_anomalies.append(
                        AnomalyDetail(
                            anomaly_type=AnomalyType.OLD_SCHEMA,
                            field_name=col,
                            description=f"字段 '{col}' 属于旧系统表结构，建议迁移到新字段",
                            severity=0.3,
                            raw_value=val,
                        )
                    )

                if self._needs_unit(col) and val_str and not self._has_unit(val_str):
                    row_anomalies.append(
                        AnomalyDetail(
                            anomaly_type=AnomalyType.MISSING_UNIT,
                            field_name=col,
                            description=f"数值字段 '{col}' 未填写单位，可能是漏填",
                            severity=0.5,
                            raw_value=val,
                            expected_value="如 '100 元'、'50 个'",
                        )
                    )

                for kw in self.SUPPLEMENT_KEYWORDS:
                    if kw in val_str:
                        row_anomalies.append(
                            AnomalyDetail(
                                anomaly_type=AnomalyType.SUPPLEMENT_REMARK,
                                field_name=col,
                                description=f"字段 '{col}' 包含补录关键词 '{kw}'，为事后补录记录",
                                severity=0.4,
                                raw_value=val,
                            )
                        )
                        break

                if len(val_str) > self.TRUNCATE_MAX_LEN:
                    reason = self._analyze_truncate_reason(col, val_str)
                    row_anomalies.append(
                        AnomalyDetail(
                            anomaly_type=AnomalyType.TEXT_TRUNCATED,
                            field_name=col,
                            description=f"字段 '{col}' 文本过长（{len(val_str)}字符），导出时将截断",
                            severity=0.2,
                            raw_value=val_str[:80] + "...",
                            truncate_reason=reason,
                        )
                    )

                if val_str and self._looks_numeric(col) and not self._is_valid_numeric(val_str):
                    row_anomalies.append(
                        AnomalyDetail(
                            anomaly_type=AnomalyType.FORMAT_INCONSISTENCY,
                            field_name=col,
                            description=f"数值字段 '{col}' 格式异常，无法解析为数字",
                            severity=0.6,
                            raw_value=val,
                        )
                    )

            if date_col and pd.notna(row[date_col]):
                try:
                    current_date = pd.to_datetime(row[date_col])
                    if idx > 0:
                        prev_anomalies = records_anomalies[idx - 1]
                        prev_date_str = None
                        for a in prev_anomalies:
                            if a.field_name == date_col:
                                continue
                        if idx > 0 and date_col:
                            prev_val = df.iloc[idx - 1][date_col]
                            if pd.notna(prev_val):
                                prev_date = pd.to_datetime(prev_val)
                                if current_date < prev_date:
                                    row_anomalies.append(
                                        AnomalyDetail(
                                            anomaly_type=AnomalyType.VERSION_ROLLBACK,
                                            field_name=date_col,
                                            description=(
                                                f"时间字段回退，当前行日期({current_date.strftime('%Y-%m-%d')}) "
                                                f"早于上一行({prev_date.strftime('%Y-%m-%d')})，"
                                                f"疑似版本回滚或排序错乱，请勿当作正常样例"
                                            ),
                                            severity=0.9,
                                            raw_value=row[date_col],
                                            expected_value=str(prev_val),
                                        )
                                    )
                except (ValueError, TypeError):
                    pass

            records_anomalies.append(row_anomalies)

        dup_key_cols = [
            c for c in columns
            if not any(k in c.lower() for k in ["编号", "id", "code", "时间", "date", "time", "remark", "备注", "legacy", "old"])
        ]
        if len(dup_key_cols) >= 2:
            dup_mask = df.duplicated(subset=dup_key_cols, keep=False)
            for idx, is_dup in enumerate(dup_mask):
                if is_dup:
                    dup_cols = self._find_dup_cols(df, idx, compare_cols=dup_key_cols)
                    records_anomalies[idx].append(
                        AnomalyDetail(
                            anomaly_type=AnomalyType.DUPLICATE_RECORD,
                            field_name=",".join(dup_cols) if dup_cols else None,
                            description=f"与其他行业务关键字段({', '.join(dup_key_cols[:4])}...)相同，疑似重复录入",
                            severity=0.7,
                        )
                    )

        numeric_cols = [c for c in columns if self._looks_numeric(c) and df[c].apply(self._is_valid_numeric).sum() > 10]
        for col in numeric_cols:
            numeric_vals = df[col].apply(self._safe_float)
            valid_mask = numeric_vals.notna()
            if valid_mask.sum() < 5:
                continue
            vals = numeric_vals[valid_mask].values
            q1, q3 = np.percentile(vals, [25, 75])
            iqr = q3 - q1
            lower = q1 - 3 * iqr
            upper = q3 + 3 * iqr
            for idx in range(len(df)):
                v = numeric_vals.iloc[idx]
                if pd.notna(v) and (v < lower or v > upper):
                    records_anomalies[idx].append(
                        AnomalyDetail(
                            anomaly_type=AnomalyType.VALUE_OUTLIER,
                            field_name=col,
                            description=f"数值 {v} 显著偏离正常范围 [{lower:.2f}, {upper:.2f}]",
                            severity=0.6,
                            raw_value=df.iloc[idx][col],
                        )
                    )

        return records_anomalies

    def sample(
        self,
        df: pd.DataFrame,
        source_file: str = "",
        description: str = "",
    ) -> SampleBatch:
        batch = SampleBatch(
            source_files=[source_file],
            config=self.config,
            description=description or f"从 {source_file} 抽样 {self.config.total_samples} 条",
        )

        records_anomalies = self.detect_anomalies(df)
        anomaly_scores = np.array(
            [sum(a.severity for a in alist) for alist in records_anomalies],
            dtype=float,
        )

        n_total = min(self.config.total_samples, len(df))
        n_random = int(n_total * self.config.random_ratio)
        n_anomaly = int(n_total * self.config.anomaly_ratio)
        n_recent = int(n_total * self.config.recent_ratio)
        n_manual = n_total - n_random - n_anomaly - n_recent

        selected_indices = set()

        if n_anomaly > 0 and anomaly_scores.sum() > 0:
            anom_probs = anomaly_scores / anomaly_scores.sum()
            anom_indices = self._weighted_sample(anom_probs, n_anomaly, exclude=selected_indices)
            selected_indices.update(anom_indices)

        if n_recent > 0:
            recent_pool = [i for i in range(len(df)) if i not in selected_indices]
            recent_indices = recent_pool[-n_recent:] if len(recent_pool) >= n_recent else recent_pool
            selected_indices.update(recent_indices)

        if self.config.stratify_by and self.config.stratify_by in df.columns:
            stratify_indices = self._stratified_sample(df, self.config.stratify_by, n_random, selected_indices)
            selected_indices.update(stratify_indices)
        else:
            random_pool = [i for i in range(len(df)) if i not in selected_indices]
            random_n = min(n_random + n_manual, len(random_pool))
            if random_n > 0:
                random_indices = self._rng.choice(random_pool, size=random_n, replace=False).tolist()
                selected_indices.update(random_indices)

        for idx in sorted(selected_indices):
            row = df.iloc[idx]
            data = {col: row[col] for col in df.columns}
            anomalies = records_anomalies[idx]
            score = anomaly_scores[idx]

            if idx in (list(selected_indices)[:n_anomaly] if n_anomaly > 0 else []):
                source = SampleSource.ANOMALY_SCORE
            elif idx in (list(selected_indices)[-n_recent:] if n_recent > 0 else []):
                source = SampleSource.RECENT
            else:
                source = SampleSource.RANDOM

            record = SampleRecord(
                source_row_index=idx,
                source_file=source_file,
                data=data,
                anomalies=anomalies,
                anomaly_score=min(score, 1.0),
                sample_source=source,
            )
            batch.add_record(record)

        return batch

    def _find_version_col(self, columns: List[str]) -> Optional[str]:
        for c in columns:
            cl = c.lower()
            if any(k in cl for k in ["version", "版本号", "版本", "ver"]):
                return c
        return None

    def _find_date_col(self, columns: List[str]) -> Optional[str]:
        for c in columns:
            cl = c.lower()
            if any(k in cl for k in ["时间", "日期", "date", "time", "create", "更新", "录入"]):
                return c
        return None

    def _is_old_schema_field(self, col: str) -> bool:
        cl = col.lower()
        return any(k.lower() in cl for k in self.OLD_SCHEMA_FIELDS)

    def _needs_unit(self, col: str) -> bool:
        return any(nf in col for nf in self.NEED_UNIT_FIELDS)

    def _has_unit(self, val: str) -> bool:
        return bool(self.UNIT_PATTERN.search(val))

    def _looks_numeric(self, col: str) -> bool:
        return any(k in col for k in ["金额", "数量", "价格", "数", "额", "重量", "面积", "长度", "率", "值"])

    def _is_valid_numeric(self, val: str) -> bool:
        if not val or val == "-":
            return False
        cleaned = re.sub(r"[,\s]", "", val)
        try:
            float(cleaned)
            return True
        except ValueError:
            return False

    def _safe_float(self, val: Any) -> Optional[float]:
        if val is None or (isinstance(val, float) and pd.isna(val)):
            return None
        s = str(val).strip()
        if not s or s == "-":
            return None
        cleaned = re.sub(r"[,\s]", "", s)
        cleaned = self.UNIT_PATTERN.sub("", cleaned)
        try:
            return float(cleaned)
        except ValueError:
            return None

    def _analyze_truncate_reason(self, col: str, val: str) -> str:
        newlines = val.count("\n")
        if newlines > 20:
            return f"该字段换行过多（共{newlines}行内容），疑似粘贴了多条记录的拼接结果，建议拆分处理"
        if len(val) > 2000:
            return f"文本极长（约{len(val)}字符），超出人工阅读舒适范围，疑似粘贴了整篇文档/聊天记录，建议拆分为多字段"
        if col.endswith("_desc") or "描述" in col or "说明" in col or "备注" in col or "remark" in col.lower():
            return f"该字段属于描述/备注类业务字段，内容过长属正常情况，导出时截断仅为表格显示友好"
        return f"文本长度 {len(val)} 字符，超过导出显示建议上限 {self.TRUNCATE_MAX_LEN} 字符"

    def _find_dup_cols(self, df: pd.DataFrame, idx: int, compare_cols: Optional[List[str]] = None) -> List[str]:
        row = df.iloc[idx]
        search_cols = compare_cols if compare_cols else list(df.columns)
        for other_idx in range(len(df)):
            if other_idx == idx:
                continue
            other_row = df.iloc[other_idx]
            dup_cols = []
            for c in search_cols:
                if c not in df.columns:
                    continue
                rv = row[c]
                ov = other_row[c]
                if rv is None and ov is None:
                    continue
                if rv is not None and ov is not None and str(rv).strip() == str(ov).strip():
                    dup_cols.append(c)
            if len(dup_cols) >= max(2, len(search_cols) // 2):
                return dup_cols
        return []

    def _weighted_sample(self, probs: np.ndarray, n: int, exclude: set) -> List[int]:
        p = probs.copy()
        for i in exclude:
            p[i] = 0
        if p.sum() == 0:
            return []
        p = p / p.sum()
        indices = np.arange(len(p))
        chosen = []
        remaining = n
        while remaining > 0 and p.sum() > 0:
            pick_n = min(remaining, (p > 0).sum())
            picks = self._rng.choice(indices, size=pick_n, replace=False, p=p)
            for pk in picks:
                chosen.append(int(pk))
                p[pk] = 0
            if p.sum() > 0:
                p = p / p.sum()
            remaining = n - len(chosen)
        return chosen

    def _stratified_sample(self, df: pd.DataFrame, col: str, n: int, exclude: set) -> List[int]:
        groups = df.groupby(col, dropna=False).groups
        result = []
        n_groups = len(groups)
        if n_groups == 0:
            return result
        per_group = max(self.config.min_per_stratum, n // n_groups)
        for _, idxs in groups.items():
            pool = [i for i in idxs if i not in exclude and i not in result]
            take_n = min(per_group, len(pool))
            if take_n > 0:
                picks = self._rng.choice(pool, size=take_n, replace=False).tolist()
                result.extend(picks)
        return result
