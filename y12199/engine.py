from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime

from models import (
    AudioTrack,
    ComplianceFinding,
    ComplianceReport,
    ComplianceReportSummary,
    CorrectionAction,
    CorrectionRecord,
    DialogueSegment,
    FindingType,
    PlatformSpec,
    ReportPhase,
    Severity,
    SegmentType,
    _gen_id,
)


class LoudnessComplianceEngine:

    def check_loudness(
        self, segment: DialogueSegment, spec: PlatformSpec
    ) -> Optional[ComplianceFinding]:
        if segment.segment_type == SegmentType.AD:
            limit = spec.max_ad_loudness_lufs
        else:
            limit = spec.max_dialogue_loudness_lufs

        if segment.loudness_lufs > limit:
            return ComplianceFinding(
                finding_id=_gen_id(),
                segment_id=segment.segment_id,
                track_id=segment.track_id,
                finding_type=FindingType.LOUDNESS_EXCEEDANCE,
                severity=Severity.CRITICAL,
                measured_value=segment.loudness_lufs,
                allowed_value=limit,
                description=(
                    f"段 {segment.segment_id} ({segment.segment_type.value}) "
                    f"响度 {segment.loudness_lufs:.1f} LUFS "
                    f"超过限制 {limit:.1f} LUFS，"
                    f"超幅 {(segment.loudness_lufs - limit):.1f} LUFS"
                ),
                affected_by_spec_ids={spec.spec_id},
            )
        return None

    def check_ad_marker(
        self, segment: DialogueSegment, spec: PlatformSpec
    ) -> Optional[ComplianceFinding]:
        if not spec.require_ad_markers:
            return None

        if segment.segment_type == SegmentType.AD and not segment.has_ad_marker:
            return ComplianceFinding(
                finding_id=_gen_id(),
                segment_id=segment.segment_id,
                track_id=segment.track_id,
                finding_type=FindingType.AD_MARKER_OMISSION,
                severity=Severity.CRITICAL,
                measured_value=0,
                allowed_value=1,
                description=(
                    f"段 {segment.segment_id} 为广告段但缺少广告标记，"
                    f"平台 {spec.platform_name} 要求所有广告段必须标注广告标记"
                ),
                affected_by_spec_ids={spec.spec_id},
            )
        return None

    def check_silent_segment(
        self, segment: DialogueSegment, spec: PlatformSpec
    ) -> Optional[ComplianceFinding]:
        duration = segment.end_time - segment.start_time
        if duration < spec.min_silent_duration_s:
            return None

        if segment.is_silent and segment.loudness_lufs > spec.silent_threshold_lufs:
            return ComplianceFinding(
                finding_id=_gen_id(),
                segment_id=segment.segment_id,
                track_id=segment.track_id,
                finding_type=FindingType.SILENT_MISJUDGMENT,
                severity=Severity.WARNING,
                measured_value=segment.loudness_lufs,
                allowed_value=spec.silent_threshold_lufs,
                description=(
                    f"段 {segment.segment_id} 标注为静音段，"
                    f"但实际响度 {segment.loudness_lufs:.1f} LUFS "
                    f"高于静音阈值 {spec.silent_threshold_lufs:.1f} LUFS，"
                    f"属于静音段误判"
                ),
                affected_by_spec_ids={spec.spec_id},
            )

        if (
            not segment.is_silent
            and segment.segment_type != SegmentType.SILENT
            and segment.loudness_lufs <= spec.silent_threshold_lufs
            and duration >= spec.min_silent_duration_s
        ):
            return ComplianceFinding(
                finding_id=_gen_id(),
                segment_id=segment.segment_id,
                track_id=segment.track_id,
                finding_type=FindingType.SILENT_MISJUDGMENT,
                severity=Severity.INFO,
                measured_value=segment.loudness_lufs,
                allowed_value=spec.silent_threshold_lufs,
                description=(
                    f"段 {segment.segment_id} 未标注为静音段，"
                    f"但实际响度 {segment.loudness_lufs:.1f} LUFS "
                    f"低于静音阈值 {spec.silent_threshold_lufs:.1f} LUFS，"
                    f"建议核实是否应标注为静音段"
                ),
                affected_by_spec_ids={spec.spec_id},
            )
        return None

    def check_segment(
        self, segment: DialogueSegment, specs: List[PlatformSpec]
    ) -> List[ComplianceFinding]:
        findings: List[ComplianceFinding] = []
        for spec in specs:
            lf = self.check_loudness(segment, spec)
            if lf:
                findings.append(lf)
            af = self.check_ad_marker(segment, spec)
            if af:
                findings.append(af)
            sf = self.check_silent_segment(segment, spec)
            if sf:
                findings.append(sf)
        return findings

    def check_track(
        self, track: AudioTrack, specs: List[PlatformSpec]
    ) -> List[ComplianceFinding]:
        findings: List[ComplianceFinding] = []
        for segment in track.segments:
            findings.extend(self.check_segment(segment, specs))
        return findings

    def check_all(
        self, tracks: List[AudioTrack], specs: List[PlatformSpec]
    ) -> List[ComplianceFinding]:
        findings: List[ComplianceFinding] = []
        for track in tracks:
            findings.extend(self.check_track(track, specs))
        return findings

    @staticmethod
    def build_summary(findings: List[ComplianceFinding]) -> ComplianceReportSummary:
        summary = ComplianceReportSummary()
        for f in findings:
            summary.total_findings += 1
            if f.severity == Severity.CRITICAL:
                summary.critical_count += 1
            elif f.severity == Severity.WARNING:
                summary.warning_count += 1
            elif f.severity == Severity.INFO:
                summary.info_count += 1
            if f.finding_type == FindingType.LOUDNESS_EXCEEDANCE:
                summary.loudness_exceedance_count += 1
            elif f.finding_type == FindingType.AD_MARKER_OMISSION:
                summary.ad_marker_omission_count += 1
            elif f.finding_type == FindingType.SILENT_MISJUDGMENT:
                summary.silent_misjudgment_count += 1
        summary.overall_pass = summary.critical_count == 0
        return summary

    @staticmethod
    def build_spec_impact_map(
        findings: List[ComplianceFinding],
    ) -> Dict[str, List[str]]:
        impact: Dict[str, List[str]] = {}
        for f in findings:
            for spec_id in f.affected_by_spec_ids:
                if spec_id not in impact:
                    impact[spec_id] = []
                impact[spec_id].append(f.finding_id)
        return impact
