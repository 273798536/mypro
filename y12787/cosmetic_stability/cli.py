"""
CLI主程序
命令：init, import, list, check, calc, export, view, handle
"""
import argparse
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import List

from .config import Config
from .batch_manager import BatchManager
from .data_importer import DataImporter
from .anomaly_detector import AnomalyDetector
from .stability_calc import StabilityCalculator
from .exporter import Exporter
from .models import SampleStatus


def get_default_operator() -> str:
    """获取默认操作员"""
    return os.environ.get("STABILITY_OPERATOR", "系统管理员")


def init_workspace(args):
    """初始化工作目录"""
    work_dir = Path(args.work_dir).resolve()
    input_dir = work_dir / "data" / "input"
    output_dir = work_dir / "data" / "output"
    work_data_dir = work_dir / "data" / "work"

    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    work_data_dir.mkdir(parents=True, exist_ok=True)

    config = Config(str(work_dir))
    config.set("paths.input_dir", str(input_dir))
    config.set("paths.output_dir", str(output_dir))
    config.set("paths.work_dir", str(work_data_dir))
    config.save()

    print(f"✓ 工作目录已初始化: {work_dir}")
    print(f"  输入目录: {input_dir}")
    print(f"  输出目录: {output_dir}")
    print(f"  工作目录: {work_data_dir}")
    print()
    print("下一步操作：")
    print("  1. 将CSV数据文件放入输入目录")
    print("  2. 运行: stability import <文件名>")
    print("  3. 运行: stability check 检测异常")
    print("  4. 运行: stability calc 计算稳定性")
    print("  5. 运行: stability export 导出报告")


def import_data(args):
    """导入数据"""
    work_dir = Path(args.work_dir).resolve()
    config = Config(str(work_dir))
    batch_manager = BatchManager(str(work_dir / "data" / "work"))
    importer = DataImporter(config, batch_manager)

    operator = args.operator or get_default_operator()
    input_dir = Path(config.get("paths.input_dir", work_dir / "data" / "input"))

    file_path = Path(args.file)
    if not file_path.is_absolute():
        file_path = input_dir / file_path

    if not file_path.exists():
        print(f"✗ 文件不存在: {file_path}")
        sys.exit(1)

    print(f"正在导入文件: {file_path.name}")
    print(f"操作员: {operator}")
    print("-" * 50)

    try:
        results = importer.import_csv(str(file_path), operator)

        print(f"✓ 导入完成")
        print(f"  批次新增: {results['batches_added']}")
        print(f"  批次更新: {results['batches_updated']}")
        print(f"  考察点新增: {results['test_points_added']}")
        print(f"  考察点更新: {results['test_points_updated']}")
        print(f"  检验项新增: {results['test_items_added']}")
        print(f"  检验项更新: {results['test_items_updated']}")
        print()
        print("建议下一步：运行 'stability check' 检测数据异常")
    except Exception as e:
        print(f"✗ 导入失败: {e}")
        sys.exit(1)


def list_batches(args):
    """列出批次"""
    work_dir = Path(args.work_dir).resolve()
    work_data_dir = work_dir / "data" / "work"
    batch_manager = BatchManager(str(work_data_dir))

    batches = batch_manager.list_batches()

    if not batches:
        print("暂无批次数据")
        print("请先运行 'stability import' 导入数据")
        return

    print(f"共 {len(batches)} 个批次")
    print("-" * 80)
    print(f"{'批次号':<15} {'产品名称':<20} {'规格':<15} {'生产日期':<12} {'储存条件':<15} {'异常数':<8}")
    print("-" * 80)

    for batch in batches:
        anomalies = batch_manager.list_anomalies(batch_no=batch.batch_no)
        pending = sum(1 for a in anomalies if a.status == SampleStatus.PENDING)
        anomaly_display = f"{len(anomalies)}"
        if pending > 0:
            anomaly_display += f" ({pending}待处理)"
        if any(a.severity == "严重" for a in anomalies):
            anomaly_display = "⚠ " + anomaly_display

        print(f"{batch.batch_no:<15} {batch.product_name:<20} {batch.specification or '-':<15} "
              f"{batch.manufacture_date or '-':<12} {batch.storage_condition.value:<15} "
              f"{anomaly_display:<8}")

    print("-" * 80)
    print()
    print("查看详情：stability view <批次号>")
    print("查看异常：stability anomalies")


def check_anomalies(args):
    """检测异常"""
    work_dir = Path(args.work_dir).resolve()
    config = Config(str(work_dir))
    work_data_dir = work_dir / "data" / "work"
    batch_manager = BatchManager(str(work_data_dir))
    detector = AnomalyDetector(config, batch_manager)

    operator = args.operator or get_default_operator()

    if not batch_manager.ledger.batches:
        print("暂无批次数据，请先导入数据")
        return

    print("正在检测异常...")
    print("-" * 50)

    if args.batch:
        if args.batch not in batch_manager.ledger.batches:
            print(f"✗ 批次不存在: {args.batch}")
            sys.exit(1)
        results = {args.batch: detector.detect_batch_anomalies(args.batch, operator)}
    else:
        results = detector.detect_all_anomalies(operator)

    total_new = sum(len(v) for v in results.values())

    if total_new == 0:
        print("✓ 未发现新异常")
    else:
        print(f"✓ 检测完成，新增 {total_new} 条异常")
        print()

        for batch_no, anomalies in results.items():
            if anomalies:
                print(f"批次 {batch_no}: {len(anomalies)} 条")
                for a in anomalies:
                    sev_mark = "🔴" if a.severity == "严重" else "🟡"
                    print(f"  {sev_mark} [{a.anomaly_id}] {a.anomaly_type.value}: {a.description}")
                print()

    summary = detector.get_anomaly_summary()
    if summary["total"] > 0:
        print("=" * 50)
        print("异常汇总：")
        print(f"  总计: {summary['total']} 条")
        print(f"  待处理: {summary['pending_count']} 条")
        print(f"  严重: {summary['severe_count']} 条")
        print()
        for t, count in summary["by_type"].items():
            print(f"  {t}: {count} 条")

    batch_manager.save()
    print()
    print("查看所有异常：stability anomalies")
    print("处理异常：stability handle <异常ID>")


def list_anomalies(args):
    """列出异常"""
    work_dir = Path(args.work_dir).resolve()
    work_data_dir = work_dir / "data" / "work"
    batch_manager = BatchManager(str(work_data_dir))

    anomalies = batch_manager.list_anomalies(
        batch_no=args.batch,
        status=args.status
    )

    if not anomalies:
        print("暂无异常记录")
        return

    print(f"共 {len(anomalies)} 条异常记录")
    print("-" * 100)
    print(f"{'异常ID':<22} {'批次号':<12} {'类型':<14} {'严重程度':<8} {'状态':<8} {'描述'}")
    print("-" * 100)

    for a in anomalies:
        sev_mark = "🔴" if a.severity == "严重" else "🟡"
        status_mark = "⏳" if a.status == SampleStatus.PENDING else \
                      "✓" if a.status == SampleStatus.NORMAL else \
                      "✗" if a.status == SampleStatus.INVALID else " "
        print(f"{a.anomaly_id:<22} {a.batch_no:<12} {a.anomaly_type.value:<14} "
              f"{sev_mark} {a.severity:<5} {status_mark} {a.status.value:<6} {a.description[:40]}...")

    print("-" * 100)
    print()
    print("查看异常详情：stability view -a <异常ID>")
    print("处理异常：stability handle <异常ID>")


def calculate_stability(args):
    """计算稳定性"""
    work_dir = Path(args.work_dir).resolve()
    config = Config(str(work_dir))
    work_data_dir = work_dir / "data" / "work"
    batch_manager = BatchManager(str(work_data_dir))
    calculator = StabilityCalculator(config, batch_manager)

    operator = args.operator or get_default_operator()

    if not batch_manager.ledger.batches:
        print("暂无批次数据，请先导入数据")
        return

    print("正在计算稳定性...")
    print("-" * 50)

    if args.batch:
        if args.batch not in batch_manager.ledger.batches:
            print(f"✗ 批次不存在: {args.batch}")
            sys.exit(1)
        results = calculator.calculate_batch_stability(args.batch, operator)
        all_results = {args.batch: results}
    else:
        all_results = calculator.calculate_all_batches(operator)

    total = sum(len(v) for v in all_results.values())
    conforming = sum(1 for v in all_results.values() for r in v if r.is_conforming)

    print(f"✓ 计算完成，共 {total} 项")
    print(f"  符合: {conforming} 项")
    print(f"  不符合: {total - conforming} 项")
    print()

    for batch_no, results in all_results.items():
        if results:
            print(f"批次 {batch_no}:")
            for r in results:
                status = "✓" if r.is_conforming else "✗"
                expiry = r.expiry_estimate or "数据不足"
                print(f"  {status} {r.item_name}: 变化率 {r.degradation_rate:.2f}%, 有效期估算: {expiry}")
                if r.remarks:
                    print(f"    备注: {r.remarks}")
            print()

    batch_manager.save()
    print("导出报告：stability export")


def export_results(args):
    """导出结果"""
    work_dir = Path(args.work_dir).resolve()
    config = Config(str(work_dir))
    work_data_dir = work_dir / "data" / "work"
    output_dir = Path(config.get("paths.output_dir", work_dir / "data" / "output"))
    batch_manager = BatchManager(str(work_data_dir))
    exporter = Exporter(config, batch_manager)

    if args.batch and args.batch not in batch_manager.ledger.batches:
        print(f"✗ 批次不存在: {args.batch}")
        sys.exit(1)

    if not batch_manager.ledger.batches:
        print("暂无数据可导出")
        return

    fmt = args.format or config.get("export.format", "html")

    print(f"正在导出 {fmt.upper()} 报告...")
    print(f"输出目录: {output_dir}")
    print("-" * 50)

    try:
        if fmt == "html":
            file_path = exporter.export_html(str(output_dir), batch_no=args.batch)
            print(f"✓ HTML报告已导出: {file_path}")
        elif fmt == "csv":
            files = exporter.export_csv(str(output_dir), batch_no=args.batch)
            print(f"✓ CSV报告已导出，共 {len(files)} 个文件:")
            for f in files:
                print(f"  - {Path(f).name}")
        else:
            print(f"✗ 不支持的格式: {fmt}")
            sys.exit(1)

        print()
        print("报告包含内容：")
        print("  • 批次基本信息")
        print("  • 考察时间点记录")
        print("  • 检验结果数据")
        print("  • 稳定性计算结果")
        print("  • 异常记录及通俗解释")
        print("  • 处理记录追溯链")
        print("  • 术语解释")

        if fmt == "html":
            print()
            print("💡 HTML报告可直接用浏览器打开查看")
    except Exception as e:
        print(f"✗ 导出失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def view_details(args):
    """查看详情"""
    work_dir = Path(args.work_dir).resolve()
    work_data_dir = work_dir / "data" / "work"
    batch_manager = BatchManager(str(work_data_dir))

    if args.anomaly:
        trace = batch_manager.get_anomaly_trace(args.anomaly)
        if not trace:
            print(f"✗ 异常不存在: {args.anomaly}")
            sys.exit(1)

        anomaly = trace["anomaly"]
        print("=" * 60)
        print("异常详情 - 追溯链")
        print("=" * 60)
        print()
        print("【异常信息】")
        print(f"  异常ID:     {anomaly.anomaly_id}")
        print(f"  所属批次:   {anomaly.batch_no}")
        print(f"  异常类型:   {anomaly.anomaly_type.value}")
        print(f"  严重程度:   {anomaly.severity}")
        print(f"  当前状态:   {anomaly.status.value}")
        print(f"  描述:       {anomaly.description}")
        print(f"  位置:       {anomaly.location}")
        print(f"  检测时间:   {anomaly.detected_time.strftime('%Y-%m-%d %H:%M:%S')}")
        if anomaly.handling_opinion:
            print(f"  处理意见:   {anomaly.handling_opinion}")
            print(f"  处理人:     {anomaly.handler}")
            print(f"  处理时间:   {anomaly.handle_time.strftime('%Y-%m-%d %H:%M:%S') if anomaly.handle_time else '-'}")
        print()

        if anomaly.related_data:
            print("【相关数据】")
            for k, v in anomaly.related_data.items():
                if k == "explanation":
                    print(f"  通俗解释:   {v}")
                elif k == "warning":
                    print(f"  ⚠ 重要提示:  {v}")
                elif k != "_linked_anomalies":
                    print(f"  {k}: {v}")
            print()

        if trace["processing_record"]:
            pr = trace["processing_record"]
            print("【关联处理记录】")
            print(f"  记录ID:     {pr.record_id}")
            print(f"  操作类型:   {pr.action}")
            print(f"  操作人:     {pr.operator}")
            print(f"  时间:       {pr.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"  输入文件:   {', '.join(pr.input_files) if pr.input_files else '-'}")
            print(f"  输出文件:   {', '.join(pr.output_files) if pr.output_files else '-'}")
            print(f"  备注:       {pr.remarks or '-'}")
            print()

        if trace["batch"]:
            batch = trace["batch"]
            print("【所属批次】")
            print(f"  批次号:     {batch.batch_no}")
            print(f"  产品名称:   {batch.product_name}")
            print(f"  规格:       {batch.specification or '-'}")
            print(f"  生产日期:   {batch.manufacture_date or '-'}")
            print()

        print("【该批次所有处理记录】")
        for pr in trace["all_records_for_batch"]:
            action_icon = "📝" if "录入" in pr.action else \
                         "✏️" if "更新" in pr.action else \
                         "⚠️" if "异常" in pr.action else \
                         "🔍" if "计算" in pr.action else "📋"
            linked = f", 关联异常: {', '.join(pr.anomaly_ids)}" if pr.anomaly_ids else ""
            print(f"  {action_icon} [{pr.timestamp.strftime('%Y-%m-%d %H:%M')}] {pr.action} - {pr.operator}{linked}")
            if pr.remarks:
                print(f"     备注: {pr.remarks}")

        print()
        print("=" * 60)
        print("追溯验证: ✓ 可从异常 → 处理记录 → 批次完整回溯")
        print("处理异常: stability handle " + anomaly.anomaly_id)
        return

    if args.batch:
        trace = batch_manager.get_batch_trace(args.batch)
        if not trace:
            print(f"✗ 批次不存在: {args.batch}")
            sys.exit(1)

        batch = trace["batch"]
        print("=" * 60)
        print(f"批次详情 - {batch.batch_no}")
        print("=" * 60)
        print()
        print("【基本信息】")
        print(f"  产品名称:   {batch.product_name}")
        print(f"  产品代码:   {batch.product_code or '-'}")
        print(f"  规格:       {batch.specification or '-'}")
        print(f"  生产日期:   {batch.manufacture_date or '-'}")
        print(f"  拟有效期:   {batch.expiry_date_candidate or '-'}")
        print(f"  生产厂家:   {batch.manufacturer or '-'}")
        print(f"  储存条件:   {batch.storage_condition.value}")
        print(f"  检验员:     {batch.inspector or '-'}")
        print(f"  备注:       {batch.remarks or '-'}")
        print()

        if trace["test_points"]:
            print("【考察时间点】")
            print(f"  {'时间点':<8} {'检验日期':<12} {'温度':<8} {'湿度':<8} {'类型':<10} {'记录时间':<16} {'检验员'}")
            print("  " + "-" * 70)
            for tp in trace["test_points"]:
                tp_type = "空白对照" if tp.is_blank_control else "供试品"
                record_time = tp.record_time.strftime('%Y-%m-%d %H:%M') if tp.record_time else "⚠ 未记录"
                print(f"  {tp.time_point:<8} {tp.test_date or '-':<12} "
                      f"{tp.temperature if tp.temperature else '-':<8} "
                      f"{tp.humidity if tp.humidity else '-':<8} "
                      f"{tp_type:<10} {record_time:<16} {tp.operator or '-'}")
            print()

        if trace["test_items"]:
            print("【检验结果】")
            print(f"  {'时间点':<8} {'项目':<10} {'测定值':<12} {'单位':<8} {'标准':<12} {'判定':<8} {'检验日期':<12} {'补录'}")
            print("  " + "-" * 80)
            for ti in trace["test_items"]:
                qual = "✓合格" if ti.is_qualified else "✗不合格" if ti.is_qualified is False else "-"
                value = f"{ti.measured_value:.4f}" if ti.measured_value is not None else "-"
                suppl = "是" if ti.supplementary_note else "否"
                print(f"  {ti.time_point:<8} {ti.item_name:<10} {value:<12} "
                      f"{ti.unit or '-':<8} {ti.specification or '-':<12} "
                      f"{qual:<8} {ti.inspection_date or '-':<12} {suppl}")
            print()

        if trace["stability_results"]:
            print("【稳定性计算结果】")
            print(f"  {'项目':<10} {'初始值':<10} {'终值':<10} {'变化率(%)':<12} {'半衰期':<10} {'有效期估算':<14} {'符合性':<8} {'计算方法'}")
            print("  " + "-" * 80)
            for sr in trace["stability_results"]:
                conf = "✓符合" if sr.is_conforming else "✗不符合"
                half_life = f"{sr.half_life:.2f}" if sr.half_life else "-"
                expiry = sr.expiry_estimate or "-"
                print(f"  {sr.item_name:<10} {sr.initial_value:<10.4f} {sr.final_value:<10.4f} "
                      f"{sr.degradation_rate:<12.2f} {half_life:<10} {expiry:<14} "
                      f"{conf:<8} {sr.calculation_method}")
            print()

        if trace["anomalies"]:
            print("【异常记录】")
            for a in trace["anomalies"]:
                sev = "🔴" if a.severity == "严重" else "🟡"
                status = "⏳待处理" if a.status == SampleStatus.PENDING else \
                         "✓已处理" if a.status == SampleStatus.NORMAL else "✗已作废"
                print(f"  {sev} [{a.anomaly_id}] {a.anomaly_type.value} - {a.description}")
                print(f"     位置: {a.location} | {status}")
                if a.handling_opinion:
                    print(f"     处理: {a.handling_opinion}")
            print()

        if trace["processing_records"]:
            print("【处理记录追溯链】")
            for pr in sorted(trace["processing_records"], key=lambda x: x.timestamp):
                action_icon = "📝" if "录入" in pr.action else \
                             "✏️" if "更新" in pr.action else \
                             "⚠️" if "异常" in pr.action else \
                             "🔍" if "计算" in pr.action else "📋"
                linked = f", 关联异常: {', '.join(pr.anomaly_ids)}" if pr.anomaly_ids else ""
                print(f"  {action_icon} [{pr.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] "
                      f"{pr.action} - {pr.operator}{linked}")
                if pr.remarks:
                    print(f"     备注: {pr.remarks}")
                if pr.input_files:
                    print(f"     输入: {', '.join(pr.input_files)}")

        print()
        print("=" * 60)
        return

    print("请指定要查看的批次或异常")
    print("  查看批次: stability view <批次号>")
    print("  查看异常: stability view -a <异常ID>")


def handle_anomaly(args):
    """处理异常"""
    work_dir = Path(args.work_dir).resolve()
    work_data_dir = work_dir / "data" / "work"
    batch_manager = BatchManager(str(work_data_dir))

    anomaly = None
    for a in batch_manager.ledger.anomalies:
        if a.anomaly_id == args.anomaly_id:
            anomaly = a
            break

    if not anomaly:
        print(f"✗ 异常不存在: {args.anomaly_id}")
        sys.exit(1)

    print("=" * 60)
    print("异常信息")
    print("=" * 60)
    print(f"  异常ID:     {anomaly.anomaly_id}")
    print(f"  批次号:     {anomaly.batch_no}")
    print(f"  异常类型:   {anomaly.anomaly_type.value}")
    print(f"  严重程度:   {anomaly.severity}")
    print(f"  当前状态:   {anomaly.status.value}")
    print(f"  描述:       {anomaly.description}")
    print()

    if anomaly.related_data.get("explanation"):
        print(f"  💡 通俗解释: {anomaly.related_data['explanation']}")
    if anomaly.related_data.get("warning"):
        print(f"  ⚠ 重要提示: {anomaly.related_data['warning']}")
    print()

    if not args.opinion:
        args.opinion = input("请输入处理意见: ").strip()

    if not args.status:
        print()
        print("请选择新状态:")
        print("  1. 正常 - 数据经复核无误")
        print("  2. 已作废 - 数据无效")
        print("  3. 待复核 - 需要进一步核实")
        choice = input("请选择 [1]: ").strip() or "1"
        status_map = {"1": SampleStatus.NORMAL, "2": SampleStatus.INVALID, "3": SampleStatus.PENDING}
        args.status = status_map.get(choice, SampleStatus.NORMAL).value

    operator = args.operator or get_default_operator()

    updated = batch_manager.update_anomaly_handling(
        anomaly_id=args.anomaly_id,
        handling_opinion=args.opinion,
        handler=operator,
        status=args.status
    )

    if updated:
        batch_manager.save()
        print()
        print("✓ 异常已处理")
        print(f"  新状态:   {updated.status.value}")
        print(f"  处理意见: {updated.handling_opinion}")
        print(f"  处理人:   {updated.handler}")
        print(f"  处理时间: {updated.handle_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        print("验证追溯：stability view -a " + anomaly.anomaly_id)
    else:
        print("✗ 处理失败")


def main():
    parser = argparse.ArgumentParser(
        prog="stability",
        description="化妆品稳定性台账系统 v1.0.0",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  stability init                        # 初始化工作目录
  stability import batch_data.csv       # 导入数据
  stability list                        # 列出所有批次
  stability check                       # 检测所有异常
  stability check -b 20240101           # 检测指定批次异常
  stability anomalies                   # 列出所有异常
  stability calc                        # 计算所有批次稳定性
  stability export                      # 导出HTML报告
  stability export -f csv               # 导出CSV报告
  stability view 20240101               # 查看批次详情
  stability view -a ANOM-20240610-0001  # 查看异常详情及追溯链
  stability handle ANOM-20240610-0001   # 处理异常
        """
    )

    parser.add_argument("-w", "--work-dir", default=".",
                        help="工作目录 (默认: 当前目录)")

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    init_parser = subparsers.add_parser("init", help="初始化工作目录")
    init_parser.set_defaults(func=init_workspace)

    import_parser = subparsers.add_parser("import", help="导入数据文件")
    import_parser.add_argument("file", help="数据文件名 (CSV格式)")
    import_parser.add_argument("-o", "--operator", help="操作员")
    import_parser.set_defaults(func=import_data)

    list_parser = subparsers.add_parser("list", help="列出所有批次")
    list_parser.set_defaults(func=list_batches)

    check_parser = subparsers.add_parser("check", help="检测数据异常")
    check_parser.add_argument("-b", "--batch", help="指定批次号")
    check_parser.add_argument("-o", "--operator", help="操作员")
    check_parser.set_defaults(func=check_anomalies)

    anomalies_parser = subparsers.add_parser("anomalies", help="列出异常记录")
    anomalies_parser.add_argument("-b", "--batch", help="按批次筛选")
    anomalies_parser.add_argument("-s", "--status", choices=["正常", "异常", "待复核", "已作废"],
                                  help="按状态筛选")
    anomalies_parser.set_defaults(func=list_anomalies)

    calc_parser = subparsers.add_parser("calc", help="计算稳定性")
    calc_parser.add_argument("-b", "--batch", help="指定批次号")
    calc_parser.add_argument("-o", "--operator", help="操作员")
    calc_parser.set_defaults(func=calculate_stability)

    export_parser = subparsers.add_parser("export", help="导出结果报告")
    export_parser.add_argument("-b", "--batch", help="指定批次号")
    export_parser.add_argument("-f", "--format", choices=["html", "csv"], help="导出格式")
    export_parser.set_defaults(func=export_results)

    view_parser = subparsers.add_parser("view", help="查看详情")
    view_parser.add_argument("batch", nargs="?", help="批次号")
    view_parser.add_argument("-a", "--anomaly", help="异常ID (查看异常详情)")
    view_parser.set_defaults(func=view_details)

    handle_parser = subparsers.add_parser("handle", help="处理异常")
    handle_parser.add_argument("anomaly_id", help="异常ID")
    handle_parser.add_argument("-m", "--opinion", help="处理意见")
    handle_parser.add_argument("-s", "--status", choices=["正常", "异常", "待复核", "已作废"],
                               help="新状态")
    handle_parser.add_argument("-o", "--operator", help="操作员")
    handle_parser.set_defaults(func=handle_anomaly)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
