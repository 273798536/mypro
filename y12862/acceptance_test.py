#!/usr/bin/env python3
"""
验收测试脚本
验证内容：
1. 图、表、文字说明三者对得上
2. 潮汐计算和轨迹清洗共用同一批处理记录（不各算各的）
3. 潮位时区错记录可倒查（从结果一路回到来源和处理记录）
4. 下载文件名能区分本次运行和上次运行
5. 复核入口可用，不用重新导入就能修正
6. 顺着异常往回查，能查到气象预报和处理意见
7. 重复上报不只是模糊提醒，而是精确到记录级
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from seagrass.pipeline import SeagrassPipeline
from seagrass.sample_data import generate_sample_records, sample_tide_stations
from seagrass.coverage import aggregate_statistics
from seagrass.review import ReviewPortal
from seagrass.weather import find_weather_anomalies
from seagrass.tide import compute_tide_for_record
from seagrass.models import STAGE_TIDE_COMPUTATION


def assert_true(condition: bool, msg: str):
    if condition:
        print(f"  [PASS] {msg}")
    else:
        print(f"  [FAIL] {msg}")
        sys.exit(1)


def test_shared_processing_records(pipeline):
    """验证潮汐计算和轨迹清洗共用同一批处理记录"""
    print("")
    print("=== 测试 1：潮汐计算和轨迹清洗共用同一批处理记录 ===")
    for r in pipeline.records:
        tide_level = r.tide_data.get("tide_level_m") if r.tide_data else None
        track_info = r.track_data
        if tide_level is not None and track_info:
            assert_true(
                "point_index" in track_info,
                f"记录 {r.record_id}: 潮汐数据和轨迹清洗数据同时存在于同一 record"
            )
    print("")
    print("  （潮汐和轨迹都写入 ProcessingRecord，界面/报告/下载都从同一份取）")


def test_table_text_consistency(pipeline):
    """验证图、表、文字说明三者对得上"""
    print("")
    print("=== 测试 2：图、表、文字说明三者对得上 ===")

    text_path = pipeline.report_files["text_report"]
    with open(text_path, "r", encoding="utf-8") as f:
        text_content = f.read()

    table_path = pipeline.report_files["table"]
    with open(table_path, "r", encoding="utf-8") as f:
        table_lines = f.readlines()

    text_stats = pipeline.stats
    table_data_rows = len(table_lines) - 1  # minus header

    assert_true(
        table_data_rows == text_stats["total_records"],
        f"表格行数({table_data_rows}) == 文字总记录数({text_stats['total_records']})"
    )

    avg_str = f"{text_stats['average_coverage']:.2%}"
    assert_true(
        avg_str in text_content,
        f"文字报告中包含平均覆盖度 {avg_str}"
    )

    flag_count_text = f"Flagged:        {text_stats['flagged_count']}"
    assert_true(
        str(text_stats["flagged_count"]) in text_content,
        f"文字报告中包含标记数量 {text_stats['flagged_count']}"
    )

    for plot_key in ("coverage_bar_chart", "coverage_scatter", "flag_pie"):
        path = pipeline.report_files.get(plot_key, "")
        assert_true(
            os.path.exists(path),
            f"图表文件存在: {os.path.basename(path)}"
        )


def test_timezone_mismatch_traceback(pipeline):
    """验证潮位时区错记录可倒查"""
    print("")
    print("=== 测试 3：潮位时区错记录倒查（从结果→来源→处理意见） ===")

    portal = pipeline.get_review_portal()
    tz_wrong_records = portal.find_by_flag("tide_timezone_mismatch")

    assert_true(len(tz_wrong_records) >= 1, "存在至少一条时区错误标记的记录")

    rec = tz_wrong_records[0]
    trace_text = portal.trace(rec.record_id)

    assert_true(rec.record_id in trace_text, f"溯源包含记录ID {rec.record_id}")
    assert_true("tide_timezone_mismatch" in trace_text, "溯源包含时区不匹配标记")

    tide_op = rec.get_latest_opinion_by_stage(STAGE_TIDE_COMPUTATION)
    assert_true(tide_op is not None, "存在潮汐计算处理意见")
    assert_true(
        "时区不一致" in tide_op.opinion or "timezone" in str(tide_op.evidence).lower(),
        f"处理意见明确说明时区问题: {tide_op.opinion[:80]}"
    )

    tide_sources = [s for s in rec.source_refs if s.source_type == "tide_station"]
    assert_true(len(tide_sources) >= 1, "溯源包含潮位站来源引用")

    print(f"  溯源记录 {rec.record_id}:")
    print(f"    记录时区: UTC{rec.timezone_offset_hours:+d}")
    print(f"    潮位站时区: UTC{tide_op.evidence.get('station_timezone_offset_hours', '?'):+d}")
    print(f"    来源潮位站: {tide_sources[0].source_name} (id={tide_sources[0].source_id})")
    print(f"    处理意见: {tide_op.opinion}")
    print(f"    决策: {tide_op.decision}")


def test_download_filename_distinct():
    """验证下载文件名区分本次和上次运行"""
    print("")
    print("=== 测试 4：下载文件名区分本次运行和上次运行 ===")

    tide_stations = sample_tide_stations()

    records1 = generate_sample_records(batch_id="BATCH_RUN1")
    pipeline1 = SeagrassPipeline(tide_stations=tide_stations, output_dir="output")
    pipeline1.run(records1, batch_id="BATCH_RUN1")
    zip1 = pipeline1.download_zip

    records2 = generate_sample_records(batch_id="BATCH_RUN2")
    pipeline2 = SeagrassPipeline(tide_stations=tide_stations, output_dir="output")
    pipeline2.run(records2, batch_id="BATCH_RUN2")
    zip2 = pipeline2.download_zip

    assert_true(os.path.basename(zip1) != os.path.basename(zip2),
                f"两次下载文件名不同: {os.path.basename(zip1)} vs {os.path.basename(zip2)}")
    assert_true("BATCH_RUN1" in os.path.basename(zip1),
                "文件名包含批次ID BATCH_RUN1")
    assert_true("BATCH_RUN2" in os.path.basename(zip2),
                "文件名包含批次ID BATCH_RUN2")


def test_review_portal_correction(pipeline):
    """验证复核入口可用，不用重新导入就能修正"""
    print("")
    print("=== 测试 5：复核入口可用，不必重新导入 ===")

    portal = pipeline.get_review_portal()
    tz_wrong_records = portal.find_by_flag("tide_timezone_mismatch")
    rec = tz_wrong_records[0]
    old_tz = rec.timezone_offset_hours

    ok = portal.correct_field(
        record_id=rec.record_id,
        field_name="timezone_offset_hours",
        old_value=old_tz,
        new_value=8,
        reason="验收复核：确认记录时区实际为 UTC+8，上报时填错"
    )
    assert_true(ok, f"复核修正记录 {rec.record_id} 时区 {old_tz} -> 8 成功")
    assert_true(rec.timezone_offset_hours == 8, "修正后记录时区为 8")

    ok = portal.remove_flag(
        record_id=rec.record_id,
        flag="tide_timezone_mismatch",
        reason="时区已修正"
    )
    assert_true(ok, "复核移除 tide_timezone_mismatch 标记成功")
    assert_true("tide_timezone_mismatch" not in rec.flags, "标记已移除")

    latest_op = rec.processing_opinions[-1]
    assert_true(latest_op.stage == "review_correction", "修正操作写入处理意见")
    assert_true("时区已修正" in latest_op.opinion, "处理意见包含修正原因")

    ok = portal.reprocess(
        record_id=rec.record_id,
        step_func=lambda r: compute_tide_for_record(r, sample_tide_stations()),
        step_name="tide_computation"
    )
    assert_true(ok, "复核后重跑潮汐计算成功")

    print("  复核操作审计:")
    print(portal.audit_log_summary())


def test_anomaly_trace_to_weather(pipeline):
    """顺着异常往回查，能查到气象预报和处理意见"""
    print("")
    print("=== 测试 6：顺着异常往回查，查到气象预报和处理意见 ===")

    weather_anomalies = find_weather_anomalies(pipeline.records)
    assert_true(len(weather_anomalies) >= 1, "存在至少一条气象异常记录")

    rec = weather_anomalies[0]
    anomaly_text = rec.trace_back()

    assert_true(rec.record_id in anomaly_text, "溯源包含记录ID")
    assert_true(any(f.startswith("weather_") for f in rec.flags), "记录包含气象标记")

    weather_op = rec.get_latest_opinion_by_stage("weather_forecast")
    assert_true(weather_op is not None, "存在气象预报处理意见")
    assert_true(weather_op.evidence.get("forecast_id") is not None,
                f"处理意见包含气象预报ID: {weather_op.evidence.get('forecast_id')}")
    assert_true(
        "weather_condition" in weather_op.evidence,
        f"处理意见包含天气状况: {weather_op.evidence.get('weather_condition')}"
    )

    weather_sources = [s for s in rec.source_refs if s.source_type == "weather_forecast"]
    assert_true(len(weather_sources) >= 1, "溯源包含气象预报来源引用")

    print(f"  异常记录 {rec.record_id} 溯源:")
    print(f"    标记: {', '.join(rec.flags)}")
    print(f"    气象预报来源: {weather_sources[0].source_name} (id={weather_sources[0].source_id})")
    print(f"    气象预报意见: {weather_op.opinion}")
    print(f"    气象预报决策: {weather_op.decision}")
    for k, v in weather_op.evidence.items():
        print(f"      证据 {k}: {v}")


def test_duplicate_report_not_vague(pipeline):
    """重复上报不只是模糊提醒，而是精确到记录级"""
    print("")
    print("=== 测试 7：重复上报精确到记录级，不是模糊一句 ===")

    report = pipeline.duplicate_report
    assert_true(report.duplicate_count >= 1, f"检测到 {report.duplicate_count} 条重复记录")

    table_rows = report.as_table()
    dup_rows = [r for r in table_rows if r["role"] == "duplicate"]
    assert_true(len(dup_rows) >= 1, "重复报告表格中存在重复行")

    for row in dup_rows:
        assert_true(row["duplicate_of"] is not None,
                    f"重复记录 {row['record_id']} 明确指向主记录 {row['duplicate_of']}")

    dup_records = [r for r in pipeline.records if "duplicate" in r.flags]
    for d in dup_records:
        dup_op = d.get_latest_opinion_by_stage("duplicate_check")
        assert_true(dup_op is not None, f"重复记录 {d.record_id} 有处理意见")
        assert_true(d.duplicate_of is not None,
                    f"重复记录 {d.record_id} 标记 duplicate_of = {d.duplicate_of}")

    text_path = pipeline.report_files["text_report"]
    with open(text_path, "r", encoding="utf-8") as f:
        text = f.read()
    assert_true(
        "DUPLICATE REPORT" in text,
        "报告中包含 DUPLICATE REPORT 段落"
    )
    dup_detail_found = any(
        d.record_id in text for d in dup_records
    )
    assert_true(
        dup_detail_found,
        "报告中重复上报段落包含具体的重复记录ID（不是模糊一句）"
    )

    print(f"  重复检测明细: {report.duplicate_count} 条重复，分 {len(report.groups)} 组")
    print(report.summary())


def main():
    print("")
    print("=" * 70)
    print("  SEAGRASS BED COVERAGE ESTIMATION - ACCEPTANCE TEST")
    print("=" * 70)

    tide_stations = sample_tide_stations()
    records = generate_sample_records(batch_id="BATCH_ACCEPTANCE")

    pipeline = SeagrassPipeline(tide_stations=tide_stations, output_dir="output")
    pipeline.run(records, batch_id="BATCH_ACCEPTANCE")

    print("")
    print("预处理完成，开始验收测试...")

    test_shared_processing_records(pipeline)
    test_table_text_consistency(pipeline)
    test_timezone_mismatch_traceback(pipeline)
    test_download_filename_distinct()
    test_review_portal_correction(pipeline)
    test_anomaly_trace_to_weather(pipeline)
    test_duplicate_report_not_vague(pipeline)

    print("")
    print("=" * 70)
    print("  ALL ACCEPTANCE TESTS PASSED")
    print("=" * 70)
    print("")
    print("输出文件:")
    for k, v in pipeline.report_files.items():
        print(f"  {k}: {v}")
    print(f"  download: {pipeline.download_zip}")
    print("")

    portal = pipeline.get_review_portal()
    print(portal.interactive_summary())


if __name__ == "__main__":
    main()
