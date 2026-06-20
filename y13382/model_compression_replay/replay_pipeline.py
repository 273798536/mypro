"""
回放主流程编排器
Replay Pipeline Orchestrator

把各模块串起来：别名解析→日志导入→指标计算→样本回放→报告生成。
小许只需要调Pipeline.run()，不用一个个拼模块。
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime
from typing import Callable, Dict, List, Optional, Tuple

from .log_parser import LogParser
from .metrics import CompressionMetrics
from .models import (
    BoundaryValue,
    CompressionSample,
    ProcessingRecord,
    ReplayResult,
    SampleVerdict,
    TrainingLogEntry,
    VersionAlias,
)
from .report_generator import MarkdownReportGenerator
from .sample_replay import SampleReplayer
from .version_alias import VersionAliasRegistry


class SampleSpec:
    """
    单个样本的回放规格声明

    告诉Pipeline：
    - 这个样本从哪里来的日志行（行号区间，或者直接传Entry对象列表）
    - 旧模型怎么判的（prev_verdict），为什么这么判（prev_reason）
    - 用哪个版本别名
    - 从日志字段里取哪些值算指标（字段名映射）
    """
    def __init__(
        self,
        sample_id: str,
        input_ref: str,
        line_numbers: Optional[List[int]] = None,
        log_entries: Optional[List[TrainingLogEntry]] = None,
        prev_verdict: Optional[SampleVerdict] = None,
        prev_reason: str = "",
        version_alias: Optional[str] = None,
        field_mapping: Optional[Dict[str, str]] = None,
        raw_metric_inputs: Optional[Dict[str, object]] = None,
    ) -> None:
        self.sample_id = sample_id
        self.input_ref = input_ref
        self.line_numbers = line_numbers or []
        self.log_entries = log_entries or []
        self.prev_verdict = prev_verdict
        self.prev_reason = prev_reason
        self.version_alias = version_alias
        self.field_mapping = field_mapping or {}
        self.raw_metric_inputs = raw_metric_inputs or {}


class ReplayPipeline:
    """
    模型压缩异常回放主流程

    使用示例：
        pipe = ReplayPipeline()
        # 注册一个别名指旧文件（冻结！防重跑覆盖）
        pipe.register_alias("旧模型日志", "data/old_training.log", freeze=True)
        # 声明一个样本：以前被误判为ANOMALY
        spec = SampleSpec(
            sample_id="S-001",
            input_ref="user-item pair #48291",
            line_numbers=[42, 43, 45],
            version_alias="旧模型日志",
            prev_verdict=SampleVerdict.ANOMALY,
            prev_reason="当时KL散度高被误报",
            field_mapping={
                "teacher_logits_field": "t_logits",
                "student_logits_field": "s_logits",
            },
        )
        result = pipe.run("旧模型日志", [spec], report_path="report.md")
    """

    def __init__(
        self,
        log_parser: Optional[LogParser] = None,
        metrics: Optional[CompressionMetrics] = None,
        aliases: Optional[VersionAliasRegistry] = None,
        replayer: Optional[SampleReplayer] = None,
        reporter: Optional[MarkdownReportGenerator] = None,
    ) -> None:
        self.log_parser = log_parser or LogParser()
        self.metrics = metrics or CompressionMetrics()
        self.aliases = aliases or VersionAliasRegistry()
        self.replayer = replayer or SampleReplayer(self.metrics)
        self.reporter = reporter or MarkdownReportGenerator(self.metrics)
        self._all_records: List[ProcessingRecord] = []

    # ============ 别名相关透传API ============

    def register_alias(self, alias: str, target_path: str, description: str = "",
                       freeze: bool = False, verify_now: bool = True) -> VersionAlias:
        return self.aliases.register(alias, target_path, description, freeze, verify_now)

    def freeze_alias(self, alias: str) -> VersionAlias:
        return self.aliases.freeze(alias)

    def override_boundary(self, name: str, boundary: BoundaryValue) -> None:
        self.metrics.override_boundary(name, boundary)

    # ============ 工具方法 ============

    def _drain_all_records(self) -> List[ProcessingRecord]:
        recs = []
        recs.extend(self.log_parser.drain_records())
        recs.extend(self.aliases.drain_records())
        recs.extend(self.metrics.drain_records())
        recs.extend(self.replayer.drain_records())
        recs.extend(self.reporter.drain_records())
        recs.sort(key=lambda r: r.timestamp)
        self._all_records.extend(recs)
        return list(recs)

    @staticmethod
    def _parse_float_list(raw: object) -> List[float]:
        """从日志里解析出的logits列表可能是各种奇怪的格式"""
        if raw is None:
            return []
        if isinstance(raw, list):
            return [float(x) for x in raw]
        if isinstance(raw, str):
            cleaned = raw.strip().strip("[]()")
            if not cleaned:
                return []
            parts = [p.strip() for p in cleaned.replace(";", ",").split(",") if p.strip()]
            try:
                return [float(p) for p in parts]
            except ValueError:
                return []
        return []

    @staticmethod
    def _read_field(entry_or_entries, field_name: str, mapping: Dict[str, str]) -> Optional[object]:
        actual_field = mapping.get(field_name, field_name)
        entries = entry_or_entries if isinstance(entry_or_entries, list) else [entry_or_entries]
        for e in entries:
            if actual_field in e.extracted_fields:
                return e.extracted_fields[actual_field]
        return None

    # ============ 指标计算 ============

    def _compute_metrics_for_sample(
        self,
        sample: CompressionSample,
        entries: List[TrainingLogEntry],
        mapping: Dict[str, str],
        raw_inputs: Dict[str, object],
    ) -> None:
        refs = [e.as_reference() for e in entries]

        if "teacher_logits" in raw_inputs and "student_logits" in raw_inputs:
            t = self._parse_float_list(raw_inputs["teacher_logits"])
            s = self._parse_float_list(raw_inputs["student_logits"])
            T = float(raw_inputs.get("temperature", 1.0))
        else:
            t_raw = self._read_field(entries, "teacher_logits", mapping)
            s_raw = self._read_field(entries, "student_logits", mapping)
            t = self._parse_float_list(t_raw)
            s = self._parse_float_list(s_raw)
            T_raw = self._read_field(entries, "temperature", mapping)
            T = float(T_raw) if T_raw is not None else 1.0
        if t and s:
            try:
                sample.metrics["kl_divergence"] = self.metrics.kl_divergence(
                    t, s, temperature=T, log_refs=refs, log_entries=entries
                )
            except Exception as ex:
                self._all_records.append(ProcessingRecord(
                    record_id=f"ERR-{uuid.uuid4().hex[:12]}",
                    stage=ProcessingStage.METRIC_CALCULATION,
                    action="KL计算异常",
                    inputs={"sample": sample.sample_id},
                    outputs={"error": str(ex)},
                    log_refs=refs,
                    operator="ReplayPipeline",
                    notes=[f"异常原因: {ex}"],
                ))

        if "original_size_bytes" in raw_inputs and "compressed_size_bytes" in raw_inputs:
            try:
                sample.metrics["compression_ratio"] = self.metrics.compression_ratio(
                    int(raw_inputs["original_size_bytes"]),
                    int(raw_inputs["compressed_size_bytes"]),
                    log_refs=refs, log_entries=entries,
                )
            except Exception as ex:
                pass
        else:
            orig_raw = self._read_field(entries, "original_size_bytes", mapping)
            comp_raw = self._read_field(entries, "compressed_size_bytes", mapping)
            if orig_raw is not None and comp_raw is not None:
                try:
                    sample.metrics["compression_ratio"] = self.metrics.compression_ratio(
                        int(orig_raw), int(comp_raw), log_refs=refs, log_entries=entries
                    )
                except Exception:
                    pass

        if "baseline_acc" in raw_inputs and "compressed_acc" in raw_inputs:
            try:
                sample.metrics["accuracy_drop_percent"] = self.metrics.accuracy_drop_percent(
                    float(raw_inputs["baseline_acc"]),
                    float(raw_inputs["compressed_acc"]),
                    log_refs=refs, log_entries=entries,
                )
            except Exception:
                pass
        else:
            bl_raw = self._read_field(entries, "baseline_acc", mapping)
            cp_raw = self._read_field(entries, "compressed_acc", mapping)
            if bl_raw is not None and cp_raw is not None:
                try:
                    sample.metrics["accuracy_drop_percent"] = self.metrics.accuracy_drop_percent(
                        float(bl_raw), float(cp_raw), log_refs=refs, log_entries=entries
                    )
                except Exception:
                    pass

        if "total_params" in raw_inputs and "zero_params" in raw_inputs:
            try:
                sample.metrics["weight_sparsity"] = self.metrics.weight_sparsity(
                    int(raw_inputs["total_params"]),
                    int(raw_inputs["zero_params"]),
                    log_refs=refs, log_entries=entries,
                )
            except Exception:
                pass
        else:
            tp_raw = self._read_field(entries, "total_params", mapping)
            zp_raw = self._read_field(entries, "zero_params", mapping)
            if tp_raw is not None and zp_raw is not None:
                try:
                    sample.metrics["weight_sparsity"] = self.metrics.weight_sparsity(
                        int(tp_raw), int(zp_raw), log_refs=refs, log_entries=entries
                    )
                except Exception:
                    pass

        if "per_layer_fisher" in raw_inputs:
            f = self._parse_float_list(raw_inputs["per_layer_fisher"])
            if f:
                try:
                    sample.metrics["fisher_information_norm"] = self.metrics.fisher_information_norm(
                        f, log_refs=refs, log_entries=entries
                    )
                except Exception:
                    pass

    # ============ 主流程 ============

    def run(
        self,
        log_source: str,
        sample_specs: List[SampleSpec],
        report_path: Optional[str] = None,
        log_is_alias: bool = True,
    ) -> ReplayResult:
        """
        执行完整回放流程

        Args:
            log_source: 日志文件路径，或版本别名
            sample_specs: 要回放的样本规格列表
            report_path: 可选，输出Markdown报告路径
            log_is_alias: True表示log_source是别名，会走别名校验；False直接当路径用

        Returns:
            ReplayResult，内含所有材料
        """
        run_id = f"RUN-{uuid.uuid4().hex[:10]}"
        result = ReplayResult(run_id=run_id, started_at=datetime.now())

        # ---- Step 1: 解析日志（走别名→防乱材料）----
        aliases_used: List[VersionAlias] = []
        log_path = log_source
        if log_is_alias:
            try:
                va = self.aliases.get(log_source)
                aliases_used.append(va)
                # resolve带哈希校验——乱材料篡改立刻露怯
                log_path = self.aliases.resolve(log_source, verify=True)
            except KeyError:
                raise ValueError(
                    f"版本别名[{log_source}]未注册！"
                    "请先调用pipe.register_alias()注册。如果想直接传路径，传log_is_alias=False。"
                )
        else:
            if not os.path.exists(log_path):
                raise FileNotFoundError(f"日志文件不存在: {log_path}")

        all_entries = self.log_parser.parse_file(log_path, alias_hint=log_source if log_is_alias else None)
        entries_by_lineno = {e.line_number: e for e in all_entries}

        result.bad_data_rows = [e for e in all_entries if e.is_corrupt]
        result.version_aliases_used = aliases_used

        # ---- Step 2: 组装样本 + 算指标 ----
        built_samples: List[CompressionSample] = []
        for spec in sample_specs:
            entries = list(spec.log_entries)
            for ln in spec.line_numbers:
                if ln in entries_by_lineno:
                    entries.append(entries_by_lineno[ln])
            entries.sort(key=lambda e: e.line_number)

            sample = CompressionSample(
                sample_id=spec.sample_id,
                input_ref=spec.input_ref,
                log_entries=entries,
                version_alias=spec.version_alias,
            )
            self._compute_metrics_for_sample(
                sample, entries, spec.field_mapping, dict(spec.raw_metric_inputs)
            )
            built_samples.append(sample)

        # ---- Step 3: 回放判定 ----
        replayed: List[CompressionSample] = []
        for spec, sample in zip(sample_specs, built_samples):
            replayed.append(self.replayer.replay_sample(
                sample,
                prev_verdict=spec.prev_verdict,
                prev_reason=spec.prev_reason,
            ))

        result.samples = replayed
        result.boundary_samples = [s for s in replayed if s.is_boundary_sample]
        result.verdict_changed_samples = [
            s for s in replayed
            if s.prev_verdict is not None and s.prev_verdict != s.verdict
        ]
        result.conclusions = self.replayer.drain_conclusions()

        # ---- Step 4: 收齐所有处理记录 ----
        self._drain_all_records()

        # ---- Step 5: 生成报告 ----
        result.processing_records = sorted(self._all_records, key=lambda r: r.timestamp)
        if report_path:
            self.reporter.generate(result, output_path=report_path)
            result.report_path = os.path.abspath(report_path)
        else:
            self.reporter.generate(result)  # 只生成文本，不落盘（记录仍会产生）

        self._drain_all_records()
        result.processing_records = sorted(self._all_records, key=lambda r: r.timestamp)
        result.finished_at = datetime.now()

        return result
