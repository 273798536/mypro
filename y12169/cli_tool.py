#!/usr/bin/env python3
import sys
import os
import json
from pathlib import Path
from datetime import datetime
import argparse

sys.path.insert(0, str(Path(__file__).parent))

from battery_diagnosis.modules.diagnosis_service import get_diagnosis_service
from battery_diagnosis.modules.exporter import export_result
from battery_diagnosis.core.models import AnomalyType


ANOMALY_TYPE_NAMES = {
    AnomalyType.LOW_TEMPERATURE: '❄️ 低温影响',
    AnomalyType.FAST_CHARGING_EXCESS: '⚡ 快充过多',
    AnomalyType.ABNORMAL_TRIP: '⚠️ 行程异常',
    AnomalyType.BATTERY_DEGRADATION: '🔋 电池衰减',
    AnomalyType.DRIVING_HABIT: '🚗 驾驶习惯',
}

SEVERITY_COLORS = {
    'low': '🟢',
    'medium': '🟡',
    'high': '🟠',
    'critical': '🔴',
}


def print_separator(char="=", length=60):
    print(char * length)


def print_header(title):
    print_separator()
    print(f"  {title}")
    print_separator()


def format_number(num, decimals=1):
    try:
        return f"{num:.{decimals}f}"
    except (TypeError, ValueError):
        return str(num)


def diagnose_command(args):
    if not args.files:
        print("❌ 请指定至少一个数据文件")
        return 1

    files = [Path(f) for f in args.files]
    for f in files:
        if not f.exists():
            print(f"❌ 文件不存在: {f}")
            return 1

    service = get_diagnosis_service()

    print_header("电动车续航衰减诊断")
    print(f"📁 正在分析数据文件...")
    print(f"   {', '.join(f.name for f in files)}")
    print()

    try:
        result = service.diagnose_from_files(files, save_result=not args.no_save)
    except Exception as e:
        print(f"❌ 诊断失败: {e}")
        return 1

    diagnosis = result['diagnosis']

    if result.get('is_duplicate'):
        print(f"ℹ️  检测到重复诊断，返回已有结果")
        print(f"   诊断ID: {result.get('existing_id')}")
        print()

    print_header("📊 诊断摘要")
    print(f"诊断ID: {diagnosis.diagnosis_id}")
    print(f"车辆VIN: {diagnosis.vin}")
    print(f"诊断时间: {diagnosis.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"数据质量: {'⭐' * int(diagnosis.data_quality_score * 5)} ({diagnosis.data_quality_score:.2f})")
    print()

    print_header("🔋 续航估算")
    re = diagnosis.range_estimate
    print(f"标称续航:    {format_number(re.nominal_range_km)} km")
    print(f"实际续航:    {format_number(re.actual_estimated_range_km)} km")
    deficit = re.nominal_range_km - re.actual_estimated_range_km
    deficit_percent = (deficit / re.nominal_range_km) * 100
    print(f"续航衰减:    ↓ {format_number(deficit)} km ({format_number(deficit_percent)}%)")
    print(f"电池健康度:  {format_number(re.battery_health_percent)} %")
    print(f"基础能耗:    {format_number(re.base_consumption_kwh_100km, 2)} kWh/100km")
    print(f"调整后能耗:  {format_number(re.adjusted_consumption_kwh_100km, 2)} kWh/100km")
    print(f"置信度:      {'📊' * int(re.confidence_score * 5)} ({re.confidence_score:.2f})")
    print(f"估算方法:    {re.method}")
    print()

    print_header("📈 因素分解")
    if diagnosis.factor_breakdown:
        for i, factor in enumerate(diagnosis.factor_breakdown, 1):
            name = ANOMALY_TYPE_NAMES.get(factor.factor, factor.factor.value)
            bar_length = int(factor.contribution_percent / 2)
            bar = "█" * bar_length + "░" * (50 - bar_length)
            print(f"{i}. {name}")
            print(f"   {bar} {format_number(factor.contribution_percent)}%")
            print(f"   影响续航: ↓ {format_number(factor.impact_range_km)} km")
            if factor.evidence and args.verbose:
                print(f"   证据: {factor.evidence[0]}")
            print()
    else:
        print("未检测到显著影响因素")
        print()

    print_header("⚠️  异常检测")
    if diagnosis.anomalies:
        for i, anomaly in enumerate(diagnosis.anomalies, 1):
            name = ANOMALY_TYPE_NAMES.get(anomaly.anomaly_type, anomaly.anomaly_type.value)
            severity_icon = SEVERITY_COLORS.get(anomaly.severity, '')
            severity_text = {'low': '低', 'medium': '中', 'high': '高', 'critical': '严重'}.get(anomaly.severity, anomaly.severity)
            print(f"{i}. {severity_icon} {name} [{severity_text}]")
            print(f"   {anomaly.description}")
            print(f"   影响续航: ↓ {format_number(anomaly.affected_range_km)} km")
            print(f"   关联行程: {len(anomaly.trip_ids)} 条")
            if anomaly.source_refs and args.verbose:
                print(f"   来源: {', '.join(anomaly.source_refs[:3])}")
            print()
    else:
        print("✅ 未检测到异常")
        print()

    print_header("💡 改进建议")
    for i, suggestion in enumerate(diagnosis.recommendations, 1):
        print(f"{i}. {suggestion}")
    print()

    print_header("📝 诊断总结")
    print(diagnosis.summary)
    print()

    if args.export:
        print_header("📤 导出结果")
        export_path = export_result(diagnosis, result.get('trips', []), format=args.export_format)
        if export_path:
            if isinstance(export_path, list):
                for p in export_path:
                    print(f"✅ 已导出到: {p}")
            else:
                print(f"✅ 已导出到: {export_path}")
        else:
            print("❌ 导出失败")
        print()

    return 0


def history_command(args):
    service = get_diagnosis_service()

    print_header("📚 诊断历史")

    start_date = None
    end_date = None
    if args.start_date:
        start_date = datetime.strptime(args.start_date, "%Y-%m-%d")
    if args.end_date:
        end_date = datetime.strptime(args.end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)

    history = service.get_history(
        vin=args.vin, start_date=start_date, end_date=end_date,
        limit=args.limit, offset=args.offset
    )

    total = service.get_count(vin=args.vin)

    print(f"共 {total} 条记录，显示 {len(history)} 条")
    print()

    if not history:
        print("暂无诊断记录")
        return 0

    for i, diag in enumerate(history, 1):
        re = diag.range_estimate
        print(f"{i}. 诊断ID: {diag.diagnosis_id}")
        print(f"   时间: {diag.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   VIN: {diag.vin}")
        print(f"   标称续航: {format_number(re.nominal_range_km)} km, 实际续航: {format_number(re.actual_estimated_range_km)} km")
        print(f"   电池健康: {format_number(re.battery_health_percent)}%, 置信度: {re.confidence_score:.2f}")
        print(f"   异常数: {len(diag.anomalies)}, 建议数: {len(diag.recommendations)}")
        print()

    return 0


def show_command(args):
    service = get_diagnosis_service()

    diagnosis = service.get_diagnosis(args.diagnosis_id)
    if not diagnosis:
        print(f"❌ 诊断记录不存在: {args.diagnosis_id}")
        return 1

    args.files = []
    args.no_save = True
    args.verbose = True
    args.export = False

    class FakeResult:
        diagnosis = diagnosis
        is_duplicate = False
        trips = []

    result = {
        'diagnosis': diagnosis,
        'is_duplicate': False,
        'trips': []
    }

    re = diagnosis.range_estimate

    print_header(f"🔍 诊断详情 - {args.diagnosis_id}")
    print(f"VIN: {diagnosis.vin}")
    print(f"时间: {diagnosis.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"数据包ID: {diagnosis.packet_id}")
    print(f"数据质量: {diagnosis.data_quality_score:.2f}")
    print()

    print_header("🔋 续航估算")
    print(f"标称续航: {format_number(re.nominal_range_km)} km")
    print(f"实际续航: {format_number(re.actual_estimated_range_km)} km")
    print(f"电池健康度: {format_number(re.battery_health_percent)} %")
    print(f"基础能耗: {format_number(re.base_consumption_kwh_100km, 2)} kWh/100km")
    print(f"调整后能耗: {format_number(re.adjusted_consumption_kwh_100km, 2)} kWh/100km")
    print(f"置信度: {re.confidence_score:.2f}")
    print()

    print_header("📈 因素分解")
    for factor in diagnosis.factor_breakdown:
        name = ANOMALY_TYPE_NAMES.get(factor.factor, factor.factor.value)
        print(f"  {name}: {format_number(factor.contribution_percent)}% (影响 ↓{format_number(factor.impact_range_km)} km)")
        for evidence in factor.evidence[:3]:
            print(f"    - {evidence}")
        if factor.source_refs:
            print(f"    来源: {', '.join(factor.source_refs[:2])}")
        print()

    print_header("⚠️  异常检测")
    for anomaly in diagnosis.anomalies:
        name = ANOMALY_TYPE_NAMES.get(anomaly.anomaly_type, anomaly.anomaly_type.value)
        severity_icon = SEVERITY_COLORS.get(anomaly.severity, '')
        severity_text = {'low': '低', 'medium': '中', 'high': '高', 'critical': '严重'}.get(anomaly.severity, anomaly.severity)
        print(f"  {severity_icon} {name} [{severity_text}]")
        print(f"    {anomaly.description}")
        print(f"    影响续航: ↓ {format_number(anomaly.affected_range_km)} km")
        for ev in anomaly.evidence[:2]:
            print(f"    证据: {json.dumps(ev, ensure_ascii=False)}")
        if anomaly.source_refs:
            print(f"    来源: {', '.join(anomaly.source_refs[:3])}")
        print()

    print_header("💡 改进建议")
    for i, suggestion in enumerate(diagnosis.recommendations, 1):
        print(f"  {i}. {suggestion}")
    print()

    print_header("📝 总结")
    print(diagnosis.summary)
    print()

    if args.export:
        print_header("📤 导出结果")
        trips = []
        export_path = export_result(diagnosis, trips, format=args.export_format)
        if export_path:
            if isinstance(export_path, list):
                for p in export_path:
                    print(f"✅ 已导出到: {p}")
            else:
                print(f"✅ 已导出到: {export_path}")
        print()

    return 0


def export_command(args):
    service = get_diagnosis_service()

    diagnosis = service.get_diagnosis(args.diagnosis_id)
    if not diagnosis:
        print(f"❌ 诊断记录不存在: {args.diagnosis_id}")
        return 1

    print_header("📤 导出诊断结果")
    print(f"诊断ID: {args.diagnosis_id}")
    print(f"导出格式: {args.format}")
    print()

    export_path = service.export_diagnosis(args.diagnosis_id, format=args.format)

    if export_path:
        if isinstance(export_path, list):
            for p in export_path:
                print(f"✅ 已导出到: {p}")
        else:
            print(f"✅ 已导出到: {export_path}")
        return 0
    else:
        print("❌ 导出失败")
        return 1


def stats_command(args):
    from battery_diagnosis.core.database import get_db

    db = get_db()
    total = db.get_diagnosis_count()

    print_header("📊 系统统计")
    print(f"总诊断数: {total}")
    print(f"数据库路径: {db.db_path}")
    print()

    if total > 0:
        history = db.get_diagnosis_history(limit=10)
        vins = set(d.vin for d in history)
        print(f"涉及车辆数: {len(vins)}")
        print()

        print("最近10条诊断:")
        for diag in history:
            print(f"  {diag.created_at.strftime('%Y-%m-%d %H:%M')} - {diag.vin} - {diag.diagnosis_id}")

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="电动车续航衰减诊断系统",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 诊断数据文件
  python cli_tool.py diagnose vehicle.csv trips.csv

  # 诊断并导出Excel
  python cli_tool.py diagnose vehicle.csv trips.csv --export --export-format excel

  # 查看诊断历史
  python cli_tool.py history

  # 查看特定诊断详情
  python cli_tool.py show DIAG_1234567890AB

  # 导出诊断结果
  python cli_tool.py export DIAG_1234567890AB --format csv

  # 查看系统统计
  python cli_tool.py stats
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    diagnose_parser = subparsers.add_parser("diagnose", help="诊断数据文件")
    diagnose_parser.add_argument("files", nargs="+", help="数据文件路径（支持CSV、JSON格式）")
    diagnose_parser.add_argument("--no-save", action="store_true", help="不保存诊断结果")
    diagnose_parser.add_argument("--export", action="store_true", help="诊断完成后导出结果")
    diagnose_parser.add_argument("--export-format", choices=["excel", "csv", "json"], default="excel", help="导出格式")
    diagnose_parser.add_argument("-v", "--verbose", action="store_true", help="显示详细信息")

    history_parser = subparsers.add_parser("history", help="查看诊断历史")
    history_parser.add_argument("--vin", help="按VIN过滤")
    history_parser.add_argument("--start-date", help="开始日期 (YYYY-MM-DD)")
    history_parser.add_argument("--end-date", help="结束日期 (YYYY-MM-DD)")
    history_parser.add_argument("--limit", type=int, default=100, help="返回数量限制")
    history_parser.add_argument("--offset", type=int, default=0, help="偏移量")

    show_parser = subparsers.add_parser("show", help="查看诊断详情")
    show_parser.add_argument("diagnosis_id", help="诊断ID")
    show_parser.add_argument("--export", action="store_true", help="导出结果")
    show_parser.add_argument("--export-format", choices=["excel", "csv", "json"], default="excel", help="导出格式")

    export_parser = subparsers.add_parser("export", help="导出诊断结果")
    export_parser.add_argument("diagnosis_id", help="诊断ID")
    export_parser.add_argument("--format", choices=["excel", "csv", "json"], default="excel", help="导出格式")

    stats_parser = subparsers.add_parser("stats", help="查看系统统计")

    args = parser.parse_args()

    if args.command == "diagnose":
        return diagnose_command(args)
    elif args.command == "history":
        return history_command(args)
    elif args.command == "show":
        return show_command(args)
    elif args.command == "export":
        return export_command(args)
    elif args.command == "stats":
        return stats_command(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
