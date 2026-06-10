import io
import re
import uuid
from datetime import date, datetime
from typing import Optional

import pandas as pd

from .models import (
    AnomalyItem,
    CorrectionRecord,
    ImportBatch,
    QCStatus,
    RawSampleRow,
    ViralLoadSample,
    ViralLoadSampleResponse,
)
from .mock_data import LINEAGE_NAMES, get_mock_raw_rows


class DataService:
    def __init__(self):
        self.samples: list[ViralLoadSample] = []
        self.corrections: list[CorrectionRecord] = []
        self.import_batches: list[ImportBatch] = []
        self._loaded = False

    def ensure_mock_data(self):
        if not self._loaded:
            self._loaded = True
            raw_rows = get_mock_raw_rows()
            self._process_raw_rows(raw_rows, filename="mock_data.csv")

    def _parse_viral_load_field(self, raw: str) -> tuple[Optional[float], str]:
        if not raw or raw.strip() == "":
            return None, ""
        raw = raw.strip()
        match = re.match(r"^([\d.eE+\-]+)\s*(.*)$", raw)
        if match:
            num_str = match.group(1)
            extra = match.group(2).strip()
            try:
                value = float(num_str)
                return value, extra
            except ValueError:
                return None, raw
        try:
            value = float(raw)
            return value, ""
        except ValueError:
            return None, raw

    def _parse_date(self, date_str: str) -> Optional[date]:
        if not date_str or date_str.strip() == "":
            return None
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except ValueError:
                continue
        return None

    def _process_raw_rows(
        self, rows: list[RawSampleRow], filename: str
    ) -> ImportBatch:
        batch_id = str(uuid.uuid4())[:8]
        warnings: list[str] = []
        clean_count = 0
        duplicate_count = 0
        duplicate_ids: list[str] = []
        seen_keys: set[str] = set()

        for row in rows:
            key = f"{row.sample_id}|{row.lineage_id}|{row.collection_date}"
            is_dup = key in seen_keys
            seen_keys.add(key)

            viral_load, extra_notes = self._parse_viral_load_field(row.viral_load)

            combined_notes = "；".join(
                filter(None, [row.notes.strip(), extra_notes])
            ).strip()

            col_date = self._parse_date(row.collection_date)

            existing_same = any(
                s.sample_id == row.sample_id for s in self.samples
            )
            is_duplicate = is_dup or existing_same

            if is_duplicate:
                duplicate_count += 1
                duplicate_ids.append(row.sample_id)
                warnings.append(
                    f"重复导入: {row.sample_id} (lineage={row.lineage_id}, date={row.collection_date})"
                )

            qc_status, explanation = self._determine_qc_status(
                viral_load, is_duplicate, combined_notes
            )

            sample = ViralLoadSample(
                sample_id=row.sample_id,
                lineage_id=row.lineage_id,
                collection_date=col_date or date.today(),
                viral_load=viral_load,
                original_raw_value=row.viral_load,
                notes=combined_notes,
                qc_status=qc_status,
                explanation=explanation,
                is_duplicate=is_duplicate,
                import_batch_id=batch_id,
            )
            self.samples.append(sample)
            if not is_duplicate:
                clean_count += 1

        batch = ImportBatch(
            batch_id=batch_id,
            filename=filename,
            imported_at=datetime.now(),
            total_rows=len(rows),
            clean_rows=clean_count,
            duplicate_rows=duplicate_count,
            warnings=warnings,
            duplicate_sample_ids=list(dict.fromkeys(duplicate_ids)),
        )
        self.import_batches.append(batch)
        return batch

    def _determine_qc_status(
        self,
        viral_load: Optional[float],
        is_duplicate: bool,
        notes: str,
    ) -> tuple[QCStatus, str]:
        reasons = []
        status = QCStatus.CLEAN

        if viral_load is None:
            status = QCStatus.NEED_RECHECK
            reasons.append("病毒载量为空，需复核确认")

        if is_duplicate:
            if status == QCStatus.CLEAN:
                status = QCStatus.NEED_RECHECK
            reasons.append("该样本为重复导入，已标记")

        if "疑似污染" in notes:
            if status == QCStatus.CLEAN:
                status = QCStatus.FLAGGED
            else:
                status = QCStatus.FLAGGED
            reasons.append("备注含疑似污染标记")

        if "突增" in notes or "紧急复核" in notes:
            status = QCStatus.FLAGGED
            reasons.append("载量异常突增，需紧急复核")

        if not reasons:
            reasons.append("数据正常，质控通过")

        return status, "；".join(reasons)

    def import_file(self, file_content: bytes, filename: str) -> ImportBatch:
        ext = filename.lower().split(".")[-1]
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(file_content))
        elif ext in ("xlsx", "xls"):
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            df = pd.read_csv(io.BytesIO(file_content))

        df = df.fillna("")

        rows: list[RawSampleRow] = []
        for _, r in df.iterrows():
            row = RawSampleRow(
                sample_id=str(r.get("sample_id", "")),
                lineage_id=str(r.get("lineage_id", "")),
                collection_date=str(r.get("collection_date", "")),
                viral_load=str(r.get("viral_load", "")),
                notes=str(r.get("notes", "")),
            )
            rows.append(row)

        return self._process_raw_rows(rows, filename)

    def import_mock(self) -> ImportBatch:
        raw_rows = get_mock_raw_rows()
        return self._process_raw_rows(raw_rows, "mock_data.csv")

    def get_samples(
        self, qc_status: Optional[QCStatus] = None
    ) -> list[ViralLoadSampleResponse]:
        self.ensure_mock_data()
        results = self.samples
        if qc_status:
            results = [s for s in results if s.qc_status == qc_status]
        return [self._to_response(s) for s in results]

    def get_lineages(self) -> list[dict]:
        self.ensure_mock_data()
        lineage_map: dict[str, list[ViralLoadSample]] = {}
        for s in self.samples:
            if s.is_duplicate:
                continue
            lineage_map.setdefault(s.lineage_id, []).append(s)

        result = []
        for lid, samples in lineage_map.items():
            loads = [s.viral_load for s in samples if s.viral_load is not None]
            avg = sum(loads) / len(loads) if loads else None
            latest = max((s.collection_date for s in samples), default=None)
            trend = self._compute_trend(samples)

            result.append(
                {
                    "lineage_id": lid,
                    "name": LINEAGE_NAMES.get(lid, lid),
                    "sample_count": len(samples),
                    "avg_viral_load": round(avg, 2) if avg else None,
                    "latest_collection_date": latest,
                    "trend": trend,
                }
            )
        return result

    def get_lineage_detail(self, lineage_id: str) -> Optional[dict]:
        self.ensure_mock_data()
        samples = [
            s
            for s in self.samples
            if s.lineage_id == lineage_id and not s.is_duplicate
        ]
        if not samples:
            return None

        loads = [s.viral_load for s in samples if s.viral_load is not None]
        avg = sum(loads) / len(loads) if loads else None
        latest = max((s.collection_date for s in samples), default=None)
        trend = self._compute_trend(samples)

        sorted_samples = sorted(samples, key=lambda s: s.collection_date)

        return {
            "lineage_id": lineage_id,
            "name": LINEAGE_NAMES.get(lineage_id, lineage_id),
            "sample_count": len(samples),
            "avg_viral_load": round(avg, 2) if avg else None,
            "latest_collection_date": latest,
            "trend": trend,
            "samples": [self._to_response(s) for s in sorted_samples],
        }

    def _compute_trend(self, samples: list[ViralLoadSample]) -> str:
        valid = sorted(
            [s for s in samples if s.viral_load is not None],
            key=lambda s: s.collection_date,
        )
        if len(valid) < 2:
            return "数据不足，无法判断趋势"
        last = valid[-1].viral_load
        prev = valid[-2].viral_load
        if last is None or prev is None:
            return "数据不足，无法判断趋势"
        ratio = last / prev if prev != 0 else 0
        if ratio > 2.0:
            return "显著上升"
        elif ratio > 1.2:
            return "轻微上升"
        elif ratio < 0.5:
            return "显著下降"
        elif ratio < 0.8:
            return "轻微下降"
        else:
            return "基本稳定"

    def get_anomalies(self) -> list[AnomalyItem]:
        self.ensure_mock_data()
        lineage_map: dict[str, list[ViralLoadSample]] = {}
        for s in self.samples:
            if s.is_duplicate:
                continue
            lineage_map.setdefault(s.lineage_id, []).append(s)

        anomalies: list[AnomalyItem] = []

        for lid, samples in lineage_map.items():
            loads = [s.viral_load for s in samples if s.viral_load is not None]
            if len(loads) < 2:
                continue
            mean = sum(loads) / len(loads)
            std = (sum((x - mean) ** 2 for x in loads) / len(loads)) ** 0.5
            low = mean - 2 * std
            high = mean + 2 * std

            sorted_samples = sorted(samples, key=lambda s: s.collection_date)
            for i, s in enumerate(sorted_samples):
                if s.viral_load is None:
                    continue

                deviation = abs(s.viral_load - mean) / std if std > 0 else 0

                if s.viral_load > high:
                    anomalies.append(
                        AnomalyItem(
                            sample_id=s.sample_id,
                            lineage_id=lid,
                            collection_date=s.collection_date,
                            viral_load=s.viral_load,
                            expected_range_low=round(low, 2),
                            expected_range_high=round(high, 2),
                            deviation_ratio=round(deviation, 2),
                            anomaly_type="偏离谱系均值过大",
                            explanation=f"载量 {s.viral_load:.2e} 超出谱系期望范围 [{low:.2e}, {high:.2e}]，偏差 {deviation:.1f} 个标准差",
                        )
                    )
                elif i > 0 and sorted_samples[i - 1].viral_load is not None:
                    prev_load = sorted_samples[i - 1].viral_load
                    if prev_load > 0 and s.viral_load / prev_load > 5.0:
                        anomalies.append(
                            AnomalyItem(
                                sample_id=s.sample_id,
                                lineage_id=lid,
                                collection_date=s.collection_date,
                                viral_load=s.viral_load,
                                expected_range_low=round(low, 2),
                                expected_range_high=round(high, 2),
                                deviation_ratio=round(
                                    s.viral_load / prev_load, 2
                                ),
                                anomaly_type="载量突增",
                                explanation=f"相较前次采样 {prev_load:.2e}，载量突增 {s.viral_load / prev_load:.1f} 倍",
                            )
                        )

        anomalies.sort(key=lambda a: a.deviation_ratio, reverse=True)
        return anomalies

    def add_correction(
        self,
        sample_id: str,
        corrected_viral_load: Optional[float],
        corrected_notes: str,
        reason: str,
    ) -> Optional[CorrectionRecord]:
        self.ensure_mock_data()
        sample = next(
            (s for s in self.samples if s.sample_id == sample_id), None
        )
        if not sample:
            return None

        record = CorrectionRecord(
            id=str(uuid.uuid4())[:8],
            sample_id=sample_id,
            lineage_id=sample.lineage_id,
            original_viral_load=sample.viral_load,
            corrected_viral_load=corrected_viral_load,
            original_notes=sample.notes,
            corrected_notes=corrected_notes,
            reason=reason,
            created_at=datetime.now(),
        )

        if corrected_viral_load is not None:
            sample.viral_load = corrected_viral_load
        if corrected_notes:
            sample.notes = corrected_notes

        sample.qc_status, sample.explanation = self._determine_qc_status(
            sample.viral_load, sample.is_duplicate, sample.notes
        )
        sample.explanation += f"；人工修正: {reason}"

        self.corrections.append(record)
        return record

    def get_corrections(self) -> list[CorrectionRecord]:
        self.ensure_mock_data()
        return self.corrections

    def get_qc_summary(self) -> dict:
        self.ensure_mock_data()
        non_dup = [s for s in self.samples if not s.is_duplicate]
        total = len(non_dup)
        clean = sum(1 for s in non_dup if s.qc_status == QCStatus.CLEAN)
        need_recheck = sum(
            1 for s in non_dup if s.qc_status == QCStatus.NEED_RECHECK
        )
        flagged = sum(1 for s in non_dup if s.qc_status == QCStatus.FLAGGED)
        duplicate = sum(1 for s in self.samples if s.is_duplicate)
        anomaly_count = len(self.get_anomalies())

        return {
            "total": total,
            "clean": clean,
            "need_recheck": need_recheck,
            "flagged": flagged,
            "duplicate": duplicate,
            "anomaly_count": anomaly_count,
        }

    def _to_response(self, sample: ViralLoadSample) -> ViralLoadSampleResponse:
        return ViralLoadSampleResponse(
            sample_id=sample.sample_id,
            lineage_id=sample.lineage_id,
            collection_date=sample.collection_date,
            viral_load=sample.viral_load,
            original_raw_value=sample.original_raw_value,
            notes=sample.notes,
            qc_status=sample.qc_status,
            explanation=sample.explanation,
            is_duplicate=sample.is_duplicate,
            import_batch_id=sample.import_batch_id,
            created_at=sample.created_at,
        )


service = DataService()
