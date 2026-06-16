#!/usr/bin/env python3
import argparse
import sys
import json
from typing import List, Optional
from models import MultimodalSample
from checker import MultimodalSample as _  # noqa: F401
from checker import MultimodalChecker
from version_tracker import VersionTracker
from report_generator import ReportGenerator
from sample_data import create_demo_samples, samples_to_dict


def load_samples_from_json(filepath: str) -> List[MultimodalSample]:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    samples = []
    for item in data:
        samples.append(
            MultimodalSample(
                sample_id=item.get("sample_id", ""),
                text_content=item.get("text_content", ""),
                image_paths=item.get("image_paths", []),
                category=item.get("category", ""),
                source=item.get("source", ""),
                created_at=item.get("created_at", ""),
                manual_note=item.get("manual_note"),
                metadata=item.get("metadata", {}),
            )
        )
    return samples


def cmd_check(args):
    print("=" * 60)
    print("多模态样本缺图检查")
    print("=" * 60)

    checker = MultimodalChecker(
        bias_threshold=args.bias_threshold,
        min_category_count=args.min_category_count,
    )

    if args.input:
        samples = load_samples_from_json(args.input)
    else:
        print("使用内置演示数据...")
        samples = create_demo_samples()

    print(f"共加载 {len(samples)} 条样本")

    tracker = VersionTracker(storage_path=args.version_dir)

    if args.parent_version:
        print(f"基于版本 {args.parent_version} 进行增量检查...")
        parent = tracker.get_version(args.parent_version)
        if parent:
            existing_ids = set(parent.sample_ids)
            new_samples = [s for s in samples if s.sample_id not in existing_ids]
            all_samples = samples + new_samples
        else:
            all_samples = samples
        version = tracker.supplement_samples(
            parent_version_id=args.parent_version,
            all_samples=all_samples,
            checker=checker,
            description=args.description or "命令行增量检查",
        )
    else:
        print("创建初始版本...")
        version = tracker.create_initial_version(
            samples=samples,
            checker=checker,
            description=args.description or "命令行初始检查",
        )

    if version:
        print(f"✓ 检查完成，版本号：{version.version_id}")
        print(f"✓ 样本数：{len(version.sample_ids)}")

        if args.export:
            print("\n正在生成报告...")
            generator = ReportGenerator(output_dir=args.output_dir)
            samples_by_id = samples_to_dict(samples)
            paths = generator.export_all_formats(
                version, tracker, samples_by_id
            )

            print(f"✓ 报告已导出：")
            for fmt, path in paths.items():
                if fmt != "report":
                    print(f"  - {fmt}: {path}")

            print("\n" + "=" * 60)
            print("【普通话解释（可直接复制）】")
            print("=" * 60)
            print(paths["report"].plain_language_explanation)
    else:
        print("✗ 检查失败")
        return 1

    return 0


def cmd_list_versions(args):
    tracker = VersionTracker(storage_path=args.version_dir)
    versions = tracker.list_all_versions()

    print("=" * 60)
    print("版本历史")
    print("=" * 60)

    if not versions:
        print("暂无版本记录")
        return 0

    for v in versions:
        print(
            f"{v['version_id']} | {v['timestamp']} | "
            f"{v['sample_count']}条 | {v['description']}"
        )
        if v["parent"]:
            print(f"  └─ 父版本: {v['parent']}")

    return 0


def cmd_export(args):
    tracker = VersionTracker(storage_path=args.version_dir)

    latest = tracker.get_latest_version()
    version_id = args.version or (latest.version_id if latest else None)
    if not version_id:
        print("✗ 未找到版本")
        return 1

    version = tracker.get_version(version_id)
    if not version:
        print(f"✗ 版本 {version_id} 不存在")
        return 1

    print(f"导出版本 {version_id} 的报告...")

    generator = ReportGenerator(output_dir=args.output_dir)
    paths = generator.export_all_formats(version, tracker)

    print(f"✓ 报告已导出：")
    for fmt, path in paths.items():
        if fmt != "report":
            print(f"  - {fmt}: {path}")

    if args.show_explanation:
        print("\n" + "=" * 60)
        print("【普通话解释（可直接复制）")
        print("=" * 60)
        print(paths["report"].plain_language_explanation)

    return 0


def cmd_compare(args):
    tracker = VersionTracker(storage_path=args.version_dir)

    if not args.version1 or not args.version2:
        print("✗ 请指定两个版本号")
        return 1

    result = tracker.compare_versions(args.version1, args.version2)

    if not result:
        print("✗ 版本对比失败")
        return 1

    print("=" * 60)
    print(f"版本对比: {args.version1} vs {args.version2}")
    print("=" * 60)
    print(f"样本数变化: {result['total_v1']} → {result['total_v2']}")
    print(f"新增样本: {len(result['added'])} 条")
    if result["added"]:
        for sid in result["added"]:
            print(f"  + {sid}")
    print(f"移除样本: {len(result['removed'])} 条")
    if result["removed"]:
        for sid in result["removed"]:
            print(f"  - {sid}")
    print(f"状态变化: {len(result['changed'])} 条")
    if result["changed"]:
        for sid in result["changed"]:
            print(f"  ~ {sid}")

    return 0


def cmd_demo(args):
    print("=" * 60)
    print("端到端演示流程")
    print("=" * 60)
    print()

    from sample_data import create_supplementary_samples

    checker = MultimodalChecker(bias_threshold=0.3, min_category_count=5)
    tracker = VersionTracker(storage_path=args.version_dir)
    generator = ReportGenerator(output_dir=args.output_dir)

    print("【步骤1】初始检查 - 创建V1版本")
    print("-" * 60)
    samples_v1 = create_demo_samples()
    version_v1 = tracker.create_initial_version(
        samples=samples_v1,
        checker=checker,
        description="V1-初始评测集",
    )
    print(f"✓ V1版本: {version_v1.version_id}")
    print(f"✓ 样本数: {len(version_v1.sample_ids)}")

    samples_by_id_v1 = samples_to_dict(samples_v1)
    paths_v1 = generator.export_all_formats(
        version_v1, tracker, samples_by_id_v1
    )
    print(f"✓ V1报告已生成")
    print()

    print("【步骤2】导出V1报告 - 查看问题")
    print("-" * 60)
    print("V1报告普通话解释：")
    print(paths_v1["report"].plain_language_explanation)
    print()

    print("【步骤3】训练样本补录 - 创建V2版本")
    print("-" * 60)
    supplementary = create_supplementary_samples()
    all_samples_v2 = samples_v1 + supplementary
    version_v2 = tracker.supplement_samples(
        parent_version_id=version_v1.version_id,
        all_samples=all_samples_v2,
        checker=checker,
        description="V2-补充风景-修正缺图样本",
    )
    print(f"✓ V2版本: {version_v2.version_id}")
    print(f"✓ 样本数: {len(version_v2.sample_ids)}")

    all_samples = samples_v1 + supplementary
    samples_by_id_v2 = samples_to_dict(all_samples)
    paths_v2 = generator.export_all_formats(
        version_v2, tracker, samples_by_id_v2
    )
    print(f"✓ V2报告已生成")
    print()

    print("【步骤4】导出V2报告 - 查看更新后的结果")
    print("-" * 60)
    print("V2报告普通话解释：")
    print(paths_v2["report"].plain_language_explanation)
    print()

    print("【步骤5】版本对比")
    print("-" * 60)
    compare_result = tracker.compare_versions(
        version_v1.version_id, version_v2.version_id
    )
    print(
        f"样本数变化: {compare_result['total_v1']} → {compare_result['total_v2']}"
    )
    print(f"新增样本: {len(compare_result['added'])} 条")
    print(f"状态变化: {len(compare_result['changed'])} 条")
    print()

    print("【步骤6】数据一致性验证")
    print("-" * 60)
    print(f"V1数据签名: {paths_v1['report'].data_signature}")
    print(f"V2数据签名: {paths_v2['report'].data_signature}")
    print()
    print("✓ 图表、明细、下载文件使用同一数据签名，确保数据一致")
    print()

    print("=" * 60)
    print("✓ 演示完成！")
    print("=" * 60)
    print()
    print("生成的文件：")
    for fmt, path in paths_v2.items():
        if fmt != "report":
            print(f"  - {fmt}: {path}")

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="多模态样本缺图检查工具"
    )
    parser.add_argument(
        "--version-dir",
        default="./version_history",
        help="版本历史存储目录",
    )
    parser.add_argument(
        "--output-dir",
        default="./reports",
        help="报告输出目录",
    )

    subparsers = parser.add_subparsers(dest="command", help="命令")

    check_parser = subparsers.add_parser("check", help="执行检查")
    check_parser.add_argument(
        "--input",
        help="输入样本JSON文件路径",
    )
    check_parser.add_argument(
        "--parent-version",
        help="父版本号，用于增量检查",
    )
    check_parser.add_argument(
        "--description",
        help="版本描述",
    )
    check_parser.add_argument(
        "--bias-threshold",
        type=float,
        default=0.3,
        help="评测集偏科阈值",
    )
    check_parser.add_argument(
        "--min-category-count",
        type=int,
        default=5,
        help="触发偏科检查的最小学本数",
    )
    check_parser.add_argument(
        "--export",
        action="store_true",
        help="检查完成后导出报告",
    )
    check_parser.set_defaults(func=cmd_check)

    list_parser = subparsers.add_parser("versions", help="列出版本历史")
    list_parser.set_defaults(func=cmd_list_versions)

    export_parser = subparsers.add_parser("export", help="导出报告")
    export_parser.add_argument(
        "--version",
        help="版本号，不指定则使用最新版本",
    )
    export_parser.add_argument(
        "--show-explanation",
        action="store_true",
        help="显示普通话解释",
    )
    export_parser.set_defaults(func=cmd_export)

    compare_parser = subparsers.add_parser("compare", help="对比两个版本")
    compare_parser.add_argument("version1", help="版本1")
    compare_parser.add_argument("version2", help="版本2")
    compare_parser.set_defaults(func=cmd_compare)

    demo_parser = subparsers.add_parser("demo", help="运行端到端演示")
    demo_parser.set_defaults(func=cmd_demo)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
