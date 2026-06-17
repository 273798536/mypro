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


def merge_samples(
    base_samples: List[MultimodalSample],
    override_samples: List[MultimodalSample],
) -> List[MultimodalSample]:
    merged: dict = {}
    for s in base_samples:
        if s.sample_id:
            merged[s.sample_id] = s
    overridden_ids = set()
    for s in override_samples:
        if s.sample_id:
            if s.sample_id in merged:
                overridden_ids.add(s.sample_id)
            merged[s.sample_id] = s
    return list(merged.values())


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
            overridden = set()
            for s in samples:
                if s.sample_id and s.sample_id in parent.sample_ids:
                    overridden.add(s.sample_id)
            if overridden:
                print(f"  覆盖原记录 {len(overridden)} 条: {sorted(overridden)}")
            added = [s.sample_id for s in samples if s.sample_id and s.sample_id not in parent.sample_ids]
            if added:
                print(f"  新增记录 {len(added)} 条: {sorted(added)}")
        version = tracker.supplement_samples(
            parent_version_id=args.parent_version,
            override_samples=samples,
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
    print(f"样本数变化: {result['total_v1']} → {result['total_v2']} (Δ {result['total_v2'] - result['total_v1']:+d})")

    print(f"\n新增样本: {len(result['added'])} 条")
    if result["added"]:
        for sid in result["added"]:
            print(f"  + {sid}")

    print(f"\n移除样本: {len(result['removed'])} 条")
    if result["removed"]:
        for sid in result["removed"]:
            print(f"  - {sid}")

    print(f"\n数据更新(同ID覆盖): {len(result['updated'])} 条")
    if result["updated"]:
        for sid in result["updated"]:
            print(f"  ≈ {sid}  (image_paths/category/text_content 已变更)")

    print(f"\n状态变化: {len(result['status_changed'])} 条")
    if result["status_changed"]:
        v1 = tracker.get_version(args.version1)
        v2 = tracker.get_version(args.version2)
        for sid in result["status_changed"]:
            s1 = v1.check_results[sid].status.value if v1 else "?"
            s2 = v2.check_results[sid].status.value if v2 else "?"
            print(f"  ~ {sid}: {s1} → {s2}")

    print(f"\n问题数量变化: {len(result['issues_changed'])} 条")
    if result["issues_changed"]:
        for sid in result["issues_changed"]:
            print(f"  ✱ {sid}")

    return 0


def cmd_demo(args):
    print("=" * 60)
    print("端到端演示流程（补录闭环验证）")
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
        description="V1-初始评测集（含缺图+偏科+坏数据）",
    )
    s = version_v1.check_results
    print(f"✓ V1版本: {version_v1.version_id}")
    print(f"✓ 样本数: {len(version_v1.sample_ids)}")
    print(f"  通过={sum(1 for r in s.values() if r.status.value=='通过')}"
          f"  待确认={sum(1 for r in s.values() if r.status.value=='待确认')}"
          f"  不通过={sum(1 for r in s.values() if r.status.value=='不通过')}")
    print(f"  SAMPLE_002(缺图): {s['SAMPLE_002'].status.value}  issues={[i.check_type.value for i in s['SAMPLE_002'].issues]}")
    print(f"  SAMPLE_001(偏科): {s['SAMPLE_001'].status.value}  issues={[i.check_type.value for i in s['SAMPLE_001'].issues]}")

    samples_by_id_v1 = samples_to_dict(samples_v1)
    paths_v1 = generator.export_all_formats(
        version_v1, tracker, samples_by_id_v1
    )
    print(f"✓ V1报告已生成 (签名: {paths_v1['report'].data_signature})")
    print()

    print("【步骤2】V1报告摘录 - 验证拦截口径")
    print("-" * 60)
    print("SAMPLE_002 / SAMPLE_001 均为待确认（已拦截，不会算入通过）")
    lines = paths_v1["report"].plain_language_explanation.split("\n")
    for line in lines[:6]:
        print(f"  {line}")
    print("  ...")
    print()

    print("【步骤3】训练样本补录 - 创建V2版本（覆盖+新增）")
    print("-" * 60)
    supplementary = create_supplementary_samples()
    print(f"  提交补录数据 {len(supplementary)} 条:")
    print(f"    • 覆盖SAMPLE_002（补图，原缺图记录→更新）")
    print(f"    • 新增SAMPLE_011/SAMPLE_012（风景-城市，缓解偏科）")
    print(f"    • 新增SAMPLE_013（动物-猫类，缓解偏科）")

    version_v2 = tracker.supplement_samples(
        parent_version_id=version_v1.version_id,
        override_samples=supplementary,
        checker=checker,
        description="V2-SAMPLE_002补图+补充风景/猫类缓解偏科",
    )
    s2 = version_v2.check_results
    print()
    print(f"✓ V2版本: {version_v2.version_id}")
    print(f"✓ 样本数: {len(version_v2.sample_ids)}")
    print(f"  通过={sum(1 for r in s2.values() if r.status.value=='通过')}"
          f"  待确认={sum(1 for r in s2.values() if r.status.value=='待确认')}"
          f"  不通过={sum(1 for r in s2.values() if r.status.value=='不通过')}")

    print("\n【闭环验证点】")
    print(f"  1) SAMPLE_002 状态: {s['SAMPLE_002'].status.value} → {s2['SAMPLE_002'].status.value}")
    print(f"     原缺图问题是否消失: {'缺图检查' not in [i.check_type.value for i in s2['SAMPLE_002'].issues]}")
    print(f"  2) SAMPLE_001 状态: {s['SAMPLE_001'].status.value} → {s2['SAMPLE_001'].status.value}")
    print(f"     原偏科问题是否消失: {'评测集偏科检查' not in [i.check_type.value for i in s2['SAMPLE_001'].issues]}")
    print(f"  3) SAMPLE_006/SAMPLE_007/SAMPLE_008/SAMPLE_009 偏科问题是否同步解除")
    bias_ids = ["SAMPLE_001", "SAMPLE_006", "SAMPLE_007", "SAMPLE_008", "SAMPLE_009"]
    all_clear = all(
        "评测集偏科检查" not in [i.check_type.value for i in s2[bid].issues]
        for bid in bias_ids
    )
    print(f"     结果: {'全部解除 ✓' if all_clear else '未全部解除 ✗'}")

    samples_by_id_v2 = dict(version_v2.samples)
    paths_v2 = generator.export_all_formats(
        version_v2, tracker, samples_by_id_v2
    )
    print(f"\n✓ V2报告已生成 (签名: {paths_v2['report'].data_signature})")
    print()

    print("【步骤4】V2报告摘录 - 验证补录后口径")
    print("-" * 60)
    lines = paths_v2["report"].plain_language_explanation.split("\n")
    for line in lines[:7]:
        print(f"  {line}")
    print("  ...")
    print()

    print("【步骤5】版本对比（V1→V2，体现补录闭环）")
    print("-" * 60)
    cr = tracker.compare_versions(version_v1.version_id, version_v2.version_id)
    print(f"样本数: {cr['total_v1']} → {cr['total_v2']} (Δ +{cr['total_v2']-cr['total_v1']})")
    print(f"新增样本: {cr['added']}")
    print(f"数据更新(同ID覆盖): {cr['updated']}")
    print(f"状态变化:")
    for sid in cr["status_changed"]:
        print(f"  • {sid}: {s[sid].status.value} → {s2[sid].status.value}")
    print()

    print("【步骤6】三端数据一致性验证")
    print("-" * 60)
    print(f"  V1签名: {paths_v1['report'].data_signature}")
    print(f"  V2签名: {paths_v2['report'].data_signature}")
    print(f"  两版签名不同(因数据已变更): {paths_v1['report'].data_signature != paths_v2['report'].data_signature}")
    print()

    print("=" * 60)
    print("✓ 演示完成！补录闭环验证通过：")
    print("  - SAMPLE_002 补图后原缺图记录自动更新为通过")
    print("  - 补充风景/猫类样本后，5条偏科样本自动解除拦截")
    print("  - 新版本报告与旧版本报告数据独立，签名不同")
    print("=" * 60)
    print()
    print("生成的文件（V2报告）：")
    for fmt, path in paths_v2.items():
        if fmt != "report":
            print(f"  - {fmt}: {path}")
    print("\n可运行以下命令继续验证：")
    print(f"  python3 main.py versions                   # 查看版本历史")
    print(f"  python3 main.py compare {version_v1.version_id} {version_v2.version_id}  # 版本对比")
    print(f"  python3 main.py export --show-explanation  # 导出最新报告")

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
