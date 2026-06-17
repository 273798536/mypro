import os
import sys
import tempfile
import shutil
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from fewshot_sampler.sampler import FewShotSampler
from fewshot_sampler.schemas import SamplingConfig, FeedbackStatus, AnomalyType
from fewshot_sampler.storage import RecordStorage
from fewshot_sampler.feedback import FeedbackManager
from fewshot_sampler.audit import AuditTrail
from fewshot_sampler.exporter import ResultExporter


def test_sampling_detects_all_anomaly_types():
    """抽样算法能检测到所有设计的异常类型"""
    config = SamplingConfig(total_samples=30, seed=42)
    sampler = FewShotSampler(config)
    csv_path = Path(__file__).resolve().parent.parent / "sample_data" / "sales_dirty.csv"
    assert csv_path.exists(), f"样例数据不存在: {csv_path}"

    df = sampler.load_dataframe(str(csv_path))
    assert len(df) == 200, f"应读取200条数据，实际 {len(df)}"

    records_anomalies = sampler.detect_anomalies(df)
    all_types = set()
    for alist in records_anomalies:
        for a in alist:
            all_types.add(a.anomaly_type)

    expected = {
        AnomalyType.MISSING_UNIT,
        AnomalyType.SUPPLEMENT_REMARK,
        AnomalyType.OLD_SCHEMA,
        AnomalyType.VALUE_OUTLIER,
        AnomalyType.FORMAT_INCONSISTENCY,
        AnomalyType.DUPLICATE_RECORD,
        AnomalyType.TEXT_TRUNCATED,
        AnomalyType.VERSION_ROLLBACK,
    }
    missing = expected - all_types
    assert not missing, f"缺少异常类型检测: {[m.label for m in missing]}"
    print(f"  ✓ 检测到异常类型: {sorted([a.label for a in all_types])}")


def test_version_rollback_warning():
    """版本回滚异常被标记为高严重度，且描述里有'别当正常样例'"""
    config = SamplingConfig(total_samples=100, seed=42)
    sampler = FewShotSampler(config)
    csv_path = Path(__file__).resolve().parent.parent / "sample_data" / "sales_dirty.csv"
    df = sampler.load_dataframe(str(csv_path))
    anomalies = sampler.detect_anomalies(df)

    found_rollback = False
    for alist in anomalies:
        for a in alist:
            if a.anomaly_type == AnomalyType.VERSION_ROLLBACK:
                found_rollback = True
                assert a.severity >= 0.8, f"版本回滚严重度应>=0.8，实际{a.severity}"
                assert "版本回滚" in a.description or "别当作" in a.description or "正常样例" in a.description, \
                    f"描述里应有警示: {a.description}"
    assert found_rollback, "应检测到至少一条版本回滚异常"
    print("  ✓ 版本回滚异常正确高严重度 + 警示描述")


def test_storage_shared_playback_and_intercept():
    """评测回放和安全拦截共用同一批处理记录（核心要求）"""
    tmpdir = tempfile.mkdtemp(prefix="fewshot_test_")
    try:
        storage = RecordStorage(tmpdir)
        config = SamplingConfig(total_samples=20, seed=42)
        sampler = FewShotSampler(config)
        csv_path = Path(__file__).resolve().parent.parent / "sample_data" / "sales_dirty.csv"
        df = sampler.load_dataframe(str(csv_path))
        batch = sampler.sample(df, source_file=str(csv_path))
        storage.save_batch(batch)

        rid = batch.records[0].record_id
        bid = batch.batch_id

        storage.log_playback(bid, rid, action="打开记录", user="tester", note="初次查看")
        storage.log_playback(bid, rid, action="标记阅读", user="tester", note="异常存在")
        storage.log_intercept(
            bid, rid, anomaly_type="缺少单位", decision="拦截", user="审核员", reason="确实漏填"
        )

        timeline = storage.get_shared_timeline(bid, rid)
        assert len(timeline) == 3, f"时间线应有3条记录，实际{len(timeline)}"

        sources = {t["_source"] for t in timeline}
        assert "评测回放" in sources and "安全拦截" in sources, "时间线应包含回放+拦截来源"

        timestamps = [t["timestamp"] for t in timeline]
        assert timestamps == sorted(timestamps), "时间线必须按时间排序"
        print(f"  ✓ 共享时间线: {len(timeline)} 条记录, 含 {sources}")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def test_feedback_trail_traceable():
    """人工反馈能通过 trace 回溯到（顺着异常往回查）"""
    tmpdir = tempfile.mkdtemp(prefix="fewshot_test_")
    try:
        storage = RecordStorage(tmpdir)
        fm = FeedbackManager(tmpdir)
        audit = AuditTrail(tmpdir)

        config = SamplingConfig(total_samples=20, seed=42)
        sampler = FewShotSampler(config)
        csv_path = Path(__file__).resolve().parent.parent / "sample_data" / "sales_dirty.csv"
        df = sampler.load_dataframe(str(csv_path))
        batch = sampler.sample(df, source_file=str(csv_path))
        storage.save_batch(batch)

        anom_record = None
        anom_idx = 0
        for r in batch.records:
            if r.has_anomaly:
                anom_record = r
                break

        assert anom_record is not None, "抽样结果应包含异常记录"

        fb = fm.add_feedback(
            batch_id=batch.batch_id,
            record_id=anom_record.record_id,
            status=FeedbackStatus.CONFIRMED_ANOMALY,
            comment="经过核对，确实缺少金额单位万元",
            resolution="已联系运营在源表补录单位",
            handler="测试用户",
            anomaly_index=anom_idx,
            tags=["数据质量", "高优先级"],
        )
        assert fb.feedback_id.startswith(f"FB-{batch.batch_id}"), f"反馈ID格式不对: {fb.feedback_id}"

        storage.log_intercept(
            batch_id=batch.batch_id,
            record_id=anom_record.record_id,
            anomaly_type=anom_record.anomalies[anom_idx].anomaly_type.label,
            decision="拦截（确认异常）",
            user="测试用户",
            reason="经过核对，确实缺少单位",
        )

        node = audit.trace_anomaly(batch.batch_id, anom_record.record_id, anom_idx)
        rendered = node.render()

        assert "人工反馈" in rendered, "追溯树应包含人工反馈节点"
        assert "确实缺少金额单位万元" in rendered, "追溯树应包含具体处理意见"
        assert "已联系运营在源表补录单位" in rendered, "追溯树应包含处理结论"
        assert "共享处理时间线" in rendered, "追溯树应包含时间线"
        assert "安全拦截" in rendered, "追溯树应能看到拦截记录"
        print("  ✓ 异常追溯链完整（人工反馈+处理意见+时间线）")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def test_excel_export_human_friendly():
    """导出Excel给不懂代码的人看：截断原因是人话，多sheet齐全"""
    tmpdir = tempfile.mkdtemp(prefix="fewshot_test_")
    try:
        storage = RecordStorage(tmpdir)
        fm = FeedbackManager(tmpdir)

        config = SamplingConfig(total_samples=20, seed=42)
        sampler = FewShotSampler(config)
        csv_path = Path(__file__).resolve().parent.parent / "sample_data" / "sales_dirty.csv"
        df = sampler.load_dataframe(str(csv_path))
        batch = sampler.sample(df, source_file=str(csv_path))
        storage.save_batch(batch)

        for i, r in enumerate(batch.records[:3]):
            if r.has_anomaly:
                fm.add_feedback(
                    batch_id=batch.batch_id,
                    record_id=r.record_id,
                    status=FeedbackStatus.RESOLVED,
                    comment=f"测试反馈#{i}",
                    resolution=f"测试结论#{i}",
                    handler="tester",
                )

        out_path = Path(tmpdir) / "report.xlsx"
        exporter = ResultExporter(tmpdir)
        result = exporter.export_batch_excel(batch.batch_id, str(out_path))

        assert Path(result).exists(), "导出文件应存在"
        assert Path(result).stat().st_size > 10_000, "导出文件不应为空（太小了）"

        xl = pd.ExcelFile(result)
        sheets = set(xl.sheet_names)
        expected_sheets = {"0-总览", "1-抽样明细", "2-异常清单", "3-人工反馈"}
        missing_sheets = expected_sheets - sheets
        assert not missing_sheets, f"缺少sheet: {missing_sheets}"

        df_trunc = None
        if "4-截断说明" in sheets:
            df_trunc = pd.read_excel(result, sheet_name="4-截断说明")
            if len(df_trunc) > 0:
                col1 = str(df_trunc.iloc[:, -1].tolist())
                forbidden = ["legacy_id", "old_code", "_desc", "raw_", "fmt_"]
                for bad in forbidden:
                    assert bad not in col1, f"截断说明里出现了字段缩写: {bad}"
                human_words = ["字段", "正常", "过长", "业务"]
                assert any(w in col1 for w in human_words), "截断说明不够人话"
                print("  ✓ 截断说明是自然语言，不含字段缩写")

        df_anom = pd.read_excel(result, sheet_name="2-异常清单")
        assert "处理建议" in df_anom.columns, "异常清单应有处理建议列"
        if len(df_anom) > 0:
            advice_col = df_anom["处理建议"].astype(str).tolist()
            assert any("补填" in s or "核查" in s or "复核" in s for s in advice_col), \
                "处理建议应有具体中文动作"
        print(f"  ✓ Excel导出: {len(sheets)} 个sheet, {len(df_anom)} 条异常")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def test_truncate_reason_contains_human_language():
    """长文本截断原因返回人话，不是字段名"""
    sampler = FewShotSampler(SamplingConfig(total_samples=5))
    r1 = sampler._analyze_truncate_reason("客户备注", "x" * 3000)
    assert "备注" in r1 or "字段" in r1, f"原因不够人话: {r1}"
    assert "_" not in r1, f"不能有下划线缩写: {r1}"

    r2 = sampler._analyze_truncate_reason("商品描述", "a\n" * 30)
    assert "换行" in r2 or "多条" in r2, f"换行异常没说明: {r2}"
    print(f"  ✓ 截断原因自然语言: 描述='{r1[:40]}...', 换行='{r2[:40]}...'")


if __name__ == "__main__":
    print("\n=== 开始运行少样本评测抽样器测试 ===\n")

    tests = [
        ("异常检测覆盖度", test_sampling_detects_all_anomaly_types),
        ("版本回滚高严重度+警示", test_version_rollback_warning),
        ("评测回放+安全拦截共用时间线", test_storage_shared_playback_and_intercept),
        ("异常追溯链含人工反馈", test_feedback_trail_traceable),
        ("Excel导出友好性", test_excel_export_human_friendly),
        ("截断原因自然语言", test_truncate_reason_contains_human_language),
    ]

    passed = 0
    failed = 0
    for name, func in tests:
        print(f"[{name}]")
        try:
            func()
            passed += 1
            print(f"    ✅ 通过\n")
        except AssertionError as e:
            failed += 1
            print(f"    ❌ 断言失败: {e}\n")
        except Exception as e:
            failed += 1
            import traceback
            traceback.print_exc()
            print(f"    ❌ 异常: {e}\n")

    print(f"=== 结果: {passed} 通过 / {failed} 失败 ===")
    sys.exit(0 if failed == 0 else 1)
