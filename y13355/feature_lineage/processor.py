from __future__ import annotations

import csv
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from .config_loader import ConfigLoader
from .models import (
    ChangeAudit,
    ChangeType,
    ConfigSource,
    GrayscaleConfig,
    ProcessingResult,
    ProcessingStats,
    RowDetail,
    RowStatus,
)


class DataProcessor:
    def __init__(
        self,
        config_loader: ConfigLoader,
        config: GrayscaleConfig,
        task_id: Optional[str] = None,
    ):
        self.config_loader = config_loader
        self.config = config
        self.task_id = task_id or f"task_{uuid.uuid4().hex[:8]}"
        self.result = ProcessingResult(
            task_id=self.task_id, config_id=config.config_id
        )
        self._feature_map = {f.feature_id: f for f in config.features}

    def process_file(
        self,
        data_file: str,
        file_format: str = "auto",
        delayed_feature_id: Optional[str] = None,
        delayed_row_index: Optional[int] = None,
    ) -> ProcessingResult:
        self.result.start_time = datetime.now()

        file_path = Path(data_file)
        if not file_path.exists():
            raise FileNotFoundError(f"数据文件不存在: {file_path}")

        if file_format == "auto":
            file_format = self._detect_format(file_path)

        raw_rows = self._read_file(file_path, file_format)
        self.result.stats.total = len(raw_rows)

        for idx, raw_data in enumerate(raw_rows):
            if (
                delayed_feature_id
                and delayed_row_index is not None
                and idx == delayed_row_index
            ):
                self._inject_delayed_feature(raw_data, delayed_feature_id)
                self.result.has_delayed_feature = True
                self.result.delayed_feature_id = delayed_feature_id

            row_detail = self._process_row(idx, raw_data)
            self.result.rows.append(row_detail)

            if row_detail.status == RowStatus.PROCESSED:
                self.result.stats.processed += 1
            elif row_detail.status == RowStatus.BAD:
                self.result.stats.bad += 1
            elif row_detail.status == RowStatus.SKIPPED:
                self.result.stats.skipped += 1

        self.result.end_time = datetime.now()
        return self.result

    def process_dataframe(
        self,
        df: pd.DataFrame,
        delayed_feature_id: Optional[str] = None,
        delayed_row_index: Optional[int] = None,
    ) -> ProcessingResult:
        self.result.start_time = datetime.now()
        raw_rows = df.to_dict("records")
        self.result.stats.total = len(raw_rows)

        for idx, raw_data in enumerate(raw_rows):
            if (
                delayed_feature_id
                and delayed_row_index is not None
                and idx == delayed_row_index
            ):
                self._inject_delayed_feature(raw_data, delayed_feature_id)
                self.result.has_delayed_feature = True
                self.result.delayed_feature_id = delayed_feature_id

            row_detail = self._process_row(idx, raw_data)
            self.result.rows.append(row_detail)

            if row_detail.status == RowStatus.PROCESSED:
                self.result.stats.processed += 1
            elif row_detail.status == RowStatus.BAD:
                self.result.stats.bad += 1
            elif row_detail.status == RowStatus.SKIPPED:
                self.result.stats.skipped += 1

        self.result.end_time = datetime.now()
        return self.result

    def _detect_format(self, file_path: Path) -> str:
        suffix = file_path.suffix.lower()
        if suffix == ".csv":
            return "csv"
        elif suffix in (".json", ".jsonl"):
            return "json"
        elif suffix in (".xlsx", ".xls"):
            return "excel"
        raise ValueError(f"不支持的文件格式: {suffix}")

    def _read_file(self, file_path: Path, file_format: str) -> List[Dict[str, Any]]:
        if file_format == "csv":
            return self._read_csv(file_path)
        elif file_format == "json":
            return self._read_json(file_path)
        elif file_format == "excel":
            return self._read_excel(file_path)
        raise ValueError(f"不支持的文件格式: {file_format}")

    def _read_csv(self, file_path: Path) -> List[Dict[str, Any]]:
        rows = []
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)
        return rows

    def _read_json(self, file_path: Path) -> List[Dict[str, Any]]:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if content.startswith("["):
                return json.loads(content)
            else:
                return [json.loads(line) for line in content.split("\n") if line.strip()]

    def _read_excel(self, file_path: Path) -> List[Dict[str, Any]]:
        df = pd.read_excel(file_path)
        return df.to_dict("records")

    def _inject_delayed_feature(
        self, raw_data: Dict[str, Any], feature_id: str
    ) -> None:
        feature = self._feature_map.get(feature_id)
        if feature:
            raw_data["feature_id"] = feature_id
            raw_data["feature_name"] = feature.feature_name
            raw_data["_is_delayed"] = True
            raw_data["_delay_reason"] = "测试注入：特征迟到"

    def _process_row(
        self, row_index: int, raw_data: Dict[str, Any]
    ) -> RowDetail:
        source_line = row_index + 2
        source_object = raw_data.get("object_id") or raw_data.get("id")

        feature_id = raw_data.get("feature_id") or raw_data.get("feature")
        if not feature_id:
            return RowDetail(
                row_index=row_index,
                status=RowStatus.BAD,
                raw_data=raw_data,
                error_message="缺少 feature_id 字段",
                source_line=source_line,
                source_object=source_object,
            )

        if feature_id not in self._feature_map:
            matching = [
                fid
                for fid in self._feature_map
                if fid.lower() in str(feature_id).lower()
                or str(feature_id).lower() in fid.lower()
            ]
            if matching:
                matched_feature = matching[0]
                return RowDetail(
                    row_index=row_index,
                    status=RowStatus.SKIPPED,
                    feature_id=feature_id,
                    raw_data=raw_data,
                    skip_reason=f"特征 {feature_id} 不在灰度配置中，模糊匹配到 {matched_feature}，但配置未包含该特征",
                    source_line=source_line,
                    source_object=source_object,
                    matched_feature=matched_feature,
                )
            return RowDetail(
                row_index=row_index,
                status=RowStatus.SKIPPED,
                feature_id=feature_id,
                raw_data=raw_data,
                skip_reason=f"特征 {feature_id} 不在灰度配置中，无匹配项",
                source_line=source_line,
                source_object=source_object,
            )

        feature = self._feature_map[feature_id]

        try:
            value = raw_data.get("value")
            if value is None and "feature_value" in raw_data:
                value = raw_data["feature_value"]

            if value is None:
                return RowDetail(
                    row_index=row_index,
                    status=RowStatus.BAD,
                    feature_id=feature_id,
                    raw_data=raw_data,
                    error_message="缺少 value 字段，无法进行阈值判断",
                    source_line=source_line,
                    source_object=source_object,
                    matched_feature=feature.feature_name,
                )

            if feature.threshold is not None:
                try:
                    float_value = float(value)
                except (ValueError, TypeError):
                    return RowDetail(
                        row_index=row_index,
                        status=RowStatus.BAD,
                        feature_id=feature_id,
                        raw_data=raw_data,
                        error_message=f"value 无法转换为数值: {value}",
                        source_line=source_line,
                        source_object=source_object,
                        matched_feature=feature.feature_name,
                    )

            sample_id = raw_data.get("sample_id") or raw_data.get("object_id")
            if feature.sample_ids and sample_id not in feature.sample_ids:
                return RowDetail(
                    row_index=row_index,
                    status=RowStatus.SKIPPED,
                    feature_id=feature_id,
                    raw_data=raw_data,
                    skip_reason=f"样本 {sample_id} 不在特征 {feature_id} 的样本列表中",
                    source_line=source_line,
                    source_object=source_object,
                    matched_feature=feature.feature_name,
                )

            return RowDetail(
                row_index=row_index,
                status=RowStatus.PROCESSED,
                feature_id=feature_id,
                raw_data=raw_data,
                source_line=source_line,
                source_object=source_object,
                matched_feature=feature.feature_name,
            )

        except Exception as e:
            return RowDetail(
                row_index=row_index,
                status=RowStatus.BAD,
                feature_id=feature_id,
                raw_data=raw_data,
                error_message=f"处理异常: {str(e)}",
                source_line=source_line,
                source_object=source_object,
                matched_feature=feature.feature_name,
            )

    def get_bad_rows(self) -> List[RowDetail]:
        return self.result.get_rows_by_status(RowStatus.BAD)

    def get_skipped_rows(self) -> List[RowDetail]:
        return self.result.get_rows_by_status(RowStatus.SKIPPED)

    def get_processed_rows(self) -> List[RowDetail]:
        return self.result.get_rows_by_status(RowStatus.PROCESSED)

    def get_stats_breakdown(self) -> Dict[str, int]:
        return self.result.stats.breakdown

    def add_manual_override(
        self,
        feature_id: str,
        old_value: Any,
        new_value: Any,
        reason: str,
        changed_by: str = "user",
    ) -> ChangeAudit:
        feature = self._feature_map.get(feature_id)
        source_line = feature.source_line if feature else None
        source_file = feature.source_file if feature else None

        audit = ChangeAudit(
            audit_id=f"audit_{uuid.uuid4().hex[:8]}",
            feature_id=feature_id,
            change_type=ChangeType.MANUAL_OVERRIDE,
            old_value=old_value,
            new_value=new_value,
            source=ConfigSource.MANUAL,
            source_line=source_line,
            source_file=source_file,
            changed_by=changed_by,
            reason=reason,
            is_overwrite=old_value is not None,
        )

        self.result.changes.append(audit)
        return audit
