"""
命令行工具

实验老师小林的"操作面板"——
不用写代码，跑几条命令就能搞定日常工作。

常用命令：
  python -m cooling_tower_report.cli generate
    生成一份新报告

  python -m cooling_tower_report.cli list
    列出所有历史报告

  python -m cooling_tower_report.cli jump <旧报告ID> <新报告ID>
    对比两份报告，看结果为什么跳变了

  python -m cooling_tower_report.cli check <报告ID>
    一键校验报告一致性

  python -m cooling_tower_report.cli export <报告ID>
    导出CSV明细
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime

from .nameplate import NameplateManager
from .water_drop import WaterDropProcessor
from .report import ReportGenerator
from .consistency import ConsistencyChecker


DEFAULT_DATA_DIR = "data"
DEFAULT_OUTPUT_DIR = "output"


def _get_paths():
    nameplate_path = os.path.join(DEFAULT_DATA_DIR, "nameplate.json")
    water_data_path = os.path.join(DEFAULT_DATA_DIR, "water_drops.csv")
    reports_dir = os.path.join(DEFAULT_OUTPUT_DIR, "reports")
    csv_dir = os.path.join(DEFAULT_OUTPUT_DIR, "csv")
    return nameplate_path, water_data_path, reports_dir, csv_dir


def cmd_generate(args):
    """生成报告"""
    nameplate_path, water_data_path, reports_dir, csv_dir = _get_paths()

    if not os.path.exists(water_data_path):
        print(f"错误：找不到水滴数据文件 {water_data_path}")
        print("请先准备 data/water_drops.csv，或运行 demo 数据：")
        print("  python -m cooling_tower_report.cli demo")
        sys.exit(1)

    nameplate_mgr = NameplateManager(nameplate_path)
    water_proc = WaterDropProcessor(DEFAULT_DATA_DIR)
    count = water_proc.load_from_csv(water_data_path)
    print(f"已加载水滴数据：{count} 条")

    report_gen = ReportGenerator(reports_dir)

    time_start = args.start or "2024-06-14 00:00:00"
    time_end = args.end or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    operator = args.operator or ""

    report = report_gen.generate(
        nameplate_mgr, water_proc, time_start, time_end, operator
    )

    meta = report["meta"]
    print(f"\n报告生成成功！")
    print(f"  报告ID：{meta['report_id']}")
    print(f"  生成时间：{meta['generated_at']}")
    print(f"  数据时段：{meta['report_time_start']} ~ {meta['report_time_end']}")
    print(f"  铭牌版本：v{meta['nameplate_version']}")
    print(f"  数据记录：{meta['total_records']} 条")
    print(f"  异常数量：{meta['anomaly_count']} 条")

    csv_path = os.path.join(csv_dir, f"{meta['report_id']}_anomalies.csv")
    export_anomalies_csv(report, csv_path)
    print(f"  异常明细CSV：{csv_path}")

    detail_csv_path = os.path.join(csv_dir, f"{meta['report_id']}_detail.csv")
    export_detail_csv(report, detail_csv_path)
    print(f"  追溯明细CSV：{detail_csv_path}")

    return report


def cmd_list(args):
    """列出历史报告"""
    _, _, reports_dir, _ = _get_paths()
    report_gen = ReportGenerator(reports_dir)
    reports = report_gen.list_reports()

    if not reports:
        print("暂无历史报告。运行 generate 命令生成一份。")
        return

    print(f"共 {len(reports)} 份报告：\n")
    print(f"{'报告ID':<25} {'生成时间':<20} {'异常数':<6} {'铭牌v':<6} {'操作人'}")
    print("-" * 80)
    for r in reports:
        print(f"{r['report_id']:<25} {r['generated_at']:<20} "
              f"{r['anomaly_count']:<6} v{r['nameplate_version']:<5} "
              f"{r.get('operator', '')}")


def cmd_jump(args):
    """跳变分析"""
    _, _, reports_dir, _ = _get_paths()
    report_gen = ReportGenerator(reports_dir)

    old_id = args.old_report
    new_id = args.new_report

    result = report_gen.analyze_jump(old_id, new_id)

    print(f"\n跳变分析：{old_id} → {new_id}")
    print("=" * 60)
    print(f"\n{result.summary}\n")

    if result.jump_reasons:
        print("具体原因：")
        for i, reason in enumerate(result.jump_reasons, 1):
            print(f"  {i}. {reason['description']}")
            if reason["category"] == "threshold_change":
                for t in reason["details"]:
                    print(f"     - {t['threshold']}: {t['old_value']} → {t['new_value']}")
            elif reason["category"] == "note_added":
                for n in reason["details"]:
                    print(f"     - {n['note_id']}: {n['content'][:40]}")
                    print(f"       影响：{n['impact'][:40]}")
            elif reason["category"] == "note_retracted":
                for n in reason["details"]:
                    print(f"     - {n['note_id']}: {n['content'][:40]}")
                    print(f"       撤回原因：{n['retract_reason'][:40]}")


def cmd_check(args):
    """一致性校验"""
    nameplate_path, water_data_path, reports_dir, csv_dir = _get_paths()

    nameplate_mgr = NameplateManager(nameplate_path)
    water_proc = WaterDropProcessor(DEFAULT_DATA_DIR)
    if os.path.exists(water_data_path):
        water_proc.load_from_csv(water_data_path)

    report_gen = ReportGenerator(reports_dir)
    checker = ConsistencyChecker(nameplate_mgr, water_proc, report_gen)

    report_id = args.report_id
    if not report_id:
        latest = report_gen.get_latest_report()
        if latest:
            report_id = latest["meta"]["report_id"]
            print(f"使用最新报告：{report_id}\n")
        else:
            print("暂无报告可校验")
            return

    csv_path = os.path.join(csv_dir, f"{report_id}_anomalies.csv")
    if not os.path.exists(csv_path):
        csv_path = None

    result = checker.full_check(report_id, csv_path)

    print(f"一致性校验：{report_id}")
    print("=" * 50)
    print(f"\n总体结果：{'通过 ✅' if result['ok'] else '失败 ❌'}\n")
    print(result["summary"])
    print()

    for name, r in result["checks"].items():
        status = "✅ 通过" if r.get("ok") else "❌ 失败"
        print(f"  {name}: {status}")
        if not r.get("ok"):
            print(f"    原因：{r.get('error', '未知')}")


def cmd_export(args):
    """导出CSV"""
    _, _, reports_dir, csv_dir = _get_paths()
    report_gen = ReportGenerator(reports_dir)

    report_id = args.report_id
    if not report_id:
        latest = report_gen.get_latest_report()
        if latest:
            report_id = latest["meta"]["report_id"]
        else:
            print("暂无报告可导出")
            return

    report = report_gen.load_report(report_id)
    if not report:
        print(f"找不到报告：{report_id}")
        return

    os.makedirs(csv_dir, exist_ok=True)

    anomalies_path = os.path.join(csv_dir, f"{report_id}_anomalies.csv")
    export_anomalies_csv(report, anomalies_path)
    print(f"异常清单：{anomalies_path}")

    detail_path = os.path.join(csv_dir, f"{report_id}_detail.csv")
    export_detail_csv(report, detail_path)
    print(f"追溯明细：{detail_path}")

    summary_path = os.path.join(csv_dir, f"{report_id}_summary.csv")
    export_summary_csv(report, summary_path)
    print(f"统计摘要：{summary_path}")


def cmd_note(args):
    """管理铭牌备注"""
    nameplate_path, _, _, _ = _get_paths()
    nameplate_mgr = NameplateManager(nameplate_path)

    if args.action == "add":
        if not args.content:
            print("请提供备注内容：--content '...'")
            return
        if not args.impact:
            print("请提供影响说明：--impact '...'")
            print("（这条备注改变了哪些判断？必须写清楚）")
            return
        operator = args.operator or "unknown"
        version = nameplate_mgr.add_note(operator, args.content, args.impact)
        print(f"已追加备注，铭牌版本升级到 v{version.version}")
        print(f"  备注ID：{version.notes[-1].note_id}")
        print(f"  内容：{args.content}")
        print(f"  影响：{args.impact}")

    elif args.action == "list":
        latest = nameplate_mgr.get_latest()
        print(f"当前铭牌版本：v{latest.version}")
        print(f"变更历史：共 {nameplate_mgr.get_version_count()} 版\n")
        for v in nameplate_mgr.list_versions():
            print(f"  v{v['version']}  {v['timestamp']}  {v['operator']}")
            print(f"      {v['change_reason']}")
        print(f"\n当前备注（{len(latest.notes)} 条）：")
        for n in latest.notes:
            status = "已撤回" if n.is_retracted else "生效中"
            print(f"  [{n.note_id}] {status}  {n.operator}  {n.timestamp}")
            print(f"      内容：{n.content}")
            print(f"      影响：{n.impact_description}")
            if n.is_retracted:
                print(f"      撤回：{n.retract_operator} {n.retract_timestamp}")
                print(f"      原因：{n.retract_reason}")

    elif args.action == "retract":
        if not args.note_id:
            print("请提供要撤回的备注ID：--note-id ...")
            return
        if not args.reason:
            print("请提供撤回原因：--reason '...'")
            return
        operator = args.operator or "unknown"
        version = nameplate_mgr.retract_note(operator, args.note_id, args.reason)
        print(f"已撤回备注 {args.note_id}，铭牌版本升级到 v{version.version}")


def cmd_threshold(args):
    """修改安全阈值"""
    nameplate_path, _, _, _ = _get_paths()
    nameplate_mgr = NameplateManager(nameplate_path)

    if args.action == "show":
        latest = nameplate_mgr.get_latest()
        th = latest.thresholds
        print(f"当前铭牌版本：v{latest.version}")
        print(f"安全阈值：")
        print(f"  温度上限：{th.water_drop_temp_high} ℃")
        print(f"  温度下限：{th.water_drop_temp_low} ℃")
        print(f"  流量上限：{th.water_drop_flow_high} {th.unit}")
        print(f"  流量下限：{th.water_drop_flow_low} {th.unit}")
        print(f"  流量单位：{th.unit}")

    elif args.action == "set":
        changes = {}
        if args.temp_high is not None:
            changes["water_drop_temp_high"] = args.temp_high
        if args.temp_low is not None:
            changes["water_drop_temp_low"] = args.temp_low
        if args.flow_high is not None:
            changes["water_drop_flow_high"] = args.flow_high
        if args.flow_low is not None:
            changes["water_drop_flow_low"] = args.flow_low
        if args.unit:
            changes["unit"] = args.unit

        if not changes:
            print("请至少指定一项要修改的阈值")
            return

        reason = args.reason or "未说明"
        operator = args.operator or "unknown"
        version = nameplate_mgr.update_thresholds(operator, reason, **changes)
        print(f"已更新阈值，铭牌版本升级到 v{version.version}")
        print(f"  操作人：{operator}")
        print(f"  原因：{reason}")
        for k, v in changes.items():
            print(f"  {k} = {v}")


def cmd_demo(args):
    """生成演示数据——快速体验整套流程"""
    print("正在生成演示数据...\n")

    os.makedirs(DEFAULT_DATA_DIR, exist_ok=True)
    os.makedirs(DEFAULT_OUTPUT_DIR, exist_ok=True)

    nameplate_path = os.path.join(DEFAULT_DATA_DIR, "nameplate.json")
    water_path = os.path.join(DEFAULT_DATA_DIR, "water_drops.csv")

    import shutil
    if os.path.exists(os.path.join(DEFAULT_OUTPUT_DIR, "reports")):
        shutil.rmtree(os.path.join(DEFAULT_OUTPUT_DIR, "reports"))
    if os.path.exists(os.path.join(DEFAULT_OUTPUT_DIR, "csv")):
        shutil.rmtree(os.path.join(DEFAULT_OUTPUT_DIR, "csv"))
    if os.path.exists(nameplate_path):
        os.remove(nameplate_path)
    if os.path.exists(water_path):
        os.remove(water_path)

    import csv
    from datetime import timedelta

    start_dt = datetime(2024, 6, 14, 8, 0, 0)
    rows = []
    for i in range(100):
        ts = start_dt + timedelta(minutes=i * 5)
        temp = 28.0 + (i % 20) * 0.3
        flow = 50.0 + (i % 15) * 1.5
        if i == 25:
            temp = 36.2
        if i == 40:
            temp = 33.5
        if i == 55:
            temp = 31.8
        if i == 70:
            temp = 29.5
        if i == 15:
            flow = 105.0
        if i == 80:
            flow = 8.5
        rows.append({
            "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
            "temperature": f"{temp:.1f}",
            "flow_rate": f"{flow:.1f}",
            "tower_id": "CT-001",
        })

    with open(water_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["timestamp", "temperature", "flow_rate", "tower_id"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"✓ 已生成水滴数据：{len(rows)} 条 → {water_path}")
    print("   （里面故意埋了几个高温和流量异常点）\n")

    nameplate_mgr = NameplateManager(nameplate_path)
    v1_th = nameplate_mgr.get_latest().thresholds
    print(f"✓ 已初始化铭牌 v1（出厂默认）")
    print(f"   高温阈值：{v1_th.water_drop_temp_high}℃")
    print(f"   低温阈值：{v1_th.water_drop_temp_low}℃")
    print(f"   流量上限：{v1_th.water_drop_flow_high} {v1_th.unit}")
    print(f"   流量下限：{v1_th.water_drop_flow_low} {v1_th.unit}\n")

    water_proc = WaterDropProcessor(DEFAULT_DATA_DIR)
    water_proc.load_from_csv(water_path)

    reports_dir = os.path.join(DEFAULT_OUTPUT_DIR, "reports")
    report_gen = ReportGenerator(reports_dir)
    csv_dir = os.path.join(DEFAULT_OUTPUT_DIR, "csv")
    os.makedirs(csv_dir, exist_ok=True)

    time_start = "2024-06-14 08:00:00"
    time_end = "2024-06-14 16:00:00"

    report1 = report_gen.generate(
        nameplate_mgr, water_proc,
        time_start, time_end,
        operator="小林",
        nameplate_version=1,
    )
    rid1 = report1["meta"]["report_id"]
    print(f"✓ 生成报告1（用 v1 铭牌）：{rid1}")
    print(f"   异常数：{report1['meta']['anomaly_count']} 条\n")
    export_anomalies_csv(report1, os.path.join(csv_dir, f"{rid1}_anomalies.csv"))
    export_detail_csv(report1, os.path.join(csv_dir, f"{rid1}_detail.csv"))

    nameplate_mgr.update_thresholds(
        "小林",
        "夏季高温预警，临时收紧高温阈值",
        water_drop_temp_high=32.0,
    )
    print(f"✓ 小林改了阈值：高温从 {v1_th.water_drop_temp_high}℃ 降到 32℃")

    nameplate_mgr.add_note(
        "小林",
        "接调度通知，本周高温橙色预警，冷却塔高温阈值临时收紧",
        "温度高于32℃即算高温异常，原35℃标准暂停执行，待预警解除后恢复"
    )
    print("✓ 小林追加了一条备注，说明为什么改阈值、影响了哪些判断\n")

    report2 = report_gen.generate(
        nameplate_mgr, water_proc,
        time_start, time_end,
        operator="小林",
    )
    rid2 = report2["meta"]["report_id"]
    print(f"✓ 生成报告2（用 v3 铭牌，收紧后）：{rid2}")
    print(f"   异常数：{report2['meta']['anomaly_count']} 条\n")
    export_anomalies_csv(report2, os.path.join(csv_dir, f"{rid2}_anomalies.csv"))
    export_detail_csv(report2, os.path.join(csv_dir, f"{rid2}_detail.csv"))

    jump = report_gen.analyze_jump(rid1, rid2)
    print("=" * 60)
    print("跳变分析（报告1 → 报告2）")
    print("=" * 60)
    print(f"\n{jump.summary}\n")
    if jump.jump_reasons:
        print("分类原因：")
        for reason in jump.jump_reasons:
            print(f"  ● {reason['description']}")
            if reason["category"] == "threshold_change":
                for t in reason["details"]:
                    print(f"    - {t['threshold']}: {t['old_value']} → {t['new_value']}")
            elif reason["category"] == "note_added":
                for n in reason["details"]:
                    print(f"    - {n['note_id']}: {n['content'][:50]}")
    print()

    nameplate_mgr.retract_note(
        "小林",
        "note_3_1",
        "预警解除，恢复原高温阈值标准"
    )
    nameplate_mgr.update_thresholds(
        "小林",
        "高温预警解除，恢复出厂阈值",
        water_drop_temp_high=35.0,
    )
    print("✓ 预警解除了：小林撤回备注 + 恢复阈值\n")

    report3 = report_gen.generate(
        nameplate_mgr, water_proc,
        time_start, time_end,
        operator="小林",
    )
    rid3 = report3["meta"]["report_id"]
    print(f"✓ 生成报告3（恢复后）：{rid3}")
    print(f"   异常数：{report3['meta']['anomaly_count']} 条\n")

    jump2 = report_gen.analyze_jump(rid2, rid3)
    print("=" * 60)
    print("跳变分析（报告2 → 报告3）")
    print("=" * 60)
    print(f"\n{jump2.summary}\n")
    if jump2.jump_reasons:
        print("分类原因：")
        for reason in jump2.jump_reasons:
            print(f"  ● {reason['description']}")

    print()
    print("=" * 60)
    print("演示完成！试试这些命令：")
    print("=" * 60)
    print()
    print(f"  1. 看报告列表：")
    print(f"     python3 -m cooling_tower_report.cli list")
    print()
    print(f"  2. 校验最新报告一致性（报告/铭牌/数据对不对得上）：")
    print(f"     python3 -m cooling_tower_report.cli check")
    print()
    print(f"  3. 看铭牌版本历史和备注：")
    print(f"     python3 -m cooling_tower_report.cli note list")
    print()
    print(f"  4. 导出最新报告的CSV（3个文件）：")
    print(f"     python3 -m cooling_tower_report.cli export")
    print()
    print(f"  5. 自己对比两份报告：")
    print(f"     python3 -m cooling_tower_report.cli jump {rid1} {rid3}")
    print()


def export_anomalies_csv(report: dict, output_path: str) -> None:
    """导出异常清单CSV——排班同事一眼能看到哪些点有问题"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fieldnames = [
        "anomaly_id", "record_id", "timestamp", "anomaly_type",
        "value", "threshold_value", "threshold_name",
        "nameplate_version", "nameplate_snapshot_hash",
    ]
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for a in report["anomalies"]:
            row = {k: a.get(k, "") for k in fieldnames}
            writer.writerow(row)


def export_detail_csv(report: dict, output_path: str) -> None:
    """
    导出追溯明细CSV——从异常点一路追回到铭牌说法

    这是给"追明细"的同事用的。
    他在图表上点了一个异常点，打开这份CSV就能看到：
    - 原始数据是什么
    - 触发了哪个阈值
    - 这个阈值来自哪版铭牌
    - 那版铭牌上有哪些备注（包括已撤回的）
    - 备注说了什么，影响了哪些判断
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fieldnames = [
        "anomaly_id", "record_id", "timestamp", "anomaly_type",
        "value", "threshold_value", "threshold_name", "unit",
        "description",
        "nameplate_version", "nameplate_snapshot_hash",
        "nameplate_change_reason",
        "active_notes", "active_note_impacts",
        "retracted_notes", "retract_reasons",
        "source_file", "tower_id",
    ]
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for a in report["anomalies"]:
            tc = a.get("trace_chain", {})
            active_notes = tc.get("active_notes", [])
            retracted_notes = tc.get("retracted_notes", [])
            row = {
                "anomaly_id": a.get("anomaly_id", ""),
                "record_id": a.get("record_id", ""),
                "timestamp": a.get("timestamp", ""),
                "anomaly_type": a.get("anomaly_type", ""),
                "value": a.get("value", ""),
                "threshold_value": a.get("threshold_value", ""),
                "threshold_name": a.get("threshold_name", ""),
                "unit": tc.get("unit", ""),
                "description": tc.get("description", ""),
                "nameplate_version": a.get("nameplate_version", ""),
                "nameplate_snapshot_hash": a.get("nameplate_snapshot_hash", ""),
                "nameplate_change_reason": tc.get("nameplate_change_reason", ""),
                "active_notes": " | ".join(
                    f"[{n['note_id']}] {n['content']}" for n in active_notes
                ) if active_notes else "",
                "active_note_impacts": " | ".join(
                    f"[{n['note_id']}] {n['impact']}" for n in active_notes
                ) if active_notes else "",
                "retracted_notes": " | ".join(
                    f"[{n['note_id']}] {n['content']}" for n in retracted_notes
                ) if retracted_notes else "",
                "retract_reasons": " | ".join(
                    f"[{n['note_id']}] {n['retract_reason']}" for n in retracted_notes
                ) if retracted_notes else "",
                "source_file": tc.get("source_file", ""),
                "tower_id": tc.get("tower_id", ""),
            }
            writer.writerow(row)


def export_summary_csv(report: dict, output_path: str) -> None:
    """导出统计摘要CSV——给领导看的概览"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    meta = report["meta"]
    summary = report["summary"]

    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["项目", "值"])
        writer.writerow(["报告ID", meta["report_id"]])
        writer.writerow(["生成时间", meta["generated_at"]])
        writer.writerow(["数据时段起点", meta["report_time_start"]])
        writer.writerow(["数据时段终点", meta["report_time_end"]])
        writer.writerow(["操作人", meta.get("operator", "")])
        writer.writerow(["铭牌版本", f"v{meta['nameplate_version']}"])
        writer.writerow(["铭牌快照哈希", meta["nameplate_snapshot_hash"]])
        writer.writerow(["数据哈希", meta["data_hash"]])
        writer.writerow(["数据来源文件", meta["data_source_file"]])
        writer.writerow(["总记录数", meta["total_records"]])
        writer.writerow(["异常总数", meta["anomaly_count"]])
        writer.writerow([
            "当前生效备注数",
            summary.get("active_note_count", 0)
        ])
        writer.writerow([
            "已撤回备注数",
            summary.get("retracted_note_count", 0)
        ])
        for atype, count in summary.get("by_type", {}).items():
            writer.writerow([f"异常-{atype}", count])


def main():
    parser = argparse.ArgumentParser(
        prog="cooling_tower_report",
        description="冷却塔水滴报告导出工具——全链路可追溯"
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    p_gen = subparsers.add_parser("generate", help="生成报告")
    p_gen.add_argument("--start", help="数据起始时间，如 2024-06-14 08:00:00")
    p_gen.add_argument("--end", help="数据结束时间")
    p_gen.add_argument("--operator", help="操作人")

    subparsers.add_parser("list", help="列出历史报告")

    p_jump = subparsers.add_parser("jump", help="跳变分析")
    p_jump.add_argument("old_report", help="旧报告ID")
    p_jump.add_argument("new_report", help="新报告ID")

    p_check = subparsers.add_parser("check", help="一致性校验")
    p_check.add_argument("report_id", nargs="?", help="报告ID（默认最新）")

    p_export = subparsers.add_parser("export", help="导出CSV")
    p_export.add_argument("report_id", nargs="?", help="报告ID（默认最新）")

    p_note = subparsers.add_parser("note", help="铭牌备注管理")
    p_note.add_argument("action", choices=["add", "list", "retract"], help="操作")
    p_note.add_argument("--content", help="备注内容")
    p_note.add_argument("--impact", help="影响说明（改变了哪些判断）")
    p_note.add_argument("--note-id", help="备注ID（撤回时用）")
    p_note.add_argument("--reason", help="撤回原因")
    p_note.add_argument("--operator", help="操作人")

    p_th = subparsers.add_parser("threshold", help="安全阈值管理")
    p_th.add_argument("action", choices=["show", "set"], help="操作")
    p_th.add_argument("--temp-high", type=float, help="温度上限")
    p_th.add_argument("--temp-low", type=float, help="温度下限")
    p_th.add_argument("--flow-high", type=float, help="流量上限")
    p_th.add_argument("--flow-low", type=float, help="流量下限")
    p_th.add_argument("--unit", help="流量单位")
    p_th.add_argument("--reason", help="修改原因")
    p_th.add_argument("--operator", help="操作人")

    subparsers.add_parser("demo", help="生成演示数据，快速体验")

    args = parser.parse_args()

    if args.command == "generate":
        cmd_generate(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "jump":
        cmd_jump(args)
    elif args.command == "check":
        cmd_check(args)
    elif args.command == "export":
        cmd_export(args)
    elif args.command == "note":
        cmd_note(args)
    elif args.command == "threshold":
        cmd_threshold(args)
    elif args.command == "demo":
        cmd_demo(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
