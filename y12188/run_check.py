from rollback_station.models import (
    VersionSnapshot, TrackState, RollbackRecord,
)
from rollback_station.checker import VersionChecker
from rollback_station.merge import MergeConflictDetector
from rollback_station.snapshot import SnapshotStore
from rollback_station.report import ReportGenerator
from rollback_station.export import ExportManager


def build_sample_data():
    v1_tracks = {
        "主唱": TrackState(
            track_name="主唱",
            file_path="/audio/vocal_main.wav",
            file_hash="aaa111",
            parameters={"volume": -3, "pan": 0, "reverb": "hall"},
            last_modified_by="张编曲",
            last_modified_at="2026-05-10",
        ),
        "和声": TrackState(
            track_name="和声",
            file_path="/audio/vocal_harm.wav",
            file_hash="bbb222",
            parameters={"volume": -8, "pan": 0, "reverb": "plate"},
            last_modified_by="张编曲",
            last_modified_at="2026-05-10",
        ),
        "鼓组": TrackState(
            track_name="鼓组",
            file_path="/audio/drums.wav",
            file_hash="ccc333",
            parameters={"volume": -5, "pan": 0, "comp": "glue"},
            last_modified_by="李工程",
            last_modified_at="2026-05-10",
        ),
        "贝斯": TrackState(
            track_name="贝斯",
            file_path="/audio/bass.wav",
            file_hash="ddd444",
            parameters={"volume": -6, "pan": 0, "eq": "low_boost"},
            last_modified_by="李工程",
            last_modified_at="2026-05-10",
        ),
        "吉他": TrackState(
            track_name="吉他",
            file_path="/audio/guitar.wav",
            file_hash="eee555",
            parameters={"volume": -7, "pan": -20, "chorus": "subtle"},
            last_modified_by="张编曲",
            last_modified_at="2026-05-10",
        ),
    }

    v2_tracks = {
        "主唱": TrackState(
            track_name="主唱",
            file_path="/audio/vocal_main.wav",
            file_hash="aaa111",
            parameters={"volume": -3, "pan": 0, "reverb": "hall"},
            last_modified_by="张编曲",
            last_modified_at="2026-05-12",
        ),
        "和声": TrackState(
            track_name="和声",
            file_path="/audio/vocal_harm.wav",
            file_hash="bbb999",
            parameters={"volume": -8, "pan": 0, "reverb": "plate"},
            last_modified_by="王混音",
            last_modified_at="2026-05-12",
        ),
        "鼓组": TrackState(
            track_name="鼓组",
            file_path="/audio/drums.wav",
            file_hash="ccc333",
            parameters={"volume": -2, "pan": 0, "comp": "glue"},
            last_modified_by="李工程",
            last_modified_at="2026-05-12",
        ),
        "贝斯": TrackState(
            track_name="贝斯",
            file_path="/audio/bass.wav",
            file_hash="ddd444",
            parameters={"volume": -4, "pan": 0, "eq": "low_boost"},
            last_modified_by="李工程",
            last_modified_at="2026-05-12",
        ),
    }

    v3_tracks = {
        "主唱": TrackState(
            track_name="主唱",
            file_path="/audio/vocal_main.wav",
            file_hash="fff888",
            parameters={"volume": -3, "pan": 0, "reverb": "hall"},
            last_modified_by="张编曲",
            last_modified_at="2026-05-15",
        ),
        "和声": TrackState(
            track_name="和声",
            file_path="/audio/vocal_harm.wav",
            file_hash="bbb222",
            parameters={"volume": -6, "pan": 0, "reverb": "room"},
            last_modified_by="张编曲",
            last_modified_at="2026-05-15",
        ),
        "鼓组": TrackState(
            track_name="鼓组",
            file_path="/audio/drums.wav",
            file_hash="ccc333",
            parameters={"volume": -5, "pan": 0, "comp": "glue"},
            last_modified_by="李工程",
            last_modified_at="2026-05-15",
        ),
        "贝斯": TrackState(
            track_name="贝斯",
            file_path="/audio/bass.wav",
            file_hash="ddd444",
            parameters={"volume": -6, "pan": 0, "eq": "low_boost"},
            last_modified_by="李工程",
            last_modified_at="2026-05-15",
        ),
        "合成器": TrackState(
            track_name="合成器",
            file_path="/audio/synth.wav",
            file_hash="ggg777",
            parameters={"volume": -10, "pan": 30, "filter": "lowpass"},
            last_modified_by="张编曲",
            last_modified_at="2026-05-15",
        ),
    }

    snapshots = [
        VersionSnapshot("夏日曲", "v1.0", "2026-05-10", "李工程", v1_tracks),
        VersionSnapshot("夏日曲", "v1.1", "2026-05-12", "李工程", v2_tracks),
        VersionSnapshot("夏日曲", "v1.2", "2026-05-15", "李工程", v3_tracks),
    ]

    rollback_records = [
        RollbackRecord(
            from_version="v1.1",
            to_version="v1.0",
            reason="和声音频被误覆盖，需要回退",
            operator="张编曲",
            timestamp="2026-05-13",
            affected_tracks=["和声"],
        ),
    ]

    return snapshots, rollback_records


def main():
    snapshots, rollback_records = build_sample_data()

    store = SnapshotStore()
    for s in snapshots:
        store.add_snapshot(s)
    for r in rollback_records:
        store.add_rollback_record(r)

    checker = VersionChecker(store.get_snapshots(), store.get_rollback_records())
    issues = checker.check_all()

    classified = checker.classify_issues(issues)

    merge_detector = MergeConflictDetector(store.get_snapshots())
    conflicts = merge_detector.detect_all()
    conflict_issues = merge_detector.conflicts_to_issues(conflicts)
    all_issues = issues + conflict_issues

    reporter = ReportGenerator("夏日曲")
    md_report = reporter.generate(all_issues, conflicts)
    json_report = reporter.generate_json(all_issues, conflicts)

    export_mgr = ExportManager()
    export_mgr.add_from_issues(all_issues)
    export_mgr.mark_resolved("鼓组", "v1.0->v1.1")

    review = export_mgr.monthly_review_report(2026, 5)
    export_json = export_mgr.export_json()

    print("=" * 60)
    print("编曲版本回滚台 — 检查结果")
    print("=" * 60)
    print()
    print(md_report)
    print()
    print("=" * 60)
    print("月度复盘")
    print("=" * 60)
    print()
    print(review)
    print()
    print("=" * 60)
    print("导出清单 (JSON)")
    print("=" * 60)
    print()
    print(export_json)
    print()
    print("=" * 60)
    print("完整报告 (JSON)")
    print("=" * 60)
    print()
    print(json_report)

    with open("report_output.md", "w", encoding="utf-8") as f:
        f.write(md_report)
    with open("report_output.json", "w", encoding="utf-8") as f:
        f.write(json_report)
    with open("monthly_review.md", "w", encoding="utf-8") as f:
        f.write(review)

    print()
    print("报告已保存: report_output.md, report_output.json, monthly_review.md")


if __name__ == "__main__":
    main()
