import pytest
from models import (
    AudioTrack,
    ComplianceFinding,
    ComplianceReport,
    DialogueSegment,
    FindingType,
    PlatformSpec,
    ReportPhase,
    Severity,
    SegmentType,
)
from engine import LoudnessComplianceEngine
from session import ComplianceSession


def _make_track_with_segments(track_id: str, segments: list) -> AudioTrack:
    track = AudioTrack(track_id=track_id, name=f"轨道-{track_id}", sample_rate=48000)
    for seg in segments:
        track.add_segment(seg)
    return track


def _make_dialogue_seg(
    seg_id: str,
    track_id: str,
    start: float,
    end: float,
    loudness: float,
    seg_type: SegmentType = SegmentType.DIALOGUE,
    has_ad_marker: bool = False,
    is_silent: bool = False,
) -> DialogueSegment:
    return DialogueSegment(
        segment_id=seg_id,
        track_id=track_id,
        start_time=start,
        end_time=end,
        loudness_lufs=loudness,
        segment_type=seg_type,
        has_ad_marker=has_ad_marker,
        is_silent=is_silent,
    )


def _make_default_spec(spec_id: str = "spec_douyin") -> PlatformSpec:
    return PlatformSpec(
        spec_id=spec_id,
        platform_name="抖音",
        max_dialogue_loudness_lufs=-24.0,
        max_ad_loudness_lufs=-24.0,
        require_ad_markers=True,
        silent_threshold_lufs=-70.0,
        min_silent_duration_s=0.5,
    )


class TestLoudnessExceedance:

    def test_dialogue_loudness_within_limit(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -25.0)
        spec = _make_default_spec()
        result = engine.check_loudness(seg, spec)
        assert result is None

    def test_dialogue_loudness_exceeds_limit(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -20.0)
        spec = _make_default_spec()
        result = engine.check_loudness(seg, spec)
        assert result is not None
        assert result.finding_type == FindingType.LOUDNESS_EXCEEDANCE
        assert result.severity == Severity.CRITICAL
        assert result.measured_value == -20.0
        assert result.allowed_value == -24.0
        assert "seg01" in result.description
        assert "-20.0" in result.description
        assert "-24.0" in result.description

    def test_ad_loudness_exceeds_limit(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg(
            "seg_ad", "t01", 5.0, 10.0, -18.0, SegmentType.AD, True
        )
        spec = _make_default_spec()
        result = engine.check_loudness(seg, spec)
        assert result is not None
        assert result.finding_type == FindingType.LOUDNESS_EXCEEDANCE
        assert result.measured_value == -18.0

    def test_exactly_at_limit(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -24.0)
        spec = _make_default_spec()
        result = engine.check_loudness(seg, spec)
        assert result is None

    def test_slightly_over_limit(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -23.9)
        spec = _make_default_spec()
        result = engine.check_loudness(seg, spec)
        assert result is not None
        assert result.measured_value == -23.9


class TestAdMarkerOmission:

    def test_ad_with_marker(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg(
            "seg_ad", "t01", 5.0, 10.0, -25.0, SegmentType.AD, True
        )
        spec = _make_default_spec()
        result = engine.check_ad_marker(seg, spec)
        assert result is None

    def test_ad_without_marker(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg(
            "seg_ad", "t01", 5.0, 10.0, -25.0, SegmentType.AD, False
        )
        spec = _make_default_spec()
        result = engine.check_ad_marker(seg, spec)
        assert result is not None
        assert result.finding_type == FindingType.AD_MARKER_OMISSION
        assert result.severity == Severity.CRITICAL
        assert "广告标记" in result.description

    def test_dialogue_no_marker_needed(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg(
            "seg_d", "t01", 0.0, 5.0, -25.0, SegmentType.DIALOGUE, False
        )
        spec = _make_default_spec()
        result = engine.check_ad_marker(seg, spec)
        assert result is None

    def test_spec_no_ad_marker_requirement(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg(
            "seg_ad", "t01", 5.0, 10.0, -25.0, SegmentType.AD, False
        )
        spec = PlatformSpec(
            spec_id="spec_relaxed",
            platform_name="宽松平台",
            require_ad_markers=False,
        )
        result = engine.check_ad_marker(seg, spec)
        assert result is None


class TestSilentMisjudgment:

    def test_silent_segment_actually_loud(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg(
            "seg_s", "t01", 0.0, 3.0, -40.0, SegmentType.DIALOGUE, False, True
        )
        spec = _make_default_spec()
        result = engine.check_silent_segment(seg, spec)
        assert result is not None
        assert result.finding_type == FindingType.SILENT_MISJUDGMENT
        assert result.severity == Severity.WARNING
        assert "静音段误判" in result.description

    def test_loud_segment_actually_silent(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg(
            "seg_s", "t01", 0.0, 3.0, -75.0, SegmentType.DIALOGUE, False, False
        )
        spec = _make_default_spec()
        result = engine.check_silent_segment(seg, spec)
        assert result is not None
        assert result.finding_type == FindingType.SILENT_MISJUDGMENT
        assert result.severity == Severity.INFO
        assert "建议核实" in result.description

    def test_silent_segment_truly_silent(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg(
            "seg_s", "t01", 0.0, 3.0, -80.0, SegmentType.DIALOGUE, False, True
        )
        spec = _make_default_spec()
        result = engine.check_silent_segment(seg, spec)
        assert result is None

    def test_silent_too_short_no_check(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg(
            "seg_s", "t01", 0.0, 0.3, -40.0, SegmentType.DIALOGUE, False, True
        )
        spec = _make_default_spec()
        result = engine.check_silent_segment(seg, spec)
        assert result is None


class TestTwoPhaseImport:

    def test_first_import_no_spec(self):
        session = ComplianceSession()
        seg = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -20.0)
        track = _make_track_with_segments("t01", [seg])

        report = session.import_audio_tracks([track])

        assert report.phase == ReportPhase.FIRST_IMPORT
        assert report.summary.total_findings == 0
        assert len(session.specs) == 0

    def test_second_import_adds_spec(self):
        session = ComplianceSession()

        seg1 = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -20.0)
        seg2 = _make_dialogue_seg(
            "seg_ad", "t01", 5.0, 10.0, -25.0, SegmentType.AD, False
        )
        seg3 = _make_dialogue_seg(
            "seg_s", "t01", 10.0, 15.0, -40.0, SegmentType.DIALOGUE, False, True
        )
        track = _make_track_with_segments("t01", [seg1, seg2, seg3])

        report1 = session.import_audio_tracks([track])
        assert report1.phase == ReportPhase.FIRST_IMPORT
        assert report1.summary.total_findings == 0

        spec = _make_default_spec()
        report2 = session.import_platform_spec([spec])

        assert report2.phase == ReportPhase.SECOND_IMPORT
        assert report2.summary.total_findings > 0
        assert report2.summary.loudness_exceedance_count >= 1
        assert report2.summary.ad_marker_omission_count >= 1
        assert report2.summary.silent_misjudgment_count >= 1

        assert any("补录平台规范" in c for c in report2.changes_from_previous)
        assert any("影响" in c for c in report2.changes_from_previous)

    def test_second_import_spec_impact_detail(self):
        session = ComplianceSession()

        seg1 = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -20.0)
        track = _make_track_with_segments("t01", [seg1])

        session.import_audio_tracks([track])
        spec = _make_default_spec()
        report = session.import_platform_spec([spec])

        assert "spec_douyin" in report.spec_impact_map
        impacted = report.spec_impact_map["spec_douyin"]
        assert len(impacted) >= 1

        findings_for_spec = session.get_spec_impact("spec_douyin")
        assert len(findings_for_spec) >= 1
        for f in findings_for_spec:
            assert "spec_douyin" in f.affected_by_spec_ids


class TestReactiveAnnotationUpdate:

    def test_update_loudness_fixes_finding(self):
        session = ComplianceSession()

        seg = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -20.0)
        track = _make_track_with_segments("t01", [seg])
        session.import_audio_tracks([track])

        spec = _make_default_spec()
        session.import_platform_spec([spec])

        findings_before = session.get_segment_findings("seg01")
        assert len(findings_before) >= 1
        assert any(
            f.finding_type == FindingType.LOUDNESS_EXCEEDANCE for f in findings_before
        )

        report, records = session.update_segment_annotation(
            "seg01", loudness_lufs=-25.0
        )

        findings_after = session.get_segment_findings("seg01")
        assert not any(
            f.finding_type == FindingType.LOUDNESS_EXCEEDANCE for f in findings_after
        )
        assert len(records) >= 1
        assert records[0].annotation_version_before == 1
        assert records[0].annotation_version_after == 2

    def test_update_ad_marker_fixes_omission(self):
        session = ComplianceSession()

        seg = _make_dialogue_seg(
            "seg_ad", "t01", 5.0, 10.0, -25.0, SegmentType.AD, False
        )
        track = _make_track_with_segments("t01", [seg])
        session.import_audio_tracks([track])

        spec = _make_default_spec()
        session.import_platform_spec([spec])

        findings_before = session.get_segment_findings("seg_ad")
        assert any(
            f.finding_type == FindingType.AD_MARKER_OMISSION for f in findings_before
        )

        report, records = session.update_segment_annotation(
            "seg_ad", has_ad_marker=True
        )

        findings_after = session.get_segment_findings("seg_ad")
        assert not any(
            f.finding_type == FindingType.AD_MARKER_OMISSION for f in findings_after
        )

    def test_correction_history_tracks_changes(self):
        session = ComplianceSession()

        seg = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -20.0)
        track = _make_track_with_segments("t01", [seg])
        session.import_audio_tracks([track])

        spec = _make_default_spec()
        session.import_platform_spec([spec])

        session.update_segment_annotation("seg01", loudness_lufs=-22.0)
        session.update_segment_annotation("seg01", loudness_lufs=-25.0)

        history = session.get_correction_history("seg01")
        assert len(history) == 2
        assert history[0].annotation_version_before == 1
        assert history[0].annotation_version_after == 2
        assert history[1].annotation_version_before == 2
        assert history[1].annotation_version_after == 3

    def test_silent_misjudgment_corrected(self):
        session = ComplianceSession()

        seg = _make_dialogue_seg(
            "seg_s", "t01", 0.0, 3.0, -40.0, SegmentType.DIALOGUE, False, True
        )
        track = _make_track_with_segments("t01", [seg])
        session.import_audio_tracks([track])

        spec = _make_default_spec()
        session.import_platform_spec([spec])

        findings_before = session.get_segment_findings("seg_s")
        assert any(
            f.finding_type == FindingType.SILENT_MISJUDGMENT for f in findings_before
        )

        session.update_segment_annotation("seg_s", is_silent=False)

        findings_after = session.get_segment_findings("seg_s")
        has_still_silent_misjudgment = any(
            f.finding_type == FindingType.SILENT_MISJUDGMENT
            and f.severity == Severity.WARNING
            for f in findings_after
        )
        assert not has_still_silent_misjudgment


class TestRetroactiveSpecImpact:

    def test_later_spec_marks_affected_findings(self):
        session = ComplianceSession()

        seg_loud = _make_dialogue_seg("seg_loud", "t01", 0.0, 5.0, -20.0)
        seg_ad = _make_dialogue_seg(
            "seg_ad", "t01", 5.0, 10.0, -18.0, SegmentType.AD, False
        )
        seg_ok = _make_dialogue_seg("seg_ok", "t01", 10.0, 15.0, -26.0)
        track = _make_track_with_segments("t01", [seg_loud, seg_ad, seg_ok])

        session.import_audio_tracks([track])

        spec_douyin = PlatformSpec(
            spec_id="spec_douyin",
            platform_name="抖音",
            max_dialogue_loudness_lufs=-24.0,
            max_ad_loudness_lufs=-24.0,
            require_ad_markers=True,
            silent_threshold_lufs=-70.0,
            min_silent_duration_s=0.5,
        )
        report = session.import_platform_spec([spec_douyin])

        douyin_impact = session.get_spec_impact("spec_douyin")
        assert len(douyin_impact) >= 2

        affected_seg_ids = {f.segment_id for f in douyin_impact}
        assert "seg_loud" in affected_seg_ids
        assert "seg_ad" in affected_seg_ids
        assert "seg_ok" not in affected_seg_ids

    def test_adding_second_spec_shows_incremental_impact(self):
        session = ComplianceSession()

        seg_loud = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -22.0)
        track = _make_track_with_segments("t01", [seg_loud])
        session.import_audio_tracks([track])

        spec_loose = PlatformSpec(
            spec_id="spec_loose",
            platform_name="宽松平台",
            max_dialogue_loudness_lufs=-20.0,
            require_ad_markers=False,
        )
        report1 = session.import_platform_spec([spec_loose])
        assert report1.summary.overall_pass is True

        spec_strict = PlatformSpec(
            spec_id="spec_strict",
            platform_name="严格平台",
            max_dialogue_loudness_lufs=-24.0,
            require_ad_markers=True,
        )
        report2 = session.import_platform_spec([spec_strict])

        assert report2.summary.loudness_exceedance_count >= 1

        strict_impact = session.get_spec_impact("spec_strict")
        assert len(strict_impact) >= 1

        loose_impact = session.get_spec_impact("spec_loose")
        assert len(loose_impact) == 0

        assert any(
            "spec_strict" in c and "影响" in c
            for c in report2.changes_from_previous
        )


class TestDeterminism:

    def _build_full_session(self) -> ComplianceSession:
        session = ComplianceSession()

        seg1 = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -20.0)
        seg2 = _make_dialogue_seg(
            "seg_ad", "t01", 5.0, 10.0, -18.0, SegmentType.AD, False
        )
        seg3 = _make_dialogue_seg(
            "seg_s", "t01", 10.0, 15.0, -40.0, SegmentType.DIALOGUE, False, True
        )
        seg4 = _make_dialogue_seg("seg_ok", "t01", 15.0, 20.0, -26.0)
        track = _make_track_with_segments("t01", [seg1, seg2, seg3, seg4])

        session.import_audio_tracks([track])

        spec = _make_default_spec()
        session.import_platform_spec([spec])

        return session

    def test_same_input_same_finding_types_and_counts(self):
        results = []
        for _ in range(2):
            session = self._build_full_session()
            report = session.get_current_report()
            finding_types = sorted(
                [f.finding_type.value for f in report.findings]
            )
            finding_seg_ids = sorted(
                [f.segment_id for f in report.findings]
            )
            results.append((finding_types, finding_seg_ids, report.summary))

        assert results[0][0] == results[1][0], "Finding types differ between runs"
        assert results[0][1] == results[1][1], "Affected segments differ between runs"
        assert (
            results[0][2].total_findings == results[1][2].total_findings
        ), "Total findings count differs"
        assert (
            results[0][2].overall_pass == results[1][2].overall_pass
        ), "Overall pass/fail differs between runs"

    def test_reactive_update_deterministic(self):
        results = []
        for _ in range(2):
            session = self._build_full_session()
            report, records = session.update_segment_annotation(
                "seg01", loudness_lufs=-25.0
            )

            finding_types = sorted([f.finding_type.value for f in report.findings])
            history_count = len(session.get_correction_history("seg01"))
            results.append((finding_types, history_count, report.summary.overall_pass))

        assert results[0][0] == results[1][0]
        assert results[0][1] == results[1][1]
        assert results[0][2] == results[1][2]

    def test_two_phase_deterministic(self):
        results = []
        for _ in range(2):
            session = ComplianceSession()

            seg1 = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -20.0)
            seg2 = _make_dialogue_seg(
                "seg_ad", "t01", 5.0, 10.0, -18.0, SegmentType.AD, False
            )
            seg3 = _make_dialogue_seg(
                "seg_s", "t01", 10.0, 15.0, -40.0, SegmentType.DIALOGUE, False, True
            )
            track = _make_track_with_segments("t01", [seg1, seg2, seg3])

            r1 = session.import_audio_tracks([track])
            spec = _make_default_spec()
            r2 = session.import_platform_spec([spec])

            results.append((
                r1.summary.total_findings,
                r2.summary.total_findings,
                r2.summary.loudness_exceedance_count,
                r2.summary.ad_marker_omission_count,
                r2.summary.silent_misjudgment_count,
                r2.summary.overall_pass,
            ))

        for i in range(len(results[0])):
            assert results[0][i] == results[1][i], (
                f"Result dimension {i} differs: {results[0][i]} vs {results[1][i]}"
            )


class TestReportChangeTracking:

    def test_changes_listed_between_phases(self):
        session = ComplianceSession()

        seg1 = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -20.0)
        seg2 = _make_dialogue_seg(
            "seg_ad", "t01", 5.0, 10.0, -25.0, SegmentType.AD, False
        )
        track = _make_track_with_segments("t01", [seg1, seg2])

        session.import_audio_tracks([track])

        spec = _make_default_spec()
        report = session.import_platform_spec([spec])

        assert len(report.changes_from_previous) > 0
        assert any("补录平台规范" in c for c in report.changes_from_previous)
        assert any("spec_douyin" in c for c in report.changes_from_previous)

    def test_annotation_change_creates_correction_history(self):
        session = ComplianceSession()

        seg = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -20.0)
        track = _make_track_with_segments("t01", [seg])
        session.import_audio_tracks([track])

        spec = _make_default_spec()
        session.import_platform_spec([spec])

        _, records = session.update_segment_annotation(
            "seg01", loudness_lufs=-22.0
        )

        assert len(records) == 1
        assert records[0].action.value == "superseded"
        assert "版本" in records[0].details

    def test_spec_impact_map_in_report(self):
        session = ComplianceSession()

        seg = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -20.0)
        track = _make_track_with_segments("t01", [seg])
        session.import_audio_tracks([track])

        spec = _make_default_spec()
        report = session.import_platform_spec([spec])

        assert "spec_douyin" in report.spec_impact_map
        assert len(report.spec_impact_map["spec_douyin"]) >= 1


class TestEdgeCases:

    def test_multiple_specs_different_limits(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -22.0)

        spec_loose = PlatformSpec(
            spec_id="loose",
            platform_name="宽松",
            max_dialogue_loudness_lufs=-20.0,
            require_ad_markers=False,
        )
        spec_strict = PlatformSpec(
            spec_id="strict",
            platform_name="严格",
            max_dialogue_loudness_lufs=-24.0,
            require_ad_markers=True,
        )

        findings = engine.check_segment(seg, [spec_loose, spec_strict])
        loudness_findings = [
            f for f in findings if f.finding_type == FindingType.LOUDNESS_EXCEEDANCE
        ]
        assert len(loudness_findings) == 1
        assert "strict" in loudness_findings[0].affected_by_spec_ids

    def test_ad_segment_both_loudness_and_marker_issues(self):
        engine = LoudnessComplianceEngine()
        seg = _make_dialogue_seg(
            "seg_ad", "t01", 0.0, 5.0, -18.0, SegmentType.AD, False
        )
        spec = _make_default_spec()
        findings = engine.check_segment(seg, [spec])

        assert len(findings) == 2
        types = {f.finding_type for f in findings}
        assert FindingType.LOUDNESS_EXCEEDANCE in types
        assert FindingType.AD_MARKER_OMISSION in types

    def test_nonexistent_segment_update_raises(self):
        session = ComplianceSession()
        with pytest.raises(ValueError, match="不存在"):
            session.update_segment_annotation("nonexistent", loudness_lufs=-25.0)

    def test_empty_session_report(self):
        session = ComplianceSession()
        report = session.get_current_report()
        assert report.summary.total_findings == 0
        assert report.summary.overall_pass is True

    def test_all_findings_traceable_to_segment(self):
        session = ComplianceSession()

        seg1 = _make_dialogue_seg("seg01", "t01", 0.0, 5.0, -20.0)
        seg2 = _make_dialogue_seg(
            "seg_ad", "t01", 5.0, 10.0, -25.0, SegmentType.AD, False
        )
        seg3 = _make_dialogue_seg(
            "seg_s", "t01", 10.0, 15.0, -40.0, SegmentType.DIALOGUE, False, True
        )
        track = _make_track_with_segments("t01", [seg1, seg2, seg3])
        session.import_audio_tracks([track])

        spec = _make_default_spec()
        report = session.import_platform_spec([spec])

        for finding in report.findings:
            assert finding.segment_id in {"seg01", "seg_ad", "seg_s"}
            assert finding.track_id == "t01"
            assert len(finding.description) > 0
            assert finding.measured_value != finding.allowed_value
