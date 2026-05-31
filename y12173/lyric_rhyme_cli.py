#!/usr/bin/env python3
"""歌词押韵辅助CLI - 核心入口"""

import argparse
import sys
from pathlib import Path

from rhyme_checker import RhymeChecker
from version_manager import VersionManager
from segment_manager import SegmentManager
from reporter import Reporter


def main():
    parser = argparse.ArgumentParser(description="歌词押韵辅助CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init", help="初始化新项目")

    import_parser = subparsers.add_parser("import", help="导入歌词草稿")
    import_parser.add_argument("file", help="歌词文件路径")
    import_parser.add_argument("--name", default="draft", help="版本名称")

    check_parser = subparsers.add_parser("check", help="检查押韵")
    check_parser.add_argument("--version", help="指定版本")

    subparsers.add_parser("history", help="查看版本历史")

    diff_parser = subparsers.add_parser("diff", help="版本对比")
    diff_parser.add_argument("v1", help="版本1")
    diff_parser.add_argument("v2", help="版本2")

    fix_parser = subparsers.add_parser("fix", help="修正标记")
    fix_parser.add_argument("line", type=int, help="行号")
    fix_parser.add_argument("pinyin", help="指定拼音")
    fix_parser.add_argument("--note", help="修正说明")

    report_parser = subparsers.add_parser("report", help="生成报告")
    report_parser.add_argument("--output", "-o", help="输出文件")

    args = parser.parse_args()

    if args.command == "init":
        init_project()
    elif args.command == "import":
        import_lyrics(args.file, args.name)
    elif args.command == "check":
        check_rhyme(args.version)
    elif args.command == "history":
        show_history()
    elif args.command == "diff":
        diff_versions(args.v1, args.v2)
    elif args.command == "fix":
        fix_pronunciation(args.line, args.pinyin, args.note)
    elif args.command == "report":
        generate_report(args.output)


def init_project():
    for d in ["versions", "segments", "rhyme_tables", "fixes", "reports"]:
        Path(d).mkdir(exist_ok=True)
    print("✅ 项目初始化完成")


def import_lyrics(file_path, version_name):
    vm = VersionManager()
    version = vm.import_file(file_path, version_name)
    print(f"✅ 已导入版本: {version['name']} ({version['id']})")
    print(f"   行数: {version['line_count']}")


def check_rhyme(version_name=None):
    vm = VersionManager()
    version = vm.get_latest() if not version_name else vm.get_version(version_name)
    if not version:
        print("❌ 未找到版本")
        return

    checker = RhymeChecker()
    sm = SegmentManager()
    segments = sm.get_segments(version["id"])
    results = checker.check_version(version, segments)

    print(f"\n📋 押韵检测结果 - {version['name']}")
    print("=" * 50)

    for seg_id, seg_data in results["segments"].items():
        print(f"\n{seg_id} ({seg_data['type']}):")
        for line_result in seg_data["lines"]:
            status = "✅" if line_result["rhyme_match"] else "❌"
            pinyin_note = f" [{line_result['pinyin_note']}]" if line_result.get("pinyin_note") else ""
            print(f"  {status} L{line_result['line_num']}: {line_result['text']}{pinyin_note}")
            if not line_result["rhyme_match"]:
                print(f"     韵脚: {line_result['rhyme']} (期望: {seg_data['expected_rhyme']})")

    print(f"\n📊 总体: {results['summary']['matched']}/{results['summary']['total']} 匹配")
    if results["summary"]["ambiguous"] > 0:
        print(f"⚠️  多音字歧义: {results['summary']['ambiguous']} 处")
    if results["summary"]["english"] > 0:
        print(f"🌐 英文混入: {results['summary']['english']} 处")


def show_history():
    vm = VersionManager()
    history = vm.get_history()
    print("📚 版本历史:")
    for v in history:
        print(f"  {v['id']} - {v['name']} ({v['timestamp']})")
        print(f"    行数: {v['line_count']} | 修正: {v['fix_count']}")


def diff_versions(v1_name, v2_name):
    vm = VersionManager()
    v1 = vm.get_version(v1_name)
    v2 = vm.get_version(v2_name)
    if not v1 or not v2:
        print("❌ 未找到版本")
        return

    diff = vm.diff(v1, v2)
    print(f"🔍 版本对比: {v1['name']} vs {v2['name']}")
    print("=" * 50)
    for item in diff:
        print(f"  {item['type']}: L{item['line_num']}")
        if item.get("old"):
            print(f"    - {item['old']}")
        if item.get("new"):
            print(f"    + {item['new']}")


def fix_pronunciation(line_num, pinyin, note):
    vm = VersionManager()
    version = vm.get_latest()
    if not version:
        print("❌ 没有可用版本")
        return

    checker = RhymeChecker()
    fix = checker.add_fix(version["id"], line_num, pinyin, note)
    print(f"✅ 已记录修正: L{fix['line_num']} → {fix['pinyin']}")
    if note:
        print(f"   说明: {note}")


def generate_report(output=None):
    reporter = Reporter()
    report = reporter.generate()

    if output:
        reporter.save(report, output)
        print(f"✅ 报告已保存: {output}")
    else:
        print(reporter.format_console(report))


if __name__ == "__main__":
    main()
