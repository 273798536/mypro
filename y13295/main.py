#!/usr/bin/env python3
import sys
import os
from datetime import datetime
from typing import Optional

from models import FilterCriteria, MergeStatus
from data_loader import DataLoader
from merge_engine import PointMergeEngine
from output_generator import OutputGenerator
from status_tracker import StatusTracker


def run_pipeline(data_dir: str = "sample_data", output_dir: str = "output",
                 criteria: Optional[FilterCriteria] = None,
                 interactive: bool = True):
    print("=" * 60)
    print("口袋公园座椅点位归并 - 数据处理流水线")
    print("=" * 60)
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"数据目录: {os.path.abspath(data_dir)}")
    print(f"输出目录: {os.path.abspath(output_dir)}")
    print()

    print("[1/5] 加载多源数据...")
    loader = DataLoader()
    records = loader.load_all_from_directory(data_dir)
    print(f"  ✓ 共加载 {len(records)} 条原始记录")
    sources = {}
    for r in records:
        key = r.source.value
        sources[key] = sources.get(key, 0) + 1
    for src, cnt in sources.items():
        print(f"    - {src}: {cnt} 条")
    print()

    print("[2/5] 执行点位归并算法...")
    engine = PointMergeEngine()
    result = engine.merge(records, criteria)
    print(f"  ✓ 归并完成，生成 {len(result.merged_groups)} 个归并组")
    print(f"    - 已归并（多条记录）: {sum(1 for g in result.merged_groups if g.record_count > 1)} 组")
    print(f"    - 单点位记录: {sum(1 for g in result.merged_groups if g.record_count == 1)} 组")
    print(f"    - 存在重复投诉: {sum(1 for g in result.merged_groups if g.has_duplicate_complaints)} 组")
    print(f"    - 待补证据: {sum(1 for g in result.merged_groups if g.merge_status == MergeStatus.NEEDS_EVIDENCE)} 组")
    print()

    print("[3/5] 初始化状态跟踪...")
    tracker = StatusTracker(os.path.join(output_dir, "status_tracking.json"))
    todo = tracker.get_todo_summary(result)
    print(f"  ✓ 状态跟踪已就绪")
    print(f"    - 待处理: {todo['pending_count']} 组")
    print(f"    - 待补证据: {todo['needs_evidence_count']} 组")
    print(f"    - 已处理: {todo['completed_count']} 组")
    print(f"    - 完成率: {todo['completion_rate']}")
    print()

    print("[4/5] 生成统一输出文件...")
    generator = OutputGenerator(output_dir)
    outputs = generator.generate_all(result)

    filter_text = generator.generate_filter_criteria_text(result)
    stats_text = generator.generate_statistics_text(result)
    summary_text = generator.generate_summary_table_text(result)
    handler_text = generator.generate_handler_view_text(result)
    handoff_text = generator.generate_handoff_report(result)
    status_text = tracker.generate_status_report(result)

    generator.save_text_output("筛选条件.txt", filter_text)
    generator.save_text_output("统计数字.txt", stats_text)
    generator.save_text_output("明细表.txt", summary_text)
    generator.save_text_output("算法值班人视图.txt", handler_text)
    generator.save_text_output("交接报告_市政设计老曹.txt", handoff_text)
    generator.save_text_output("处理状态跟踪.txt", status_text)

    print("  ✓ 输出文件已生成:")
    for name, path in outputs.items():
        print(f"    - {name}: {os.path.basename(path)}")
    print("    - 筛选条件.txt")
    print("    - 统计数字.txt")
    print("    - 明细表.txt")
    print("    - 算法值班人视图.txt")
    print("    - 交接报告_市政设计老曹.txt")
    print("    - 处理状态跟踪.txt")
    print()

    print("[5/5] 打印关键结果摘要...")
    print()
    print("-" * 60)
    print("统计数字摘要:")
    print("-" * 60)
    for line in stats_text.split('\n')[2:]:
        print(line)
    print()

    if interactive:
        print()
        print("=" * 60)
        print("交互模式 - 状态管理")
        print("=" * 60)
        run_interactive_status_management(result, tracker, generator)

    print()
    print("=" * 60)
    print("处理完成！")
    print(f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"所有输出文件位于: {os.path.abspath(output_dir)}")
    print("=" * 60)

    return result, tracker, outputs


def run_interactive_status_management(result, tracker, generator):
    while True:
        print()
        print("请选择操作:")
        print("  1. 查看待处理归并组")
        print("  2. 查看待补证据归并组")
        print("  3. 查看已处理归并组")
        print("  4. 更新归并组状态")
        print("  5. 打印算法值班人视图")
        print("  6. 打印交接报告预览")
        print("  7. 查看处理状态跟踪")
        print("  0. 退出")
        print()
        choice = input("请输入选项 (0-7): ").strip()

        if choice == "0":
            break
        elif choice == "1":
            pending = tracker.get_pending_groups(result)
            print()
            print(f"待处理归并组（共 {len(pending)} 组）:")
            for g in pending:
                print(f"  {g.group_id} | {g.canonical_location} | {g.record_count}条记录")
        elif choice == "2":
            needs = tracker.get_needs_evidence_groups(result)
            print()
            print(f"待补证据归并组（共 {len(needs)} 组）:")
            for g in needs:
                print(f"  {g.group_id} | {g.canonical_location}")
                if g.next_step_hint:
                    print(f"    提示: {g.next_step_hint.split(chr(10))[0]}")
        elif choice == "3":
            done = tracker.get_completed_groups(result)
            print()
            print(f"已处理归并组（共 {len(done)} 组）:")
            for g in done:
                print(f"  {g.group_id} | {g.canonical_location} | {g.merge_status.value}")
        elif choice == "4":
            group_id = input("请输入归并组ID: ").strip()
            group = next((g for g in result.merged_groups if g.group_id == group_id), None)
            if not group:
                print(f"未找到归并组: {group_id}")
                continue
            print()
            print(f"归并组 {group_id} 当前状态: {group.merge_status.value}")
            print("可设置状态:")
            print("  1. 已归并")
            print("  2. 待补证据")
            print("  3. 已复核")
            print("  4. 不予归并")
            status_choice = input("请选择新状态 (1-4): ").strip()
            handler = input("处理人姓名 (可留空): ").strip()
            notes = input("处理备注 (可留空): ").strip()

            status_map = {
                "1": MergeStatus.MERGED,
                "2": MergeStatus.NEEDS_EVIDENCE,
                "3": MergeStatus.REVIEWED,
                "4": MergeStatus.REJECTED,
            }
            new_status = status_map.get(status_choice)
            if new_status:
                log = tracker.update_status(group, new_status, handler, notes)
                print(f"  ✓ 状态已更新: {log.old_status.value} → {log.new_status.value}")
            else:
                print("无效选项")
        elif choice == "5":
            print()
            print(generator.generate_handler_view_text(result))
        elif choice == "6":
            print()
            print(generator.generate_handoff_report(result)[:2000])
            if len(generator.generate_handoff_report(result)) > 2000:
                print("\n... (完整内容请查看输出文件)")
        elif choice == "7":
            print()
            print(tracker.generate_status_report(result))
        else:
            print("无效选项，请重新输入")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="口袋公园座椅点位归并工具")
    parser.add_argument("--data-dir", default="sample_data", help="输入数据目录")
    parser.add_argument("--output-dir", default="output", help="输出文件目录")
    parser.add_argument("--no-interactive", action="store_true", help="禁用交互模式")
    parser.add_argument("--start-date", help="筛选起始日期 (YYYY-MM-DD)")
    parser.add_argument("--end-date", help="筛选结束日期 (YYYY-MM-DD)")
    args = parser.parse_args()

    criteria = FilterCriteria()
    if args.start_date:
        try:
            criteria.start_date = datetime.strptime(args.start_date, "%Y-%m-%d")
        except ValueError:
            print(f"警告: 无效的起始日期格式: {args.start_date}")
    if args.end_date:
        try:
            criteria.end_date = datetime.strptime(args.end_date, "%Y-%m-%d")
        except ValueError:
            print(f"警告: 无效的结束日期格式: {args.end_date}")

    run_pipeline(
        data_dir=args.data_dir,
        output_dir=args.output_dir,
        criteria=criteria,
        interactive=not args.no_interactive
    )


if __name__ == "__main__":
    main()
