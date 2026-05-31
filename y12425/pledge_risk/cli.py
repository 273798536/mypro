"""CLI命令框架 - 所有参数清晰定义，无需手工整理"""
import argparse
import sys
from .models import init_db, gen_batch_no
from . import importer, analyzer, calculator, report


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pledge-risk",
        description="充电桩收益权质押风控系统 - 自动留痕、智能拆解风险",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 第一次导入：桩站档案 + 充电订单
  pledge-risk import --batch-type FIRST \\
    --stations data/stations.csv \\
    --orders data/orders.csv \\
    --operator wangxiaofeng --remark "2026年5月质押项目S001"

  # 第二次导入：补充设备状态（自动对比前后变化）
  pledge-risk import --batch-type SECOND \\
    --device-status data/device_status.csv \\
    --compare-batch FIRST_20260531103000 \\
    --operator wangxiaofeng --remark "补充设备状态，校验离线情况"

  # 风险拆解：按类型拆分问题
  pledge-risk analyze --risk-types DEVICE_OFFLINE,REVENUE_DUPLICATE,RULE_EXPIRED

  # 现金流估算 + 质押计算（记录级可追溯）
  pledge-risk pledge --station-code S001 --pledge-amount 500000 \\
    --start-date 2026-06-01 --end-date 2027-05-31 --interest-rate 0.06

  # 生成报告
  pledge-risk report --batch-no FIRST_20260531103000 --format text
        """,
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    init_p = subparsers.add_parser("init", help="初始化数据库")

    import_p = subparsers.add_parser("import", help="导入数据", aliases=["imp"])
    import_p.add_argument("--batch-type", required=True, choices=["FIRST", "SECOND"],
                          help="批次类型: FIRST=桩站档案+充电订单; SECOND=补充设备状态")
    import_p.add_argument("--stations", help="桩站档案CSV路径 (FIRST批次必填)")
    import_p.add_argument("--orders", help="充电订单CSV路径 (FIRST批次必填)")
    import_p.add_argument("--device-status", help="设备状态CSV路径 (SECOND批次必填)")
    import_p.add_argument("--compare-batch", help="对比的批次号 (SECOND批次自动计算变化)")
    import_p.add_argument("--operator", help="操作人")
    import_p.add_argument("--remark", help="备注")

    analyze_p = subparsers.add_parser("analyze", help="风险分析与拆解")
    analyze_p.add_argument("--risk-types", default="DEVICE_OFFLINE,REVENUE_DUPLICATE,RULE_EXPIRED",
                          help="风险类型，逗号分隔: DEVICE_OFFLINE,REVENUE_DUPLICATE,RULE_EXPIRED")
    analyze_p.add_argument("--station-code", help="指定桩站分析")
    analyze_p.add_argument("--batch-no", help="指定批次分析")
    analyze_p.add_argument("--offline-threshold-hours", type=float, default=4,
                          help="设备离线告警阈值（小时），默认4小时")

    pledge_p = subparsers.add_parser("pledge", help="质押计算与登记")
    pledge_p.add_argument("--station-code", required=True, help="桩站编号")
    pledge_p.add_argument("--pledge-amount", type=float, required=True, help="质押金额（元）")
    pledge_p.add_argument("--start-date", required=True, help="质押开始日期 YYYY-MM-DD")
    pledge_p.add_argument("--end-date", required=True, help="质押结束日期 YYYY-MM-DD")
    pledge_p.add_argument("--interest-rate", type=float, default=0.06, help="年利率，默认6%")
    pledge_p.add_argument("--pledge-no", help="质押编号，不填则自动生成")
    pledge_p.add_argument("--operator", help="操作人")

    report_p = subparsers.add_parser("report", help="生成报告")
    report_p.add_argument("--batch-no", help="指定批次")
    report_p.add_argument("--station-code", help="指定桩站")
    report_p.add_argument("--pledge-no", help="指定质押")
    report_p.add_argument("--format", default="text", choices=["text", "json", "csv"],
                          help="输出格式")
    report_p.add_argument("--output", help="输出文件路径，不填则输出到终端")

    logs_p = subparsers.add_parser("logs", help="查看风控日志（系统留痕）")
    logs_p.add_argument("--batch-no", help="按批次筛选")
    logs_p.add_argument("--risk-type", help="按风险类型筛选")
    logs_p.add_argument("--limit", type=int, default=50, help="显示条数")

    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "init":
        init_db()
        print("✅ 数据库初始化完成")
        return 0

    if args.command == "import":
        batch_no = gen_batch_no(args.batch_type)

        if args.batch_type == "FIRST":
            if not args.stations or not args.orders:
                parser.error("FIRST批次必须提供 --stations 和 --orders")
            result = importer.import_first_batch(
                stations_path=args.stations,
                orders_path=args.orders,
                batch_no=batch_no,
                operator=args.operator,
                remark=args.remark,
            )
        else:
            if not args.device_status:
                parser.error("SECOND批次必须提供 --device-status")
            result = importer.import_second_batch(
                device_status_path=args.device_status,
                batch_no=batch_no,
                compare_batch=args.compare_batch,
                operator=args.operator,
                remark=args.remark,
            )
        _print_result(result)
        return 0

    if args.command == "analyze":
        risk_types = [t.strip() for t in args.risk_types.split(",")]
        result = analyzer.analyze(
            risk_types=risk_types,
            station_code=args.station_code,
            batch_no=args.batch_no,
            offline_threshold_hours=args.offline_threshold_hours,
        )
        _print_result(result)
        return 0

    if args.command == "pledge":
        result = calculator.calculate_pledge(
            station_code=args.station_code,
            pledge_amount=args.pledge_amount,
            start_date=args.start_date,
            end_date=args.end_date,
            interest_rate=args.interest_rate,
            pledge_no=args.pledge_no,
            operator=args.operator,
        )
        _print_result(result)
        return 0

    if args.command == "report":
        result = report.generate_report(
            batch_no=args.batch_no,
            station_code=args.station_code,
            pledge_no=args.pledge_no,
            fmt=args.format,
            output_path=args.output,
        )
        print(result)
        return 0

    if args.command == "logs":
        from .risk_logger import RiskLogger
        logs = RiskLogger.get_logs(batch_no=args.batch_no, risk_type=args.risk_type)
        for log in logs[: args.limit]:
            print(f"[{log['created_at']}] {log['risk_type']:20s} {log['risk_level']:6s} {log['description']}")
        return 0

    return 1


def _print_result(result: dict) -> None:
    import json
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    sys.exit(main())
