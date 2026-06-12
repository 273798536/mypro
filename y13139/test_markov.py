import os
import sys
import tempfile
import shutil


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


import storage
from models import (
    BatchState, new_batch_id,
    RECORD_STATUS_RAW, RECORD_STATUS_CLEAN, RECORD_STATUS_SORT_UNSTABLE,
    RECORD_STATUS_PROCESSED, RECORD_STATUS_EVIDENCE_NEEDED,
)
from markov_engine import ingest_record, run_batch, DEFAULT_PARAM_A, DEFAULT_PARAM_B


def setup_tmp_data():
    tmp = tempfile.mkdtemp(prefix="markov_test_")
    storage.STATE_DIR = tmp
    storage.STATE_FILE = os.path.join(tmp, "state.jsonl")
    storage.META_FILE = os.path.join(tmp, "meta.json")
    return tmp


def teardown(tmp):
    shutil.rmtree(tmp, ignore_errors=True)


def test_persistence_restart():
    tmp = setup_tmp_data()
    try:
        batch = BatchState(batch_id=new_batch_id(), param_set_a=dict(DEFAULT_PARAM_A),
                           param_set_b=dict(DEFAULT_PARAM_B))
        batch.add_event("created", "test")
        ingest_record(batch, "测试来源", {
            "student_id": "S001",
            "timestamp": "2026-05-12 10:30",
            "sequence": "粗心,审题,计算,粗心,概念,粗心,计算",
        })
        run_batch(batch)
        storage.save_snapshot(batch)

        reloaded = storage.load_last()
        assert reloaded is not None, "重启后应该能加载到批次"
        assert reloaded.batch_id == batch.batch_id
        assert len(reloaded.records) == 1
        assert len(reloaded.timeline) >= 2, f"时间线至少两条事件，实际 {len(reloaded.timeline)}"
        rec = list(reloaded.records.values())[0]
        assert rec.raw_source == "测试来源"
        assert rec.raw_payload["student_id"] == "S001", "原始数据必须保留"
        assert rec.status == RECORD_STATUS_PROCESSED, f"合法记录应被处理，实际 {rec.status}"
        assert len(rec.calc_steps) > 0, "中间计算步骤必须保留"
        print("[PASS] test_persistence_restart")
    finally:
        teardown(tmp)


def test_sort_unstable_isolated():
    tmp = setup_tmp_data()
    try:
        batch = BatchState(batch_id=new_batch_id(), param_set_a=dict(DEFAULT_PARAM_A),
                           param_set_b=dict(DEFAULT_PARAM_B))
        ingest_record(batch, "缺学号", {
            "timestamp": "2026-05-12",
            "sequence": "粗心,审题,计算",
        })
        ingest_record(batch, "含占位符", {
            "student_id": "S002",
            "timestamp": "2026-05-12",
            "sequence": ["粗心", "?", "计算"],
        })
        ingest_record(batch, "好数据", {
            "student_id": "S003",
            "timestamp": "2026-05-12 11:00",
            "sequence": "粗心,审题,计算,粗心,概念,计算",
        })
        run_batch(batch)
        counts = batch.counts()
        assert counts["sort_unstable"] >= 2, f"排序不稳定应单独拎出 {counts}"
        unstable = [r for r in batch.records.values() if r.status == RECORD_STATUS_SORT_UNSTABLE]
        for r in unstable:
            assert r.sort_unstable_reason is not None
            assert r.result is None, "排序不稳定的记录不应被运算"
        processed = [r for r in batch.records.values() if r.status == RECORD_STATUS_PROCESSED]
        assert len(processed) == 1, f"只有好数据会被处理: {counts}"
        print("[PASS] test_sort_unstable_isolated")
    finally:
        teardown(tmp)


def test_raw_data_preserved_after_clean():
    tmp = setup_tmp_data()
    try:
        batch = BatchState(batch_id=new_batch_id(), param_set_a=dict(DEFAULT_PARAM_A),
                           param_set_b=dict(DEFAULT_PARAM_B))
        raw = {
            "student_id": "  S004  ",
            "timestamp": "2026/5/12",
            "sequence": "粗心，审题，计算，粗心，概念，审题，计算",
            "extra_note": "张老师手工录入时加的备注",
        }
        rec = ingest_record(batch, "原始来源", dict(raw))
        assert rec.raw_payload == raw, "raw_payload 必须完全等于录入时的内容，不能被清洗覆盖"
        assert rec.cleaned_payload != rec.raw_payload, "清洗结果和原始要分开"
        assert rec.cleaned_payload["extra_note"] == "张老师手工录入时加的备注"
        print("[PASS] test_raw_data_preserved_after_clean")
    finally:
        teardown(tmp)


def test_evidence_needed_and_calc_steps_visible():
    tmp = setup_tmp_data()
    try:
        batch = BatchState(batch_id=new_batch_id(),
                           param_set_a={**DEFAULT_PARAM_A, "min_observations": 8},
                           param_set_b={**DEFAULT_PARAM_B, "min_observations": 8})
        rec = ingest_record(batch, "短序列", {
            "student_id": "S005",
            "timestamp": "2026-05-12",
            "sequence": "粗心,审题,计算,粗心",
        })
        run_batch(batch)
        assert rec.status == RECORD_STATUS_EVIDENCE_NEEDED, f"短序列应标记需补证据 {rec.status}"
        steps_names = [s.name for s in rec.calc_steps]
        assert any("证据不足判定" in n for n in steps_names), "中间步骤必须包含证据不足判定"
        assert any("概率归一化" in n or "转移计数" in n for n in steps_names), "中间步骤要暴露计算过程"
        unit_changes = [(s.unit_before, s.unit_after) for s in rec.calc_steps
                        if s.unit_before and s.unit_after and s.unit_before != s.unit_after]
        assert len(unit_changes) > 0, f"必须有单位换算步骤: {unit_changes}"
        print("[PASS] test_evidence_needed_and_calc_steps_visible")
    finally:
        teardown(tmp)


def test_param_ab_comparison():
    tmp = setup_tmp_data()
    try:
        batch = BatchState(batch_id=new_batch_id(),
                           param_set_a=dict(DEFAULT_PARAM_A),
                           param_set_b=dict(DEFAULT_PARAM_B))
        rec = ingest_record(batch, "对照", {
            "student_id": "S006",
            "timestamp": "2026-05-12",
            "sequence": "粗心,审题,计算,粗心,概念,计算,粗心,审题,概念,粗心",
        })
        run_batch(batch)
        assert rec.result is not None
        assert "param_set_a" in rec.result and "param_set_b" in rec.result, "A/B 两组结果必须都在"
        a_steps = [s for s in rec.calc_steps if "A" in s.name]
        b_steps = [s for s in rec.calc_steps if "B" in s.name]
        assert a_steps and b_steps, "两组参数的步骤都要能区分开"
        print("[PASS] test_param_ab_comparison")
    finally:
        teardown(tmp)


if __name__ == "__main__":
    test_persistence_restart()
    test_sort_unstable_isolated()
    test_raw_data_preserved_after_clean()
    test_evidence_needed_and_calc_steps_visible()
    test_param_ab_comparison()
    print("\nAll tests passed.")
