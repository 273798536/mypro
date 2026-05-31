import copy
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
from engine import LoudnessComplianceEngine


class ComplianceSession:

    def __init__(self) -> None:
        self._engine = LoudnessComplianceEngine()
        self._tracks: Dict[str, AudioTrack] = {}
        self._segments: Dict[str, DialogueSegment] = {}
        self._specs: Dict[str, PlatformSpec] = {}
        self._findings: Dict[str, ComplianceFinding] = {}
        self._correction_history: Dict[str, List[CorrectionRecord]] = {}
        self._reports: List[ComplianceReport] = []
        self._phase: ReportPhase = ReportPhase.FIRST_IMPORT
        self._spec_imported: bool = False
        self._finding_segment_index: Dict[str, List[str]] = {}

    @property
    def phase(self) -> ReportPhase:
        return self._phase

    @property
    def tracks(self) -> Dict[str, AudioTrack]:
        return dict(self._tracks)

    @property
    def specs(self) -> Dict[str, PlatformSpec]:
        return dict(self._specs)

    @property
    def findings(self) -> Dict[str, ComplianceFinding]:
        return dict(self._findings)

    def import_audio_tracks(self, tracks: List[AudioTrack]) -> ComplianceReport:
        for track in tracks:
            self._tracks[track.track_id] = track
            for seg in track.segments:
                self._segments[seg.segment_id] = seg

        self._phase = ReportPhase.FIRST_IMPORT
        return self._run_compliance_check()

    def import_platform_spec(self, specs: List[PlatformSpec]) -> ComplianceReport:
        new_spec_ids: List[str] = []
        for spec in specs:
            if spec.spec_id not in self._specs:
                new_spec_ids.append(spec.spec_id)
            self._specs[spec.spec_id] = spec

        self._spec_imported = True
        self._phase = ReportPhase.SECOND_IMPORT
        return self._run_compliance_check(new_spec_ids=new_spec_ids)

    def update_segment_annotation(
        self, segment_id: str, **kwargs
    ) -> Tuple[ComplianceReport, List[CorrectionRecord]]:
        if segment_id not in self._segments:
            raise ValueError(f"段 {segment_id} 不存在")

        old_seg = self._segments[segment_id]
        old_version = old_seg.annotation_version
        new_seg = old_seg.update_annotation(**kwargs)

        self._segments[segment_id] = new_seg
        for track in self._tracks.values():
            for i, seg in enumerate(track.segments):
                if seg.segment_id == segment_id:
                    track.segments[i] = new_seg
                    break

        old_findings_for_seg = {
            fid: f
            for fid, f in self._findings.items()
            if f.segment_id == segment_id
        }

        records = self._record_annotation_change(
            segment_id, old_findings_for_seg, old_version, new_seg.annotation_version
        )

        removed_ids = set(old_findings_for_seg.keys())

        for fid in removed_ids:
            del self._findings[fid]
            if segment_id in self._finding_segment_index:
                self._finding_segment_index[segment_id] = [
                    x for x in self._finding_segment_index[segment_id] if x != fid
                ]

        track_id = new_seg.track_id
        if track_id in self._tracks:
            new_findings = self._engine.check_segment(
                new_seg, list(self._specs.values())
            )
            for f in new_findings:
                self._findings[f.finding_id] = f
                if segment_id not in self._finding_segment_index:
                    self._finding_segment_index[segment_id] = []
                self._finding_segment_index[segment_id].append(f.finding_id)

        report = self._build_current_report()
        return report, records

    def get_correction_history(self, segment_id: str) -> List[CorrectionRecord]:
        return self._correction_history.get(segment_id, [])

    def get_spec_impact(self, spec_id: str) -> List[ComplianceFinding]:
        return [
            f for f in self._findings.values() if spec_id in f.affected_by_spec_ids
        ]

    def get_segment_findings(self, segment_id: str) -> List[ComplianceFinding]:
        finding_ids = self._finding_segment_index.get(segment_id, [])
        return [self._findings[fid] for fid in finding_ids if fid in self._findings]

    def get_current_report(self) -> ComplianceReport:
        return self._build_current_report()

    def _run_compliance_check(
        self, new_spec_ids: Optional[List[str]] = None
    ) -> ComplianceReport:
        prev_findings = dict(self._findings)
        self._findings.clear()
        self._finding_segment_index.clear()

        track_list = list(self._tracks.values())
        spec_list = list(self._specs.values())

        all_findings = self._engine.check_all(track_list, spec_list)

        for f in all_findings:
            self._findings[f.finding_id] = f
            if f.segment_id not in self._finding_segment_index:
                self._finding_segment_index[f.segment_id] = []
            self._finding_segment_index[f.segment_id].append(f.finding_id)

        changes = self._compute_changes(prev_findings, new_spec_ids)
        spec_impact = self._engine.build_spec_impact_map(all_findings)
        summary = self._engine.build_summary(all_findings)

        report = ComplianceReport(
            report_id=_gen_id(),
            phase=self._phase,
            findings=all_findings,
            summary=summary,
            spec_snapshot=copy.deepcopy(spec_list),
            changes_from_previous=changes,
            spec_impact_map=spec_impact,
        )
        self._reports.append(report)
        return report

    def _compute_changes(
        self,
        prev_findings: Dict[str, ComplianceFinding],
        new_spec_ids: Optional[List[str]],
    ) -> List[str]:
        changes: List[str] = []

        if self._phase == ReportPhase.SECOND_IMPORT and new_spec_ids:
            changes.append(
                f"补录平台规范: {', '.join(new_spec_ids)}"
            )

            for spec_id in new_spec_ids:
                affected = [
                    f for f in self._findings.values() if spec_id in f.affected_by_spec_ids
                ]
                if affected:
                    changes.append(
                        f"规范 {spec_id} 影响了 {len(affected)} 条合规明细: "
                        + ", ".join(f.finding_id for f in affected)
                    )
                else:
                    changes.append(f"规范 {spec_id} 补录后无新增合规问题")

        prev_types = {f.finding_type for f in prev_findings.values()}
        curr_types = {f.finding_type for f in self._findings.values()}

        new_types = curr_types - prev_types
        removed_types = prev_types - curr_types

        for t in new_types:
            count = sum(1 for f in self._findings.values() if f.finding_type == t)
            changes.append(f"新增合规问题类型: {t.value} ({count} 条)")

        for t in removed_types:
            changes.append(f"消除合规问题类型: {t.value}")

        prev_seg_set = {f.segment_id for f in prev_findings.values()}
        curr_seg_set = {f.segment_id for f in self._findings.values()}

        new_segs = curr_seg_set - prev_seg_set
        resolved_segs = prev_seg_set - curr_seg_set

        if new_segs:
            changes.append(f"新增受影响段: {', '.join(sorted(new_segs))}")
        if resolved_segs:
            changes.append(f"已解决段: {', '.join(sorted(resolved_segs))}")

        return changes

    def _record_annotation_change(
        self,
        segment_id: str,
        old_findings: Dict[str, ComplianceFinding],
        old_version: int,
        new_version: int,
    ) -> List[CorrectionRecord]:
        records: List[CorrectionRecord] = []
        now = datetime.now().isoformat()

        for fid, finding in old_findings.items():
            record = CorrectionRecord(
                record_id=_gen_id(),
                finding_id=fid,
                segment_id=segment_id,
                action=CorrectionAction.SUPERSEDED,
                timestamp=now,
                details=(
                    f"段标注从版本 {old_version} 更新到 {new_version}，"
                    f"原发现 [{finding.finding_type.value}] 被标记为已取代"
                ),
                annotation_version_before=old_version,
                annotation_version_after=new_version,
            )
            if segment_id not in self._correction_history:
                self._correction_history[segment_id] = []
            self._correction_history[segment_id].append(record)
            records.append(record)

        return records

    def _build_current_report(self) -> ComplianceReport:
        all_findings = list(self._findings.values())
        summary = self._engine.build_summary(all_findings)
        spec_impact = self._engine.build_spec_impact_map(all_findings)
        spec_list = list(self._specs.values())

        return ComplianceReport(
            report_id=_gen_id(),
            phase=self._phase,
            findings=all_findings,
            summary=summary,
            spec_snapshot=copy.deepcopy(spec_list),
            changes_from_previous=[],
            spec_impact_map=spec_impact,
        )
