from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from .models import (
    SamplePackage,
    SampleItem,
    Note,
    NoteType,
    CheckResult,
    CheckStatus,
    DetectionRecord,
)
from .idempotency import IdempotencyGuard


HALF_BEAT_TOLERANCE = 0.1


@dataclass
class StageChannelImpact:
    note_id: str
    note_content: str
    judgments_altered: List[str] = field(default_factory=list)
    before_status: CheckStatus = CheckStatus.PASS
    after_status: CheckStatus = CheckStatus.PASS


@dataclass
class SampleAnomalyDetector:
    half_beat_tolerance: float = HALF_BEAT_TOLERANCE
    require_role_on_half_beat: str = "运营主管"
    min_duration_sec: float = 0.2
    max_duration_sec: float = 600.0
    standard_sample_rates: Tuple[int, ...] = (44100, 48000, 96000)
    standard_bit_depths: Tuple[int, ...] = (16, 24, 32)

    # ── 基础检查 ──────────────────────────────────────────────
    def check_basic_quality(self, pkg: SamplePackage) -> List[CheckResult]:
        results: List[CheckResult] = []
        for it in pkg.items:
            if it.sample_rate not in self.standard_sample_rates:
                results.append(CheckResult(
                    status=CheckStatus.WARNING,
                    title=f"采样率异常: {it.name}",
                    detail=(
                        f"{it.name} 采样率={it.sample_rate}Hz，"
                        f"不在标准列表 {self.standard_sample_rates} 中"
                    ),
                    affected_item_ids=[it.item_id],
                    related_judgments=[f"sr_standard_{it.sample_rate}"],
                ))
            if it.bit_depth not in self.standard_bit_depths:
                results.append(CheckResult(
                    status=CheckStatus.WARNING,
                    title=f"位深异常: {it.name}",
                    detail=(
                        f"{it.name} 位深={it.bit_depth}bit，"
                        f"不在标准列表 {self.standard_bit_depths} 中"
                    ),
                    affected_item_ids=[it.item_id],
                    related_judgments=[f"bit_standard_{it.bit_depth}"],
                ))
            if it.duration_sec <= 0:
                results.append(CheckResult(
                    status=CheckStatus.FAIL,
                    title=f"时长无效: {it.name}",
                    detail=f"{it.name} 时长 {it.duration_sec}s 小于等于 0",
                    affected_item_ids=[it.item_id],
                    related_judgments=["duration_positive"],
                ))
            elif it.duration_sec < self.min_duration_sec:
                results.append(CheckResult(
                    status=CheckStatus.WARNING,
                    title=f"时长过短: {it.name}",
                    detail=(
                        f"{it.name} 时长 {it.duration_sec}s "
                        f"< 阈值 {self.min_duration_sec}s"
                    ),
                    affected_item_ids=[it.item_id],
                    related_judgments=["duration_min"],
                ))
            elif it.duration_sec > self.max_duration_sec:
                results.append(CheckResult(
                    status=CheckStatus.WARNING,
                    title=f"时长过长: {it.name}",
                    detail=(
                        f"{it.name} 时长 {it.duration_sec}s "
                        f"> 阈值 {self.max_duration_sec}s"
                    ),
                    affected_item_ids=[it.item_id],
                    related_judgments=["duration_max"],
                ))
            if not it.checksum:
                results.append(CheckResult(
                    status=CheckStatus.WARNING,
                    title=f"缺少校验和: {it.name}",
                    detail=f"{it.name} 未提供 checksum，无法验证文件完整性",
                    affected_item_ids=[it.item_id],
                    related_judgments=["checksum_present"],
                ))
            if it.channel_count not in (1, 2):
                results.append(CheckResult(
                    status=CheckStatus.WARNING,
                    title=f"声道数异常: {it.name}",
                    detail=(
                        f"{it.name} 声道数={it.channel_count}，"
                        f"预期单声道/立体声"
                    ),
                    affected_item_ids=[it.item_id],
                    related_judgments=[f"channels_{it.channel_count}"],
                ))
        return results

    # ── 时码偏半拍检测（核心挂起逻辑） ────────────────────────
    def check_timecode(
        self, pkg: SamplePackage
    ) -> Tuple[List[CheckResult], List[CheckResult]]:
        normal: List[CheckResult] = []
        half_beat: List[CheckResult] = []
        for it in pkg.items:
            if it.timecode_offset_beats == 0.0:
                continue
            frac = abs(it.timecode_offset_beats - round(it.timecode_offset_beats))
            if math.isclose(frac, 0.5, abs_tol=self.half_beat_tolerance):
                half_beat.append(CheckResult(
                    status=CheckStatus.HANG,
                    title=f"时码偏半拍（待确认）: {it.name}",
                    detail=(
                        f"{it.name} 时码偏移 {it.timecode_offset_beats} 拍，"
                        f"恰好落在 0.5 拍附近（容忍±{self.half_beat_tolerance}），"
                        f"可能是素材问题也可能是故意设计。已挂起，"
                        f"需 {self.require_role_on_half_beat} 确认后再下结论。"
                    ),
                    affected_item_ids=[it.item_id],
                    requires_confirm_role=self.require_role_on_half_beat,
                    related_judgments=["timecode_half_beat_hang"],
                ))
            else:
                normal.append(CheckResult(
                    status=CheckStatus.WARNING,
                    title=f"时码非整数拍: {it.name}",
                    detail=(
                        f"{it.name} 时码偏移 {it.timecode_offset_beats} 拍，"
                        f"非整数拍，但未触发挂起阈值。"
                    ),
                    affected_item_ids=[it.item_id],
                    related_judgments=["timecode_non_integer"],
                ))
        return normal, half_beat

    # ── 舞台通道表备注影响评估 ────────────────────────────────
    def evaluate_stage_channel_impact(
        self,
        pkg: SamplePackage,
        base_results: List[CheckResult],
    ) -> Tuple[List[CheckResult], List[StageChannelImpact]]:
        stage_notes = [n for n in pkg.notes if n.note_type == NoteType.STAGE_CHANNEL]
        if not stage_notes:
            return list(base_results), []

        impacts: List[StageChannelImpact] = []
        new_results: List[CheckResult] = []
        note_ids_used = {n.note_id for n in stage_notes}

        for r in base_results:
            r_copy = CheckResult(
                status=r.status,
                title=r.title,
                detail=r.detail,
                affected_item_ids=list(r.affected_item_ids),
                requires_confirm_role=r.requires_confirm_role,
                changed_by_note_ids=list(r.changed_by_note_ids),
                related_judgments=list(r.related_judgments),
            )

            judgment_overridden = False
            for note in stage_notes:
                if not note.affects_fields:
                    continue
                hit = any(
                    j for j in r.related_judgments
                    if any(a in j for a in note.affects_fields)
                )
                if not hit and r.affected_item_ids:
                    pass
                hit = hit or (
                    note.affects_fields
                    and r.affected_item_ids
                    and any(
                        a.lower() in it.name.lower()
                        for a in note.affects_fields
                        for it in pkg.items
                        if it.item_id in r.affected_item_ids
                    )
                )
                if not hit:
                    continue

                old_status = r_copy.status
                if r_copy.status in (CheckStatus.WARNING, CheckStatus.FAIL):
                    r_copy.status = CheckStatus.PASS
                    r_copy.changed_by_note_ids.append(note.note_id)
                    r_copy.related_judgments.append(
                        f"stage_channel_override_{note.note_id}"
                    )
                    judgment_overridden = True

                    impacts.append(StageChannelImpact(
                        note_id=note.note_id,
                        note_content=note.content,
                        judgments_altered=r.related_judgments,
                        before_status=old_status,
                        after_status=r_copy.status,
                    ))
                    r_copy.detail += (
                        f" 【舞台通道备注覆盖】备注#{note.note_id[:6]} "
                        f"（{note.author}）：{note.content}；"
                        f"原判定 {old_status.value} → {r_copy.status.value}。"
                    )
                elif r_copy.status == CheckStatus.HANG:
                    r_copy.changed_by_note_ids.append(note.note_id)
                    r_copy.related_judgments.append(
                        f"stage_channel_flagged_{note.note_id}"
                    )
                    impacts.append(StageChannelImpact(
                        note_id=note.note_id,
                        note_content=note.content,
                        judgments_altered=r.related_judgments,
                        before_status=old_status,
                        after_status=r_copy.status,
                    ))
                    r_copy.detail += (
                        f" 【舞台通道备注关联】备注#{note.note_id[:6]} "
                        f"（{note.author}）：{note.content}；"
                        f"本项涉及挂起结论，仍保留 HANG 状态供主管确认，"
                        f"但已记录与该备注关联。"
                    )

            new_results.append(r_copy)

        # 附加一条汇总结果，说明舞台通道备注改变了哪些判断
        if impacts:
            summary_lines = []
            for imp in impacts:
                summary_lines.append(
                    f"备注#{imp.note_id[:6]}[{imp.note_content[:30]}] 覆盖 "
                    f"{imp.judgments_altered}："
                    f"{imp.before_status.value}→{imp.after_status.value}"
                )
            new_results.append(CheckResult(
                status=CheckStatus.PASS,
                title="舞台通道表备注：判断影响说明",
                detail="；".join(summary_lines),
                changed_by_note_ids=list(note_ids_used),
                related_judgments=["stage_channel_summary"],
            ))

        return new_results, impacts

    # ── 执行一次完整扫描 ──────────────────────────────────────
    def scan(
        self,
        pkg: SamplePackage,
        operator: str = "",
        idem_guard: Optional[IdempotencyGuard] = None,
    ) -> DetectionRecord:
        record = DetectionRecord(
            package_id=pkg.package_id,
            operator=operator,
            package_version=pkg.version,
        )

        if idem_guard is not None:
            idem_guard.reset_from_record(None)
            fresh_notes, skipped = idem_guard.filter_new_notes(
                pkg.notes, record.record_id
            )
            note_count_real = idem_guard.dedupe_note_count(pkg.notes)
            record.note_signatures_seen = idem_guard.mark_scan(pkg.notes)

            if skipped:
                record.results.append(CheckResult(
                    status=CheckStatus.PASS,
                    title="幂等去重提示",
                    detail=(
                        f"本次扫描共 {len(pkg.notes)} 条备注，"
                        f"去重后真实 {note_count_real} 条；"
                        f"识别出 {len(skipped)} 条重复签名备注（已忽略）。"
                    ),
                    related_judgments=["idempotency_skip"],
                ))
            else:
                record.results.append(CheckResult(
                    status=CheckStatus.PASS,
                    title="备注幂等检查通过",
                    detail=(
                        f"共 {len(pkg.notes)} 条备注，"
                        f"去重后真实 {note_count_real} 条，无重复。"
                    ),
                    related_judgments=["idempotency_ok"],
                ))
        else:
            sigs = [n.signature() for n in pkg.notes]
            record.note_signatures_seen = sigs

        basic = self.check_basic_quality(pkg)
        tc_normal, tc_hang = self.check_timecode(pkg)

        base_results = basic + tc_normal + tc_hang

        final_results, impacts = self.evaluate_stage_channel_impact(
            pkg, base_results
        )
        record.stage_channel_note_applied = len(impacts) > 0

        for r in final_results:
            record.results.append(r)

        # 人工批注 / 林姐改动的快照，后续交叉校验使用
        record.manual_annotations = list(pkg.manual_annotations)
        record.checklist = pkg.delivery_checklist

        return record
