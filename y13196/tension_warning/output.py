from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os
import copy

from .config import (
    ProcessStatus,
    WarningLevel,
    FAILURE_REASONS,
    determine_overall_level,
    DEFAULT_THRESHOLD,
)
from .loader import LoadResult
from .direction import DirectionCheckResult
from .algorithm import AnalysisResult


@dataclass
class ProcessRecord:
    stage: str
    status: ProcessStatus
    timestamp: str
    inputs_hash: str = ""
    parameters: Dict[str, Any] = field(default_factory=dict)
    outputs_summary: Dict[str, Any] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "stage": self.stage,
            "status": self.status.value,
            "timestamp": self.timestamp,
            "inputs_hash": self.inputs_hash,
            "parameters": self.parameters,
            "outputs_summary": self.outputs_summary,
            "notes": self.notes,
        }


@dataclass
class PageSummary:
    generated_at: str
    source_file: Optional[str]
    overall_status: str
    overall_level: str
    direction_suspended: bool
    max_tension_display: str
    max_tension_at: Optional[int]
    mean_tension_display: str
    warning_points_count: int
    danger_points_count: int
    tail_hidden_risk: bool
    tail_summary: str
    continuity_summary: str
    field_mapping_summary: Dict[str, str]
    direction_summary: str
    failure_reason: Optional[Dict[str, Any]]
    clusters_count: int
    tail_warnings: int
    tail_dangers: int
    data_quality_note: str
    conclusions_block: List[Dict[str, str]]
    evidence_lines: List[str]
    raw_status_marker: str

    def to_dict(self) -> Dict:
        return {
            "generated_at": self.generated_at,
            "source_file": self.source_file,
            "overall_status": self.overall_status,
            "overall_level": self.overall_level,
            "direction_suspended": self.direction_suspended,
            "max_tension_display": self.max_tension_display,
            "max_tension_at_seq": self.max_tension_at,
            "mean_tension_display": self.mean_tension_display,
            "warning_points_count": self.warning_points_count,
            "danger_points_count": self.danger_points_count,
            "tail_hidden_risk": self.tail_hidden_risk,
            "tail_summary": self.tail_summary,
            "continuity_summary": self.continuity_summary,
            "field_mapping_summary": self.field_mapping_summary,
            "direction_summary": self.direction_summary,
            "failure_reason": self.failure_reason,
            "clusters_count": self.clusters_count,
            "tail_warnings": self.tail_warnings,
            "tail_dangers": self.tail_dangers,
            "data_quality_note": self.data_quality_note,
            "conclusions_block": self.conclusions_block,
            "evidence_lines": self.evidence_lines,
            "raw_status_marker": self.raw_status_marker,
        }


class OutputExporter:
    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or os.path.join(os.getcwd(), "outputs")
        os.makedirs(self.output_dir, exist_ok=True)

    def _compute_hash(self, obj: Any) -> str:
        try:
            s = json.dumps(obj, sort_keys=True, default=str, ensure_ascii=False)
            h = 0
            for ch in s:
                h = (h * 131 + ord(ch)) & 0xFFFFFFFF
            return format(h, "08x")
        except Exception:
            return "n/a"

    def build_process_records(
        self,
        load_result: LoadResult,
        direction_result: DirectionCheckResult,
        analysis_result: AnalysisResult,
    ) -> List[ProcessRecord]:
        records = []
        now = datetime.now().isoformat()

        records.append(ProcessRecord(
            stage="数据加载与标准化",
            status=load_result.status,
            timestamp=load_result.load_time,
            inputs_hash=self._compute_hash({
                "source_file": load_result.source_file,
                "total_rows": load_result.total_source_rows,
            }),
            parameters={
                "source_file": load_result.source_file,
                "source_format": load_result.source_format,
            },
            outputs_summary={
                "loaded_count": load_result.loaded_count,
                "gap_count": load_result.gap_count,
                "invalid_tension_count": load_result.invalid_tension_count,
                "field_mapping": {k: v.matched_source_name for k, v in load_result.field_traces.items()},
            },
            notes=([f"加载失败: {load_result.failure_reason}"] if load_result.failure_reason and not load_result.success else []),
        ))

        if load_result.success:
            direction_notes = []
            if direction_result.is_suspended:
                direction_notes.append("方向疑似写反，挂起待人工确认，后续分析结果仅供参考")
            for issue in direction_result.issues:
                direction_notes.append(f"[{issue.severity}] {issue.issue_type}: {issue.description}")
            records.append(ProcessRecord(
                stage="方向符号校验",
                status=direction_result.status,
                timestamp=now,
                inputs_hash=self._compute_hash({
                    "loaded_count": load_result.loaded_count,
                    "direction_field": direction_result.direction_from_field,
                }),
                parameters={
                    "direction_field_found": direction_result.direction_from_field,
                },
                outputs_summary={
                    "declared_direction": direction_result.declared_direction.value if direction_result.declared_direction else None,
                    "inferred_direction": direction_result.inferred_direction.value if direction_result.inferred_direction else None,
                    "is_consistent": direction_result.is_consistent,
                    "issues_count": len(direction_result.issues),
                },
                notes=direction_notes,
            ))

            analysis_notes = []
            if analysis_result.has_hidden_tail_risk:
                analysis_notes.append("收尾段存在被平均掩盖的风险，请重点查看收尾段")
            if analysis_result.danger_count > 0:
                analysis_notes.append(f"命中危险阈值点 {analysis_result.danger_count} 个")
            if analysis_result.warning_count > 0:
                analysis_notes.append(f"命中预警阈值点 {analysis_result.warning_count} 个")
            records.append(ProcessRecord(
                stage="张力极值预警分析",
                status=analysis_result.status,
                timestamp=analysis_result.analysis_time,
                inputs_hash=self._compute_hash({
                    "direction_suspended": direction_result.is_suspended,
                    "valid_count": analysis_result.continuity.valid_count if analysis_result.continuity else 0,
                }),
                parameters={
                    "warning_threshold": analysis_result.raw_stats.get("warning_threshold"),
                    "danger_threshold": analysis_result.raw_stats.get("danger_threshold"),
                    "tail_ratio": analysis_result.raw_stats.get("tail_count_config_ratio"),
                },
                outputs_summary={
                    "overall_level": analysis_result.overall_level.value,
                    "max_tension": analysis_result.max_tension,
                    "max_tension_at_seq": analysis_result.max_tension_at,
                    "warning_count": analysis_result.warning_count,
                    "danger_count": analysis_result.danger_count,
                    "tail_hidden_risk": analysis_result.has_hidden_tail_risk,
                    "extreme_clusters_count": len(analysis_result.extreme_clusters),
                },
                notes=analysis_notes,
            ))

        records.append(ProcessRecord(
            stage="结果导出",
            status=ProcessStatus.EXPORTED,
            timestamp=now,
            inputs_hash=self._compute_hash({
                "overall_level": analysis_result.overall_level.value,
                "record_count": len(records),
            }),
            outputs_summary={
                "page_summary_generated": True,
                "process_records_count": len(records) + 1,
            },
            notes=["本文件与page_summary.json的状态标记保持一致"],
        ))

        return records

    def build_page_summary(
        self,
        load_result: LoadResult,
        direction_result: DirectionCheckResult,
        analysis_result: AnalysisResult,
    ) -> PageSummary:
        mapping_summary = {}
        for std_name, trace in load_result.field_traces.items():
            mapping_summary[std_name] = trace.matched_source_name or "(未匹配)"

        max_t_disp = (
            f"{analysis_result.max_tension:.2f}"
            if analysis_result.max_tension is not None
            else "—"
        )
        mean_t_disp = (
            f"{analysis_result.mean_tension_all_valid:.2f}"
            if analysis_result.mean_tension_all_valid is not None
            else "—"
        )

        direction_summary_parts = []
        if direction_result.declared_direction:
            direction_summary_parts.append(f"铭牌标注: {direction_result.declared_direction.value}")
        if direction_result.inferred_direction:
            direction_summary_parts.append(f"趋势推断: {direction_result.inferred_direction.value}")
        if direction_result.is_consistent:
            direction_summary_parts.append("方向一致")
        else:
            direction_summary_parts.append("方向存疑")
        if direction_result.is_suspended:
            direction_summary_parts.append("已挂起待人工确认")
        direction_summary = " / ".join(direction_summary_parts) if direction_summary_parts else "无方向数据"

        tail_risk = analysis_result.tail_risk
        if tail_risk:
            tail_parts = []
            tail_parts.append(f"收尾段起点=第{tail_risk.tail_start_index}条后")
            tail_parts.append(f"有效{tail_risk.valid_in_tail}点/断点{tail_risk.gaps_in_tail}")
            if tail_risk.max_in_tail is not None:
                tail_parts.append(f"峰值{tail_risk.max_in_tail:.2f}")
            if tail_risk.hidden_risk_flag:
                tail_parts.append(
                    f"⚠ 隐藏风险: {tail_risk.hidden_risk_evidence.get('reason', '')}"
                )
            tail_summary = "；".join(tail_parts)
        else:
            tail_summary = "无收尾数据"

        continuity = analysis_result.continuity
        if continuity:
            continuity_summary = (
                f"共{continuity.total_records}条 / 有效{continuity.valid_count} "
                f"/ 断点{continuity.gap_count}（{continuity.gap_ratio:.1%}）"
                f" / 最长断档{continuity.longest_gap_streak}"
            )
            data_note = (
                "数据质量正常"
                if continuity.continuity_score >= 0.8
                else (
                    "数据偏断续，结论请结合断点位置查看"
                    if continuity.continuity_score >= 0.5
                    else "数据严重断续，建议补采后再确认"
                )
            )
        else:
            continuity_summary = "—"
            data_note = "无连续性数据"

        verdict = determine_overall_level(
            direction_suspended=analysis_result.direction_suspended,
            danger_count=analysis_result.danger_count,
            warning_count=analysis_result.warning_count,
            tail_warning_count=analysis_result.tail_warning_count,
            has_hidden_tail_risk=analysis_result.has_hidden_tail_risk,
            max_tension=analysis_result.max_tension,
            warning_threshold=analysis_result.raw_stats.get(
                "warning_threshold", DEFAULT_THRESHOLD.warning_threshold
            ),
        )
        conclusions = verdict.conclusions
        raw_marker = verdict.level.value
        overall_status_str = verdict.display_status

        evidence = []
        evidence.append(
            f"张力最大值 {max_t_disp} 出现在第 {analysis_result.max_tension_at} 条记录 "
            f"(来源字段: {mapping_summary.get('tension', '?')})"
        )
        evidence.append(
            f"整体均值 {mean_t_disp}，预警阈值 {analysis_result.raw_stats.get('warning_threshold', '?')}，"
            f"危险阈值 {analysis_result.raw_stats.get('danger_threshold', '?')}"
        )
        if analysis_result.extreme_clusters:
            for c in analysis_result.extreme_clusters[:3]:
                evidence.append(
                    f"极值簇#{c.cluster_id}: 第{c.start_seq}-{c.end_seq}条，"
                    f"峰值{c.max_tension:.2f}，持续{c.duration_points}点，"
                    f"{'位于收尾段' if c.is_tail_cluster else '非收尾段'}"
                )
        if load_result.failure_reason:
            evidence.append(
                f"加载问题[{load_result.failure_reason.get('code')}]: "
                f"{load_result.failure_reason.get('message')}"
            )

        failure_for_summary = None
        if not load_result.success:
            failure_for_summary = load_result.failure_reason
        elif direction_result.is_suspended:
            failure_for_summary = FAILURE_REASONS["DIRECTION_AMBIGUOUS"].to_dict()
            failure_for_summary["detail"] = direction_result.evidence_summary
        elif load_result.failure_reason:
            failure_for_summary = load_result.failure_reason

        return PageSummary(
            generated_at=datetime.now().isoformat(),
            source_file=load_result.source_file,
            overall_status=overall_status_str,
            overall_level=verdict.level.value,
            direction_suspended=analysis_result.direction_suspended,
            max_tension_display=max_t_disp,
            max_tension_at=analysis_result.max_tension_at,
            mean_tension_display=mean_t_disp,
            warning_points_count=analysis_result.warning_count,
            danger_points_count=analysis_result.danger_count,
            tail_hidden_risk=analysis_result.has_hidden_tail_risk,
            tail_summary=tail_summary,
            continuity_summary=continuity_summary,
            field_mapping_summary=mapping_summary,
            direction_summary=direction_summary,
            failure_reason=failure_for_summary,
            clusters_count=len(analysis_result.extreme_clusters),
            tail_warnings=analysis_result.tail_warning_count,
            tail_dangers=analysis_result.tail_danger_count,
            data_quality_note=data_note,
            conclusions_block=conclusions,
            evidence_lines=evidence,
            raw_status_marker=raw_marker,
        )

    def _safe_json_dump(self, obj: Any, path: str) -> None:
        try:
            serialized = json.dumps(
                obj, ensure_ascii=False, indent=2, sort_keys=False, default=str
            )
        except (TypeError, ValueError) as e:
            raise RuntimeError(f"导出失败: {path} JSON 序列化错误: {e}") from e
        tmp_path = f"{path}.tmp"
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(serialized)
            os.replace(tmp_path, path)
        except OSError as e:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
            raise RuntimeError(f"导出失败: 写入 {path} 出错: {e}") from e

    def _validate_json_readable(self, path: str) -> Any:
        if not os.path.exists(path):
            raise RuntimeError(f"导出校验失败: 文件不存在 {path}")
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"导出校验失败: {path} 不是合法 JSON: {e}") from e

    def export_all(
        self,
        load_result: LoadResult,
        direction_result: DirectionCheckResult,
        analysis_result: AnalysisResult,
        file_prefix: str = "tension_warning",
    ) -> Dict[str, str]:
        process_records = self.build_process_records(load_result, direction_result, analysis_result)
        page_summary = self.build_page_summary(load_result, direction_result, analysis_result)

        prefix = file_prefix or "tension_warning"
        summary_path = os.path.join(self.output_dir, f"{prefix}_page_summary.json")
        records_path = os.path.join(self.output_dir, f"{prefix}_process_records.json")
        full_path = os.path.join(self.output_dir, f"{prefix}_full_report.json")

        status_match = (
            page_summary.raw_status_marker == analysis_result.overall_level.value
            == page_summary.overall_level
        )
        conclusions_match_status = True
        if page_summary.conclusions_block:
            first_tag = page_summary.conclusions_block[0].get("tag", "")
            expected_tags_by_level = {
                "正常": {"正常"},
                "注意": {"注意", "正常"},
                "预警": {"预警", "收尾风险"},
                "危险": {"危险", "预警", "收尾风险"},
                "挂起待确认": {"挂起"},
            }
            allowed = expected_tags_by_level.get(page_summary.raw_status_marker, set())
            conclusions_match_status = bool(allowed & {c.get("tag", "") for c in page_summary.conclusions_block})

        full_report = {
            "page_summary": page_summary.to_dict(),
            "process_records": [r.to_dict() for r in process_records],
            "analysis_detail": analysis_result.to_dict(),
            "load_detail": load_result.to_dict(),
            "direction_detail": direction_result.to_dict(),
            "consistency_check": {
                "status_match": status_match,
                "conclusions_match_status": conclusions_match_status,
                "page_raw_status_marker": page_summary.raw_status_marker,
                "page_overall_level": page_summary.overall_level,
                "analysis_overall_level": analysis_result.overall_level.value,
                "page_display_status": page_summary.overall_status,
                "conclusions_tags": [c.get("tag", "") for c in page_summary.conclusions_block],
                "export_time": datetime.now().isoformat(),
            },
        }

        self._safe_json_dump(page_summary.to_dict(), summary_path)
        self._safe_json_dump([r.to_dict() for r in process_records], records_path)
        self._safe_json_dump(full_report, full_path)

        for p in (summary_path, records_path, full_path):
            self._validate_json_readable(p)

        if not status_match or not conclusions_match_status:
            full_report["consistency_check"]["error"] = (
                "状态不一致已记录，但文件仍已导出以便排查"
            )
            self._safe_json_dump(full_report, full_path)

        return {
            "page_summary": summary_path,
            "process_records": records_path,
            "full_report": full_path,
            "consistency_status_match": status_match,
            "consistency_conclusions_match": conclusions_match_status,
        }
