from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from models import (
    AnomalySource,
    FlagType,
    InspectionFlag,
    PredictionDetail,
    PredictionReport,
    ReportSummary,
    SampleReviewEntry,
)


class Reporter:
    def __init__(
        self,
        predictions: list[PredictionDetail],
        vibration_details: list,
        maintenance_details: list,
        flags: list[InspectionFlag],
        sample_review: list[SampleReviewEntry],
    ):
        self.predictions = predictions
        self.vibration_details = vibration_details
        self.maintenance_details = maintenance_details
        self.flags = flags
        self.sample_review = sample_review

    def build_report(self, report_id: Optional[str] = None) -> PredictionReport:
        if report_id is None:
            report_id = f"RPT-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        summary = self._build_summary()
        return PredictionReport(
            report_id=report_id,
            generated_at=datetime.now(),
            summary=summary,
            vibration_details=self.vibration_details,
            maintenance_details=self.maintenance_details,
            prediction_details=self.predictions,
            flags=self.flags,
            sample_review=self.sample_review,
        )

    def _build_summary(self) -> ReportSummary:
        all_equip_ids = set()
        for p in self.predictions:
            all_equip_ids.add(p.equipment_id)

        total_samples = sum(p.sample_count for p in self.predictions)
        missing_count = sum(p.missing_sample_count for p in self.predictions)
        missing_ids: list[str] = []
        for p in self.predictions:
            if p.missing_sample_count > 0:
                missing_ids.append(
                    f"{p.equipment_id}(缺{p.missing_sample_count}次)",
                )

        anomaly_spike_count = sum(
            1 for f in self.flags if f.flag_type == FlagType.ANOMALY_SPIKE
        )
        anomaly_spike_from_backfill = sum(
            1
            for f in self.flags
            if f.flag_type == FlagType.ANOMALY_SPIKE
            and f.source == AnomalySource.BACKFILL
        )
        anomaly_spike_from_original = sum(
            1
            for f in self.flags
            if f.flag_type == FlagType.ANOMALY_SPIKE
            and f.source == AnomalySource.ORIGINAL
        )

        model_backfill_affected = [
            p.equipment_id
            for p in self.predictions
            if p.affected_by_model_backfill
        ]

        avg_life = 0.0
        avg_ci_lower = 0.0
        avg_ci_upper = 0.0
        if self.predictions:
            avg_life = sum(p.predicted_remaining_life_hours for p in self.predictions) / len(self.predictions)
            avg_ci_lower = sum(p.confidence_lower for p in self.predictions) / len(self.predictions)
            avg_ci_upper = sum(p.confidence_upper for p in self.predictions) / len(self.predictions)

        return ReportSummary(
            total_equipment=len(all_equip_ids),
            total_samples=total_samples,
            missing_sample_count=missing_count,
            missing_sample_ids=missing_ids,
            anomaly_spike_count=anomaly_spike_count,
            anomaly_spike_from_backfill=anomaly_spike_from_backfill,
            anomaly_spike_from_original=anomaly_spike_from_original,
            model_backfill_affected_equipment=model_backfill_affected,
            avg_predicted_life=avg_life,
            avg_confidence_lower=avg_ci_lower,
            avg_confidence_upper=avg_ci_upper,
        )

    def to_text(self, report: PredictionReport) -> str:
        lines: list[str] = []
        lines.append("=" * 70)
        lines.append(f"曲线拟合寿命预测报告  {report.report_id}")
        lines.append(f"生成时间: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 70)

        s = report.summary
        lines.append("")
        lines.append("【摘要】")
        lines.append(f"  设备总数: {s.total_equipment}")
        lines.append(f"  采样总数: {s.total_samples}")
        lines.append(f"  缺采样总数: {s.missing_sample_count}")
        if s.missing_sample_ids:
            lines.append(f"  缺采样设备: {', '.join(s.missing_sample_ids)}")
        lines.append(f"  异常尖峰总数: {s.anomaly_spike_count} (补录来源: {s.anomaly_spike_from_backfill}, 原始材料来源: {s.anomaly_spike_from_original})")
        if s.model_backfill_affected_equipment:
            lines.append(f"  型号补录影响设备: {', '.join(s.model_backfill_affected_equipment)}")
        lines.append(f"  平均预测剩余寿命: {s.avg_predicted_life:.1f} 小时")
        lines.append(f"  平均置信区间: [{s.avg_confidence_lower:.1f}, {s.avg_confidence_upper:.1f}] 小时")

        lines.append("")
        lines.append("-" * 70)
        lines.append("【振动数据明细】")
        for v in report.vibration_details:
            src = "补录" if v.source.value == "backfill" else "原始"
            flags_str = []
            if v.is_missing_sample:
                flags_str.append("缺采样")
            if v.is_anomaly_spike:
                a_src = "补录" if v.anomaly_source and v.anomaly_source.value == "backfill" else "原始材料"
                flags_str.append(f"异常尖峰(来源:{a_src})")
            flag_text = f" [{', '.join(flags_str)}]" if flags_str else ""
            lines.append(
                f"  {v.equipment_id} | {v.timestamp.strftime('%Y-%m-%d %H:%M')} | "
                f"值={v.value:.2f} | 来源={src}{flag_text}",
            )

        lines.append("")
        lines.append("-" * 70)
        lines.append("【维修历史明细】")
        for m in report.maintenance_details:
            src = "补录" if m.source.value == "backfill" else "原始"
            lines.append(
                f"  {m.equipment_id} | {m.date.strftime('%Y-%m-%d')} | "
                f"类型={m.maintenance_type} | 来源={src} | {m.description}",
            )

        lines.append("")
        lines.append("-" * 70)
        lines.append("【预测明细】")
        for p in report.prediction_details:
            backfill_tag = " [型号补录影响]" if p.affected_by_model_backfill else ""
            lines.append(
                f"  {p.equipment_id} | 剩余寿命={p.predicted_remaining_life_hours:.1f}h | "
                f"置信区间=[{p.confidence_lower:.1f}, {p.confidence_upper:.1f}]h | "
                f"曲线={p.curve_type.value} | R²={p.r_squared:.4f} | "
                f"采样={p.sample_count} 缺采样={p.missing_sample_count}{backfill_tag}",
            )

        lines.append("")
        lines.append("-" * 70)
        lines.append("【检查标记】")
        for f in report.flags:
            src = "补录" if f.source == AnomalySource.BACKFILL else "原始材料"
            lines.append(
                f"  {f.equipment_id} | {f.flag_type.value} | 来源={src} | {f.message}",
            )

        lines.append("")
        lines.append("-" * 70)
        lines.append("【样本回看】")
        for sr in report.sample_review:
            backfill_tag = " [型号补录影响]" if sr.affected_by_model_backfill else ""
            parts = [
                f"{sr.equipment_id}",
                f"时刻={sr.sample_timestamp.strftime('%Y-%m-%d %H:%M')}",
            ]
            if sr.was_missing:
                parts.append("缺采样(已填补)")
                if sr.imputed_value is not None:
                    parts.append(f"填补值={sr.imputed_value:.2f}")
            else:
                parts.append(f"原始值={sr.original_value:.2f}" if sr.original_value is not None else "原始值=N/A")
            if sr.anomaly_spike:
                a_src = "补录" if sr.anomaly_source == AnomalySource.BACKFILL else "原始材料"
                parts.append(f"异常尖峰(来源:{a_src})")
            parts_str = " | ".join(parts)
            lines.append(f"  {parts_str}{backfill_tag}")

        lines.append("")
        lines.append("=" * 70)
        return "\n".join(lines)

    def to_json(self, report: PredictionReport) -> str:
        def _serialize(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            if hasattr(obj, "value") and isinstance(obj, type(obj)):
                return obj.value
            if hasattr(obj, "__dict__"):
                d = {}
                for k, v in obj.__dict__.items():
                    d[k] = _serialize(v)
                return d
            if isinstance(obj, list):
                return [_serialize(i) for i in obj]
            if isinstance(obj, dict):
                return {k: _serialize(v) for k, v in obj.items()}
            return obj

        data = _serialize(report)
        return json.dumps(data, ensure_ascii=False, indent=2, default=str)

    def to_csv(self, report: PredictionReport, output_dir: str | Path) -> None:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        self._write_vibration_csv(report, output_dir / "vibration_details.csv")
        self._write_maintenance_csv(report, output_dir / "maintenance_details.csv")
        self._write_prediction_csv(report, output_dir / "prediction_details.csv")
        self._write_sample_review_csv(report, output_dir / "sample_review.csv")

    @staticmethod
    def _write_vibration_csv(report: PredictionReport, path: Path) -> None:
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "equipment_id", "timestamp", "value", "is_missing_sample",
                "is_anomaly_spike", "anomaly_source", "source", "note",
            ])
            for v in report.vibration_details:
                writer.writerow([
                    v.equipment_id,
                    v.timestamp.isoformat(),
                    f"{v.value:.4f}",
                    v.is_missing_sample,
                    v.is_anomaly_spike,
                    v.anomaly_source.value if v.anomaly_source else "",
                    v.source.value,
                    v.note,
                ])

    @staticmethod
    def _write_maintenance_csv(report: PredictionReport, path: Path) -> None:
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "equipment_id", "date", "maintenance_type", "description",
                "source", "note",
            ])
            for m in report.maintenance_details:
                writer.writerow([
                    m.equipment_id,
                    m.date.isoformat(),
                    m.maintenance_type,
                    m.description,
                    m.source.value,
                    m.note,
                ])

    @staticmethod
    def _write_prediction_csv(report: PredictionReport, path: Path) -> None:
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "equipment_id", "predicted_remaining_life_hours",
                "confidence_lower", "confidence_upper", "curve_type",
                "r_squared", "sample_count", "missing_sample_count",
                "affected_by_model_backfill",
            ])
            for p in report.prediction_details:
                writer.writerow([
                    p.equipment_id,
                    f"{p.predicted_remaining_life_hours:.2f}",
                    f"{p.confidence_lower:.2f}",
                    f"{p.confidence_upper:.2f}",
                    p.curve_type.value,
                    f"{p.r_squared:.4f}",
                    p.sample_count,
                    p.missing_sample_count,
                    p.affected_by_model_backfill,
                ])

    @staticmethod
    def _write_sample_review_csv(report: PredictionReport, path: Path) -> None:
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "equipment_id", "sample_timestamp", "original_value",
                "imputed_value", "was_missing", "anomaly_spike",
                "anomaly_source", "affected_by_model_backfill",
            ])
            for sr in report.sample_review:
                writer.writerow([
                    sr.equipment_id,
                    sr.sample_timestamp.isoformat(),
                    f"{sr.original_value:.4f}" if sr.original_value is not None else "",
                    f"{sr.imputed_value:.4f}" if sr.imputed_value is not None else "",
                    sr.was_missing,
                    sr.anomaly_spike,
                    sr.anomaly_source.value if sr.anomaly_source else "",
                    sr.affected_by_model_backfill,
                ])
