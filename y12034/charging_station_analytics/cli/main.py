"""
充电站分时电价收益分析系统 - 命令行工具

功能：
1. analyze  - 分析充电订单文件并生成完整报告
2. summary  - 显示分析摘要统计
3. filter   - 按异常类型筛选订单（跨时段/优惠叠加/设备离线等）
4. trace    - 追溯单条订单的完整处理链路
5. report   - 生成 Excel 报告文件
6. web      - 启动 Web 可视化界面
"""
import argparse
import sys
import json
from pathlib import Path
from typing import Optional
import pandas as pd

from ..config.settings import get_config, OUTPUT_DIR, EXAMPLES_DIR
from ..core.pipeline import AnalysisPipeline, AnalysisResult
from ..core.report_generator import ReportGenerator


def _ensure_dirs():
    """确保必要目录存在"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    EXAMPLES_DIR.mkdir(parents=True, exist_ok=True)


def _load_or_analyze(file_path: str, sheet_name: Optional[str] = None) -> AnalysisResult:
    """加载或运行分析"""
    pipeline = AnalysisPipeline()
    return pipeline.run(file_path, sheet_name)


def cmd_analyze(args):
    """分析充电订单文件"""
    _ensure_dirs()
    
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"错误: 文件不存在 - {file_path}")
        sys.exit(1)
    
    print(f"\n{'='*60}")
    print("充电站分时电价收益分析系统")
    print(f"{'='*60}\n")
    print(f"开始分析文件: {file_path.name}")
    print(f"文件路径: {file_path}")
    
    try:
        result = _load_or_analyze(str(file_path), args.sheet)
        print("✓ 分析完成\n")
        
        summary = result.summary
        dq = summary["data_quality"]
        ds = summary["device_status"]
        rev = summary["revenue"]
        anom = summary["anomalies"]
        
        print(f"{'📊 数据质量':-<50}")
        print(f"  总行数:     {dq['total_rows']}")
        print(f"  有效行数:   {dq['valid_rows']}")
        print(f"  坏行:       {dq['bad_rows']}")
        print(f"  空行:       {dq['empty_rows']}")
        print(f"  备注行:     {dq['remark_rows']}")
        print(f"  质量得分:   {dq['data_quality_score']:.1f}%")
        if dq["missing_columns"]:
            print(f"  缺失列:     {', '.join(dq['missing_columns'])}")
        
        print(f"\n{'🔌 设备状态':-<50}")
        print(f"  在线订单:   {ds['normal_orders']}")
        print(f"  离线订单:   {ds['offline_orders']} (已隔离)")
        print(f"  离线设备:   {ds['offline_devices_count']}台")
        print(f"  故障设备:   {ds['fault_devices_count']}台")
        
        print(f"\n{'💰 收益拆分':-<50}")
        print(f"  电费:       ¥{rev['total_electricity_fee']:.2f}")
        print(f"  服务费:     ¥{rev['total_service_fee']:.2f}")
        print(f"  优惠券:    -¥{rev['total_coupon_discount']:.2f}")
        print(f"  {'─'*30}")
        print(f"  净收益:     ¥{rev['net_revenue']:.2f}")
        
        print(f"\n{'⚠️  异常统计':-<50}")
        for level, count in anom.get("by_level", {}).items():
            if count > 0:
                print(f"  {level}: {count}条")
        
        if anom.get("total", 0) > 0:
            print(f"\n{'🔍 需要复核':-<50}")
            print(f"  跨时段充电: {summary['cross_period']['count']}条")
            print(f"  优惠叠加:   {summary['stacked_coupon']['count']}条")
            print(f"  设备离线:   {ds['offline_orders']}条")
        
        if args.export_report:
            cmd_report(args, result)
        
        print(f"\n{'='*60}")
        print(f"分析完成时间: {result.analysis_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")
        
        return result
        
    except Exception as e:
        print(f"✗ 分析失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def cmd_summary(args):
    """显示分析摘要"""
    result = cmd_analyze(args)
    
    if args.json:
        print(json.dumps(result.summary, ensure_ascii=False, indent=2))
    
    if args.export_json:
        out_path = OUTPUT_DIR / f"{Path(args.file).stem}_summary.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result.summary, f, ensure_ascii=False, indent=2)
        print(f"✓ 摘要已导出: {out_path}")


def cmd_filter(args):
    """按异常类型筛选订单"""
    result = _load_or_analyze(args.file, args.sheet)
    pipeline = AnalysisPipeline()
    
    anomaly_type_map = {
        "cross_period": "跨时段充电",
        "stacked_coupon": "优惠叠加",
        "offline_device": "设备离线",
        "manual_supplement": "人工补录",
        "needs_review": "需要复核",
    }
    
    df = pipeline.filter_by_anomaly_type(result, args.type)
    
    if df.empty:
        print(f"没有找到 '{anomaly_type_map.get(args.type, args.type)}' 类型的订单")
        return
    
    print(f"\n{'='*60}")
    print(f"筛选结果: {anomaly_type_map.get(args.type, args.type)} ({len(df)}条)")
    print(f"{'='*60}\n")
    
    display_cols = [
        "order_id", "start_time", "end_time", "charged_energy",
        "calculated_electricity_fee", "calculated_service_fee",
        "original_coupon_amount", "net_revenue", "is_device_offline"
    ]
    
    if args.type == "cross_period":
        display_cols.insert(3, "is_cross_period")
    if args.type == "stacked_coupon":
        display_cols.insert(4, "is_coupon_stacked")
    
    available_cols = [c for c in display_cols if c in df.columns]
    print(df[available_cols].to_string(index=False))
    
    if args.export_csv:
        out_path = OUTPUT_DIR / f"{Path(args.file).stem}_{args.type}.csv"
        df.to_csv(out_path, index=False, encoding="utf-8-sig")
        print(f"\n✓ 已导出: {out_path}")


def cmd_trace(args):
    """追溯单条订单的完整处理链路"""
    result = _load_or_analyze(args.file, args.sheet)
    pipeline = AnalysisPipeline()
    
    trace = pipeline.get_order_trace(result, args.order_id)
    
    if not trace:
        print(f"错误: 未找到订单 '{args.order_id}'")
        sys.exit(1)
    
    print(f"\n{'='*60}")
    print(f"订单追溯详情")
    print(f"{'='*60}\n")
    
    print(f"📌 基本信息")
    print(f"  订单编号: {trace['order_id']}")
    print(f"  追溯ID:   {trace['trace_id']}")
    print(f"  源文件:   {trace['source_file']}")
    print(f"  原始行号: {trace['original_row']}\n")
    
    step_names = ["数据读取", "分时电价计算", "服务费计算", "优惠券处理", "设备状态处理"]
    print(f"🔗 处理步骤链路")
    for i, step in enumerate(trace["processing_steps"], 1):
        step_name = step.get("step", step.get("step_name", step_names[i-1] if i-1 < len(step_names) else f"步骤{i}"))
        print(f"  [{i}] ✓ {step_name}")
        if "description" in step:
            print(f"      {step['description']}")
        if "details" in step and args.verbose:
            for k, v in step["details"].items():
                if isinstance(v, float):
                    print(f"      {k}: {v:.4f}")
                elif isinstance(v, dict):
                    print(f"      {k}:")
                    for dk, dv in v.items():
                        if isinstance(dv, float):
                            print(f"        {dk}: {dv:.4f}")
                        else:
                            print(f"        {dk}: {dv}")
                else:
                    print(f"      {k}: {v}")
    
    print(f"\n📋 最终结果")
    final = trace["final_result"]
    
    if isinstance(final, dict) and "revenue_breakdown" in final:
        rb = final["revenue_breakdown"]
        flags = final.get("flags", {})
        print(f"  充电量:     {final.get('energy', 'N/A')} kWh")
        print(f"  电费:       ¥{rb.get('electricity_fee', 0):.2f}")
        print(f"  服务费:     ¥{rb.get('service_fee', 0):.2f}")
        print(f"  优惠券:    -¥{rb.get('coupon_discount', 0):.2f}")
        print(f"  净收益:     ¥{rb.get('net_revenue', 0):.2f}")
        print(f"  设备状态:   {'离线' if flags.get('is_device_offline') else '在线'}")
        print(f"  跨时段:     {'是' if flags.get('is_cross_period') else '否'}")
        print(f"  优惠叠加:   {'是' if flags.get('is_coupon_stacked') else '否'}")
        print(f"  人工补录:   {'是' if flags.get('is_manual_supplement') else '否'}")
        
        if args.verbose and "period_breakdown" in final:
            print(f"\n  时段拆分明细:")
            pb = final["period_breakdown"]
            period_names = {"peak": "尖峰", "high": "高峰", "flat": "平段", "valley": "低谷"}
            for pkey, pname in period_names.items():
                pdata = pb.get(pkey, {})
                if pdata.get("energy", 0) > 0:
                    print(f"    {pname}: 电量{pdata.get('energy', 0):.2f}kWh, "
                          f"电费¥{pdata.get('electricity_fee', 0):.2f}, "
                          f"服务费¥{pdata.get('service_fee', 0):.2f}")
    else:
        print(f"  充电量:     {final.get('charged_energy', 'N/A')} kWh")
        print(f"  电费:       ¥{final.get('calculated_electricity_fee', 0):.2f}")
        print(f"  服务费:     ¥{final.get('calculated_service_fee', 0):.2f}")
        print(f"  优惠券:    -¥{final.get('original_coupon_amount', 0):.2f}")
        print(f"  净收益:     ¥{final.get('net_revenue', 0):.2f}")
        print(f"  设备状态:   {'离线' if final.get('is_device_offline') else '在线'}")
        print(f"  跨时段:     {'是' if final.get('is_cross_period') else '否'}")
        print(f"  优惠叠加:   {'是' if final.get('is_coupon_stacked') else '否'}")
    
    if trace["anomalies"]:
        print(f"\n⚠️  异常标记")
        for anom in trace["anomalies"]:
            if isinstance(anom, dict):
                level = anom.get("level", "")
                atype = anom.get("type", "")
                desc = anom.get("description", "")
                print(f"  [{level}] {atype}: {desc}")
            else:
                print(f"  • {anom}")
    
    if trace["needs_review"]:
        print(f"\n🔴 需要复核: {trace['review_reason']}")
    
    if args.export_json:
        out_path = OUTPUT_DIR / f"trace_{args.order_id}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(trace, f, ensure_ascii=False, indent=2, default=str)
        print(f"\n✓ 追溯信息已导出: {out_path}")
    
    print()


def cmd_report(args, result: Optional[AnalysisResult] = None):
    """生成 Excel 报告"""
    _ensure_dirs()
    
    if result is None:
        result = _load_or_analyze(args.file, args.sheet)
    
    output_file = Path(args.output) if args.output else OUTPUT_DIR / f"{Path(args.file).stem}_分析报告.xlsx"
    
    generator = ReportGenerator()
    report_path = generator.generate_excel_report(result, str(output_file))
    
    print(f"\n📄 报告已生成: {report_path}")
    
    if args.open_report:
        import subprocess
        import platform
        try:
            if platform.system() == "Darwin":
                subprocess.run(["open", report_path])
            elif platform.system() == "Windows":
                subprocess.run(["start", report_path], shell=True)
            else:
                subprocess.run(["xdg-open", report_path])
        except Exception as e:
            print(f"提示: 无法自动打开文件 - {e}")
    
    return report_path


def cmd_web(args):
    """启动 Web 可视化界面"""
    from ..web.app import app
    
    print(f"\n🌐 启动 Web 服务...")
    print(f"   访问地址: http://{args.host}:{args.port}")
    print(f"   按 Ctrl+C 停止服务\n")
    
    app.run(host=args.host, port=args.port, debug=args.debug)


def main():
    """主入口"""
    parser = argparse.ArgumentParser(
        description="充电站分时电价收益分析系统",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 分析文件并显示摘要
  python -m charging_station_analytics.cli.main analyze data/orders.xlsx
  
  # 分析并生成报告
  python -m charging_station_analytics.cli.main analyze data/orders.xlsx --export-report
  
  # 筛选跨时段充电订单
  python -m charging_station_analytics.cli.main filter data/orders.xlsx --type cross_period
  
  # 追溯单条订单
  python -m charging_station_analytics.cli.main trace data/orders.xlsx --order-id ORD001 -v
  
  # 生成Excel报告
  python -m charging_station_analytics.cli.main report data/orders.xlsx -o output/report.xlsx
  
  # 启动Web界面
  python -m charging_station_analytics.cli.main web --port 8000
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    analyze_parser = subparsers.add_parser("analyze", help="分析充电订单文件")
    analyze_parser.add_argument("file", help="输入文件路径 (.xlsx, .xls, .csv)")
    analyze_parser.add_argument("--sheet", help="Excel工作表名称")
    analyze_parser.add_argument("--export-report", action="store_true", help="分析后导出Excel报告")
    analyze_parser.set_defaults(func=cmd_analyze)
    
    summary_parser = subparsers.add_parser("summary", help="显示分析摘要")
    summary_parser.add_argument("file", help="输入文件路径")
    summary_parser.add_argument("--sheet", help="Excel工作表名称")
    summary_parser.add_argument("--json", action="store_true", help="以JSON格式输出")
    summary_parser.add_argument("--export-json", action="store_true", help="导出JSON到文件")
    summary_parser.set_defaults(func=cmd_summary)
    
    filter_parser = subparsers.add_parser("filter", help="按异常类型筛选订单")
    filter_parser.add_argument("file", help="输入文件路径")
    filter_parser.add_argument("--sheet", help="Excel工作表名称")
    filter_parser.add_argument(
        "--type", 
        required=True,
        choices=["cross_period", "stacked_coupon", "offline_device", "manual_supplement", "needs_review"],
        help="异常类型: cross_period(跨时段), stacked_coupon(优惠叠加), offline_device(设备离线), manual_supplement(人工补录), needs_review(需要复核)"
    )
    filter_parser.add_argument("--export-csv", action="store_true", help="导出为CSV")
    filter_parser.set_defaults(func=cmd_filter)
    
    trace_parser = subparsers.add_parser("trace", help="追溯单条订单处理链路")
    trace_parser.add_argument("file", help="输入文件路径")
    trace_parser.add_argument("--sheet", help="Excel工作表名称")
    trace_parser.add_argument("--order-id", required=True, help="订单编号")
    trace_parser.add_argument("-v", "--verbose", action="store_true", help="显示详细处理步骤")
    trace_parser.add_argument("--export-json", action="store_true", help="导出追溯信息为JSON")
    trace_parser.set_defaults(func=cmd_trace)
    
    report_parser = subparsers.add_parser("report", help="生成Excel报告")
    report_parser.add_argument("file", help="输入文件路径")
    report_parser.add_argument("--sheet", help="Excel工作表名称")
    report_parser.add_argument("-o", "--output", help="输出文件路径")
    report_parser.add_argument("--open-report", action="store_true", help="生成后自动打开")
    report_parser.set_defaults(func=cmd_report)
    
    web_parser = subparsers.add_parser("web", help="启动Web可视化界面")
    web_parser.add_argument("--host", default="127.0.0.1", help="监听地址 (默认: 127.0.0.1)")
    web_parser.add_argument("--port", type=int, default=5000, help="监听端口 (默认: 5000)")
    web_parser.add_argument("--debug", action="store_true", help="调试模式")
    web_parser.set_defaults(func=cmd_web)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(0)
    
    args.func(args)


if __name__ == "__main__":
    main()
