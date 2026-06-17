from typing import List, Dict, Optional, Tuple
from datetime import datetime
import random
import uuid

from models import (
    ReplayConfig, ReplayResult, ScoreThreshold, ScoreSnapshot,
    ScoreVerdict, Confidence, CaseMaterial, MaterialStatus,
    ManualCorrection, WithdrawRecord, VerbalNote, TimelineEvent,
    DecisionStatus, GrayBreakdown, ERROR_MESSAGES
)
from material_tracker import MaterialTracker


class ReplayEngine:
    def __init__(self, material_tracker: Optional[MaterialTracker] = None):
        self.material_tracker = material_tracker or MaterialTracker()
        self._thresholds: Dict[str, ScoreThreshold] = {}
        self._event_seq = 100000

    def _next_event_id(self) -> str:
        self._event_seq += 1
        return f"evt_{self._event_seq:06d}"

    def register_threshold(self, threshold: ScoreThreshold):
        self._thresholds[threshold.threshold_id] = threshold

    def _apply_threshold_drift(
        self,
        base_threshold: ScoreThreshold,
        drift: float
    ) -> ScoreThreshold:
        return ScoreThreshold(
            threshold_id=f"{base_threshold.threshold_id}_drift_{drift:+.2f}",
            threshold_name=f"{base_threshold.threshold_name}(漂移{drift:+.2f})",
            pass_line=round(base_threshold.pass_line + drift, 2),
            reject_line=round(base_threshold.reject_line + drift, 2),
            effective_from=base_threshold.effective_from,
            effective_to=base_threshold.effective_to,
            description=f"阈值漂移测试，基于{base_threshold.threshold_id}，pass线{drift:+.2f}"
        )

    def _calc_score_from_materials(
        self,
        materials: List[CaseMaterial],
        base_score: Optional[float] = None
    ) -> Tuple[float, List[str], Confidence]:
        if base_score is not None:
            score = base_score
        else:
            score = 60.0
            valid_materials = [m for m in materials if m.status != MaterialStatus.WITHDRAWN]
            for mat in valid_materials:
                if mat.material_type == "收入证明":
                    score += 8
                elif mat.material_type == "征信报告":
                    score += 12
                elif mat.material_type == "资产证明":
                    score += 10
                elif mat.material_type == "身份资料":
                    score += 5
                else:
                    score += 3
        missing = []
        confidence = Confidence.HIGH
        expected = ["身份资料", "收入证明", "征信报告"]
        existing_types = {m.material_type for m in materials if m.status != MaterialStatus.WITHDRAWN}
        for et in expected:
            if et not in existing_types:
                missing.append(et)
        if missing:
            confidence = Confidence.LOW
        revised_count = sum(1 for m in materials if m.is_revised)
        if revised_count >= 2:
            confidence = Confidence.MEDIUM
        ref_gap_count = sum(1 for m in materials if m.has_reference_gaps() and m.status != MaterialStatus.WITHDRAWN)
        if ref_gap_count > 0:
            if confidence == Confidence.HIGH:
                confidence = Confidence.MEDIUM
        score = max(0.0, min(100.0, score))
        return round(score, 2), missing, confidence

    def _verdict_from_threshold(
        self,
        score: float,
        threshold: ScoreThreshold
    ) -> ScoreVerdict:
        if score >= threshold.pass_line:
            return ScoreVerdict.PASS
        elif score <= threshold.reject_line:
            return ScoreVerdict.REJECT
        else:
            return ScoreVerdict.GRAY

    def run_replay(
        self,
        config: ReplayConfig,
        case_id: str,
        materials: List[CaseMaterial],
        corrections: List[ManualCorrection],
        withdrawals: List[WithdrawRecord],
        verbal_notes: List[VerbalNote],
        base_score: Optional[float] = None
    ) -> ReplayResult:
        result = ReplayResult(run_id=config.run_id, case_id=case_id)

        if config.baseline_threshold_id and config.baseline_threshold_id not in self._thresholds:
            result.errors.append(ERROR_MESSAGES["NO_BASELINE_THRESHOLD"])
            result.final_status = DecisionStatus.NEEDS_MATERIAL
            return result

        material_chain, timeline_events, warnings, errors = self.material_tracker.assemble_material_chain(
            case_id, materials, corrections, withdrawals, verbal_notes
        )
        result.material_chain = material_chain
        result.corrections = [c for c in corrections if c.case_id == case_id]
        result.withdrawals = [w for w in withdrawals if w.case_id == case_id]
        result.verbal_notes = [v for v in verbal_notes if v.case_id == case_id]
        result.warnings.extend(warnings)
        result.errors.extend(errors)
        result.events.extend(timeline_events)
        result.revised_materials = [m.material_id for m in material_chain if m.is_revised]

        missing_refs = [m.material_id for m in material_chain if m.has_reference_gaps() and m.status != MaterialStatus.WITHDRAWN]
        result.missing_references = missing_refs

        if config.inject_missing_materials:
            result.warnings.append("[注入测试] 模拟缺少身份资料的场景")
        if config.inject_conflicting_materials:
            conflicts = self.material_tracker.check_conflicting_versions(material_chain)
            if conflicts:
                result.warnings.append(ERROR_MESSAGES["MATERIAL_CONFLICT"])

        baseline_th = None
        compare_th = None
        if config.baseline_threshold_id:
            baseline_th = self._thresholds.get(config.baseline_threshold_id)
        if not baseline_th and self._thresholds:
            baseline_th = list(self._thresholds.values())[0]

        if baseline_th is None:
            result.errors.append(ERROR_MESSAGES["NO_BASELINE_THRESHOLD"])
            result.final_status = DecisionStatus.NEEDS_MATERIAL
            return result

        active_thresholds: List[ScoreThreshold] = [baseline_th]

        if config.comparison_threshold_id:
            ct = self._thresholds.get(config.comparison_threshold_id)
            if ct:
                active_thresholds.append(ct)

        if config.threshold_drift is not None:
            drifted = self._apply_threshold_drift(baseline_th, config.threshold_drift)
            active_thresholds.append(drifted)
            result.warnings.append(f"[阈值漂移] pass线从{baseline_th.pass_line}调整到{drifted.pass_line}，reject线从{baseline_th.reject_line}调整到{drifted.reject_line}")

        score, missing_mats, confidence = self._calc_score_from_materials(material_chain, base_score)

        if config.inject_missing_materials:
            missing_mats.append("身份资料")
            confidence = Confidence.LOW

        for th in active_thresholds:
            verdict = self._verdict_from_threshold(score, th)
            snapshot = ScoreSnapshot(
                case_id=case_id,
                score=score,
                threshold_id=th.threshold_id,
                verdict=verdict,
                timestamp=datetime.now(),
                confidence=confidence,
                missing_materials=missing_mats.copy()
            )
            result.score_snapshots.append(snapshot)
            result.events.append(TimelineEvent(
                event_id=self._next_event_id(),
                case_id=case_id,
                timestamp=datetime.now(),
                event_type="评分快照",
                description=f"阈值[{th.threshold_name}]下得分为{score}，结论：{verdict.value}，置信度：{confidence.value}",
                status=DecisionStatus.PROCESSED if verdict != ScoreVerdict.GRAY else DecisionStatus.GRAY,
                details={
                    "threshold_id": th.threshold_id,
                    "score": score,
                    "verdict": verdict.value,
                    "confidence": confidence.value
                }
            ))

        for corr in result.corrections:
            result.events.append(TimelineEvent(
                event_id=self._next_event_id(),
                case_id=case_id,
                timestamp=corr.timestamp,
                event_type="人工改判",
                description=f"由{corr.operator}将结论从{corr.original_verdict.value}改为{corr.corrected_verdict.value}，原因：{corr.reason}",
                status=DecisionStatus.MANUAL_CHANGED,
                operator=corr.operator,
                details={
                    "original": corr.original_verdict.value,
                    "corrected": corr.corrected_verdict.value,
                    "reason": corr.reason
                }
            ))

        if missing_mats:
            result.final_status = DecisionStatus.NEEDS_MATERIAL
            result.events.append(TimelineEvent(
                event_id=self._next_event_id(),
                case_id=case_id,
                timestamp=datetime.now(),
                event_type="待补材料标记",
                description=f"缺少材料：{', '.join(missing_mats)}，需补齐后继续评估",
                status=DecisionStatus.NEEDS_MATERIAL,
                details={"missing": missing_mats}
            ))

        baseline_snapshot = None
        drift_snapshot = None
        for snap in result.score_snapshots:
            if baseline_th and snap.threshold_id == baseline_th.threshold_id:
                baseline_snapshot = snap
            if config.threshold_drift is not None and "_drift_" in snap.threshold_id:
                drift_snapshot = snap

        if baseline_snapshot:
            breakdown = GrayBreakdown(
                case_id=case_id,
                final_verdict=baseline_snapshot.verdict
            )
            if drift_snapshot:
                breakdown.threshold_change_delta = round(drift_snapshot.score - baseline_snapshot.score, 2)
                breakdown.threshold_change_note = f"阈值漂移导致结论从{baseline_snapshot.verdict.value}变为{drift_snapshot.verdict.value}"
            ref_gap_ratio = len(missing_refs) / max(len(material_chain), 1)
            if ref_gap_ratio > 0:
                breakdown.sample_change_delta = round(-ref_gap_ratio * 10, 2)
                breakdown.sample_change_note = f"{len(missing_refs)}份材料缺少引用，样本可信度下降约{round(ref_gap_ratio*100)}%"
            if result.corrections:
                last_corr = result.corrections[-1]
                manual_delta = 0.0
                if last_corr.corrected_verdict == ScoreVerdict.PASS and last_corr.original_verdict == ScoreVerdict.REJECT:
                    manual_delta = 15.0
                elif last_corr.corrected_verdict == ScoreVerdict.REJECT and last_corr.original_verdict == ScoreVerdict.PASS:
                    manual_delta = -15.0
                breakdown.manual_override_delta = manual_delta
                breakdown.manual_override_note = f"人工改判：{last_corr.original_verdict.value}→{last_corr.corrected_verdict.value}"
            result.gray_breakdown = breakdown

        if result.corrections:
            last_corr = result.corrections[-1]
            result.final_verdict = last_corr.corrected_verdict
            result.final_status = DecisionStatus.MANUAL_CHANGED
        elif baseline_snapshot:
            result.final_verdict = baseline_snapshot.verdict
            if result.final_status == DecisionStatus.PROCESSED:
                if baseline_snapshot.verdict == ScoreVerdict.GRAY:
                    result.final_status = DecisionStatus.GRAY

        if missing_refs and result.final_verdict and confidence in (Confidence.LOW, Confidence.UNCERTAIN):
            result.warnings.append(
                f"[可信度提示] 当前结论{result.final_verdict.value}基于不完整引用支撑，建议补齐后重新确认"
            )

        result.events.sort(key=lambda e: e.timestamp)
        return result
