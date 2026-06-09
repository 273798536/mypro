from datetime import datetime
from typing import Dict, Any, Optional, List
import json
import io

from models import (
    ProcessingBatch,
    SourceData,
    ReviewRecord,
    RecordStatus,
    store,
    new_review_id,
)
from calculator import process_batch


class TraceEngine:
    @staticmethod
    def trace_from_result(result_id: str) -> Optional[Dict[str, Any]]:
        batch = store.get_by_result(result_id)
        if batch is None:
            return None
        return TraceEngine.build_trace_chain(batch)

    @staticmethod
    def trace_from_batch(batch_id: str) -> Optional[Dict[str, Any]]:
        batch = store.get(batch_id)
        if batch is None:
            return None
        return TraceEngine.build_trace_chain(batch)

    @staticmethod
    def build_trace_chain(batch: ProcessingBatch) -> Dict[str, Any]:
        chain: Dict[str, Any] = {
            "result_layer": None,
            "processing_layer": {
                "batch_id": batch.batch_id,
                "run_timestamp": batch.run_timestamp.isoformat(),
                "status": batch.status.value,
                "note": batch.note,
                "constraint_check": None
                if batch.constraint_check is None
                else {
                    "status": batch.constraint_check.status.value,
                    "violations": [
                        {
                            "constraint_name": v.constraint_name,
                            "constraint_expr": v.constraint_expr,
                            "message": v.message,
                            "actual_value": v.actual_value,
                            "expected_range": v.expected_range,
                        }
                        for v in batch.constraint_check.violations
                    ],
                    "passed": list(batch.constraint_check.passed),
                },
            },
            "source_layer": [
                {
                    "source_id": s.source_id,
                    "name": s.name,
                    "value": s.value,
                    "unit": s.unit,
                    "description": s.description,
                }
                for s in batch.sources
            ],
            "review_layer": None
            if batch.review is None
            else {
                "review_id": batch.review.review_id,
                "reviewer": batch.review.reviewer,
                "score": batch.review.score,
                "comment": batch.review.comment,
                "handling_opinion": batch.review.handling_opinion,
                "reviewed_at": batch.review.reviewed_at.isoformat(),
                "corrections": batch.review.corrections,
            },
        }

        if batch.calculation:
            chain["result_layer"] = {
                "result_id": batch.calculation.result_id,
                "value": batch.calculation.value,
                "unit": batch.calculation.unit,
                "absolute_error": batch.calculation.absolute_error,
                "relative_error": batch.calculation.relative_error,
                "confidence_interval": batch.calculation.confidence_interval,
                "monte_carlo_samples": batch.calculation.monte_carlo_samples,
                "formula": {
                    "expression": batch.calculation.formula.expression,
                    "description": batch.calculation.formula.description,
                    "applicable_range": batch.calculation.formula.applicable_range,
                    "units": batch.calculation.formula.units,
                },
                "warnings": batch.calculation.warnings,
                "error_message": batch.calculation.error_message,
            }

        chain["trace_path"] = " → ".join(
            [
                f"来源[{', '.join(s.source_id for s in batch.sources)}]",
                f"批次[{batch.batch_id}]",
                (
                    f"结果[{batch.calculation.result_id}]"
                    if batch.calculation
                    else "结果[未生成]"
                ),
            ]
        )
        return chain


class DownloadService:
    @staticmethod
    def _timestamp_str(dt: datetime) -> str:
        return dt.strftime("%Y%m%d_%H%M%S")

    @staticmethod
    def make_filename(batch: ProcessingBatch) -> str:
        ts = DownloadService._timestamp_str(batch.run_timestamp)
        status_label = {
            RecordStatus.PENDING: "pending",
            RecordStatus.CALCULATED: "ok",
            RecordStatus.CONSTRAINT_FAILED: "constraint_fail",
            RecordStatus.UNIT_MISSING: "unit_missing",
            RecordStatus.REVIEWED: "reviewed",
        }.get(batch.status, "unknown")
        return f"mc_error_{batch.batch_id}_{status_label}_{ts}.txt"

    @staticmethod
    def build_report_content(batch: ProcessingBatch) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("蒙特卡洛误差分析报告")
        lines.append("=" * 60)
        lines.append(f"运行批次:   {batch.batch_id}")
        lines.append(f"运行时间:   {batch.run_timestamp.isoformat()}")
        lines.append(f"当前状态:   {batch.status.value}")
        lines.append(f"文件生成:   {datetime.now().isoformat()}")
        if batch.note:
            lines.append(f"备    注:   {batch.note}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("一、来源数据")
        lines.append("-" * 60)
        for i, s in enumerate(batch.sources, 1):
            unit_str = s.unit if s.unit else "(单位缺失)"
            lines.append(
                f"  {i}. [{s.source_id}] {s.name} = {s.value} {unit_str}"
            )
            if s.description:
                lines.append(f"     说明: {s.description}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("二、公式与适用范围")
        lines.append("-" * 60)
        if batch.calculation:
            f = batch.calculation.formula
            lines.append(f"  公式表达式: {f.expression}")
            lines.append(f"  公式说明:   {f.description}")
            lines.append(f"  适用范围:   {f.applicable_range}")
            lines.append(f"  结果单位:   {f.units}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("三、计算结果（蒙特卡洛）")
        lines.append("-" * 60)
        if batch.calculation and batch.calculation.value is not None:
            c = batch.calculation
            lines.append(f"  结果ID:        {c.result_id}")
            lines.append(f"  名义值:        {c.value:.6f} {c.unit or ''}")
            if c.absolute_error is not None:
                lines.append(f"  绝对误差(σ):   {c.absolute_error:.6f} {c.unit or ''}")
            if c.relative_error is not None:
                lines.append(f"  相对误差:      {c.relative_error:.4f} %")
            if c.confidence_interval:
                lines.append(
                    f"  95%置信区间:   [{c.confidence_interval['low']:.6f}, {c.confidence_interval['high']:.6f}]"
                )
            lines.append(f"  抽样次数:      {c.monte_carlo_samples}")
            if c.warnings:
                lines.append("  警告:")
                for w in c.warnings:
                    lines.append(f"    ! {w}")
        else:
            msg = (
                batch.calculation.error_message
                if batch.calculation and batch.calculation.error_message
                else "未生成计算结果"
            )
            lines.append(f"  ! {msg}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("四、约束校验结果")
        lines.append("-" * 60)
        if batch.constraint_check:
            cc = batch.constraint_check
            lines.append(f"  总体状态: {cc.status.value}")
            if cc.passed:
                lines.append("  通过项:")
                for p in cc.passed:
                    lines.append(f"    ✓ {p}")
            if cc.violations:
                lines.append("  失败项:")
                for v in cc.violations:
                    lines.append(f"    ✗ [{v.constraint_name}] {v.constraint_expr}")
                    lines.append(f"       期望: {v.expected_range}")
                    lines.append(f"       实际: {v.actual_value}")
                    lines.append(f"       说明: {v.message}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("五、教师复核信息")
        lines.append("-" * 60)
        if batch.review:
            r = batch.review
            lines.append(f"  复核ID:     {r.review_id}")
            lines.append(f"  复核人:     {r.reviewer}")
            lines.append(f"  复核时间:   {r.reviewed_at.isoformat()}")
            if r.score is not None:
                lines.append(f"  评分:       {r.score}")
            if r.comment:
                lines.append(f"  评语:       {r.comment}")
            if r.handling_opinion:
                lines.append(f"  处理意见:   {r.handling_opinion}")
            if r.corrections:
                lines.append(f"  修正记录:   {json.dumps(r.corrections, ensure_ascii=False)}")
        else:
            lines.append("  (尚未复核)")
        lines.append("")

        lines.append("-" * 60)
        lines.append("六、追溯链路")
        lines.append("-" * 60)
        lines.append(
            f"  来源ID: {', '.join(s.source_id for s in batch.sources)}"
        )
        lines.append(f"  批次ID: {batch.batch_id}")
        if batch.calculation:
            lines.append(f"  结果ID: {batch.calculation.result_id}")
        if batch.review:
            lines.append(f"  复核ID: {batch.review.review_id}")
        lines.append("")
        lines.append("=" * 60)
        return "\n".join(lines)

    @staticmethod
    def get_file_bytes(batch: ProcessingBatch) -> io.BytesIO:
        content = DownloadService.build_report_content(batch)
        buf = io.BytesIO()
        buf.write(content.encode("utf-8"))
        buf.seek(0)
        return buf


class ReviewService:
    @staticmethod
    def list_pending_review() -> List[ProcessingBatch]:
        return [
            b
            for b in store.list_all()
            if b.status != RecordStatus.REVIEWED
        ]

    @staticmethod
    def submit_review(
        batch_id: str,
        reviewer: str,
        score: Optional[float] = None,
        comment: str = "",
        handling_opinion: str = "",
        corrections: Optional[Dict[str, Any]] = None,
    ) -> Optional[ProcessingBatch]:
        batch = store.get(batch_id)
        if batch is None:
            return None
        batch.review = ReviewRecord(
            review_id=new_review_id(),
            reviewer=reviewer,
            score=score,
            comment=comment,
            handling_opinion=handling_opinion,
            reviewed_at=datetime.now(),
            corrections=corrections or {},
        )
        batch.status = RecordStatus.REVIEWED
        store.save(batch)
        print(
            f"[ReviewService] 批次 {batch_id} 已复核 | 复核人={reviewer} "
            f"| 评分={score} | 处理意见={handling_opinion}"
        )
        return batch

    @staticmethod
    def reprocess_after_review(
        batch_id: str,
        formula_key: str,
        corrected_sources: Optional[List[SourceData]] = None,
    ) -> Optional[ProcessingBatch]:
        batch = store.get(batch_id)
        if batch is None:
            return None
        if corrected_sources:
            batch.sources = corrected_sources
        process_batch(batch, formula_key)
        store.save(batch)
        print(f"[ReviewService] 批次 {batch_id} 已重新计算 | 状态={batch.status.value}")
        return batch
