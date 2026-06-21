import os
import sys
import tempfile
import shutil
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fed_tracker import FederationTracker, TaskRecord, TaskStatus, RecordIssue
from fed_tracker.storage import StateStorage
from fed_tracker.explainer import RevisionExplainer


def test_separate_counting():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = StateStorage(base_dir=tmpdir)
        tracker = FederationTracker(storage=storage)

        records = [
            TaskRecord(
                task_id="T-001", client_id="C1", task_type="train",
                payload={"task_content": "a", "client_signature": "s1", "timestamp": 1},
            ),
            TaskRecord(
                task_id="T-002", client_id="C2", task_type="train",
                payload={"task_content": "b", "client_signature": "s2", "timestamp": 2, "should_skip": True, "skip_reason": "test"},
            ),
            TaskRecord(
                task_id="T-003", client_id="C3", task_type="train",
                payload={"task_content": "c", "client_signature": "s3", "timestamp": 3},
                attachment_delay_seconds=200,
            ),
            TaskRecord(
                task_id="T-004", client_id="C4", task_type="train",
                payload={"task_content": "d", "client_signature": "s4", "timestamp": 4},
                is_version_alias=True,
            ),
            TaskRecord(
                task_id="T-005", client_id="C5", task_type="pred",
                payload={"task_content": "e", "client_signature": "s5", "timestamp": 5, "v1_confidence": 0.6},
                issues=[RecordIssue.OLD_MODEL_MISJUDGE],
                old_model_prediction=True,
            ),
        ]

        result = tracker.process(records, run_id="test-separate")

        assert result.total == 5
        assert result.processed == 1, f"预期 1 条已处理，实际 {result.processed}"
        assert result.skipped == 1, f"预期 1 条跳过，实际 {result.skipped}"
        assert result.bad_records == 2, f"预期 2 条坏行，实际 {result.bad_records}"
        assert result.revised == 1, f"预期 1 条改判，实际 {result.revised}"

        assert "T-001" in result.processed_ids
        assert "T-002" in result.skipped_ids
        assert "T-003" in result.bad_record_ids
        assert "T-004" in result.bad_record_ids
        assert "T-005" in result.revised_ids

        print("✓ 分开计数测试通过")


def test_late_attachment_detection():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = StateStorage(base_dir=tmpdir)
        tracker = FederationTracker(storage=storage)

        records = [
            TaskRecord(
                task_id="LATE-001", client_id="C1", task_type="train",
                payload={"task_content": "a", "client_signature": "s1", "timestamp": 1},
                attachment_delay_seconds=185,
            ),
        ]

        result = tracker.process(records, run_id="test-late")
        assert result.bad_records == 1

        bad_detail = result.bad_record_details[0]
        assert bad_detail["issue"] == "late_attachment"
        assert "185s" in bad_detail["description"]
        assert "120s" in bad_detail["description"]

        print("✓ 晚到附件检测测试通过")


def test_version_alias_not_normal():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = StateStorage(base_dir=tmpdir)
        tracker = FederationTracker(storage=storage)

        records = [
            TaskRecord(
                task_id="ALIAS-001", client_id="C1", task_type="train",
                payload={
                    "task_content": "old", "client_signature": "s1", "timestamp": 1,
                    "refers_to": "T-2025-1187", "file_age_days": 213, "index_type": "historical_alias",
                },
                is_version_alias=True,
            ),
        ]

        result = tracker.process(records, run_id="test-alias")
        assert result.bad_records == 1
        assert result.processed == 0

        bad_detail = result.bad_record_details[0]
        assert bad_detail["issue"] == "version_alias"
        assert bad_detail["task_id"] == "ALIAS-001"

        print("✓ 版本别名不显示为正常通过测试通过")


def test_revision_explanation():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = StateStorage(base_dir=tmpdir)
        tracker = FederationTracker(storage=storage)
        explainer = RevisionExplainer()

        record = TaskRecord(
            task_id="REVISE-001", client_id="C1", task_type="pred",
            payload={
                "task_content": "pred", "client_signature": "s1", "timestamp": 1,
                "v1_confidence": 0.62, "v2_confidence": 0.88,
                "v1_prediction": True,
                "v2_new_features": ["client_behavior_stability", "data_source_verification", "cross_partition_consistency"],
            },
            issues=[RecordIssue.OLD_MODEL_MISJUDGE],
            old_model_prediction=True,
            model_version="v2",
        )

        result = tracker.process([record], run_id="test-revise")
        assert result.revised == 1
        assert "REVISE-001" in result.revision_explanations

        explanation_text = result.revision_explanations["REVISE-001"]
        assert "v1 → v2" in explanation_text
        assert "原判定: 通过" in explanation_text
        assert "现判定: revised" in explanation_text
        assert "核心原因" in explanation_text
        assert "证据链" in explanation_text
        assert "v1 模型在低置信度样本上的误判" in explanation_text

        explanation = explainer.explain_revision(record)
        assert explanation["old_model_prediction"] is True
        assert explanation["confidence_score"] > 0.5
        assert "client_behavior_stability" in str(explanation["evidence"])

        print("✓ 改判解释测试通过")


def test_persistence_across_restart():
    tmpdir = tempfile.mkdtemp()
    try:
        storage = StateStorage(base_dir=tmpdir)
        tracker1 = FederationTracker(storage=storage)

        records = [
            TaskRecord(
                task_id="PERSIST-001", client_id="C1", task_type="train",
                payload={"task_content": "a", "client_signature": "s1", "timestamp": 1},
            ),
            TaskRecord(
                task_id="PERSIST-002", client_id="C2", task_type="train",
                payload={"task_content": "b", "client_signature": "s2", "timestamp": 2},
                attachment_delay_seconds=150,
            ),
        ]

        result1 = tracker1.process(records, run_id="test-persist")

        summary1 = tracker1.get_summary()
        assert summary1 is not None
        assert summary1.total == 2
        assert summary1.bad_records == 1

        notes1 = storage.load_notes()
        assert len(notes1) > 0
        assert "PERSIST-002" in notes1[0]

        tracker2 = FederationTracker(storage=storage)
        summary2 = tracker2.get_summary()

        assert summary2.run_id == summary1.run_id
        assert summary2.total == summary1.total
        assert summary2.processed == summary1.processed
        assert summary2.bad_records == summary1.bad_records
        assert summary2.page_summary == summary1.page_summary
        assert summary2.historical_notes == summary1.historical_notes

        consistency = tracker2.verify_state()
        assert all(consistency.values()), f"状态不一致: {consistency}"

        records2 = storage.load_records()
        assert len(records2) == 2
        assert records2[0].status == TaskStatus.PROCESSED
        assert records2[1].status == TaskStatus.BAD_RECORD

        print("✓ 重启后状态持久化测试通过")

    finally:
        shutil.rmtree(tmpdir)


def test_consistency_verification():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = StateStorage(base_dir=tmpdir)
        tracker = FederationTracker(storage=storage)

        records = [
            TaskRecord(
                task_id="V-001", client_id="C1", task_type="train",
                payload={"task_content": "a", "client_signature": "s1", "timestamp": 1},
            ),
            TaskRecord(
                task_id="V-002", client_id="C2", task_type="train",
                payload={"task_content": "b", "client_signature": "s2", "timestamp": 2, "should_skip": True, "skip_reason": "t"},
            ),
            TaskRecord(
                task_id="V-003", client_id="C3", task_type="train",
                payload={"task_content": "c", "client_signature": "s3", "timestamp": 3},
                attachment_delay_seconds=200,
            ),
            TaskRecord(
                task_id="V-004", client_id="C4", task_type="pred",
                payload={"task_content": "d", "client_signature": "s4", "timestamp": 4},
                issues=[RecordIssue.OLD_MODEL_MISJUDGE],
                old_model_prediction=True,
            ),
        ]

        tracker.process(records, run_id="test-verify")

        consistency = tracker.verify_state()
        assert consistency["summary_exists"] is True
        assert consistency["records_consistent"] is True
        assert consistency["notes_in_summary"] is True
        assert consistency["status_matches"] is True

        print("✓ 状态一致性校验测试通过")


def test_realistic_gray_sample():
    from fed_tracker.cli import _load_config
    config_path = Path(__file__).parent.parent / "config" / "gray" / "sample_gray_config.yaml"
    config = _load_config(str(config_path))

    assert len(config.records) == 9

    normal_count = sum(
        1 for r in config.records
        if not r.is_version_alias and r.attachment_delay_seconds == 0 and not r.issues and not r.payload.get("should_skip")
    )
    assert normal_count == 4, f"预期 4 条正常记录，实际 {normal_count}"

    late_count = sum(1 for r in config.records if r.attachment_delay_seconds > 120)
    assert late_count == 2, f"预期 2 条晚到附件，实际 {late_count}"

    alias_count = sum(1 for r in config.records if r.is_version_alias)
    assert alias_count == 1, f"预期 1 条版本别名，实际 {alias_count}"

    misjudge_count = sum(1 for r in config.records if RecordIssue.OLD_MODEL_MISJUDGE in r.issues)
    assert misjudge_count == 1, f"预期 1 条旧模型误判，实际 {misjudge_count}"

    skip_count = sum(1 for r in config.records if r.payload.get("should_skip"))
    assert skip_count == 1, f"预期 1 条跳过，实际 {skip_count}"

    print("✓ 灰度样本贴近现场测试通过")


if __name__ == "__main__":
    test_separate_counting()
    test_late_attachment_detection()
    test_version_alias_not_normal()
    test_revision_explanation()
    test_persistence_across_restart()
    test_consistency_verification()
    test_realistic_gray_sample()
    print("\n🎉 所有测试通过！")
