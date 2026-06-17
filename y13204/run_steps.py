#!/usr/bin/env python3
import sys
import os
import io
from contextlib import redirect_stdout, redirect_stderr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.cli import create_parser, cmd_scan, cmd_status, cmd_note
from src.storage import StateStore
from src.processor import MaterialProcessor
from src.report_generator import MarkdownReportGenerator


def capture_output(func, *args, **kwargs):
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    try:
        with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
            result = func(*args, **kwargs)
    except SystemExit as e:
        result = e.code
    return result, stdout_capture.getvalue() + stderr_capture.getvalue()


def step1_clean():
    print("=" * 60)
    print("步骤1：清理目录")
    print("=" * 60)
    import shutil
    for d in ["data", "reports", "delivery"]:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), d)
        if os.path.exists(path):
            shutil.rmtree(path)
            print(f"  已删除: {d}/")
        else:
            print(f"  {d}/ 不存在，无需删除")
    print("  步骤1完成 ✓")
    print()


def step2_scan():
    print("=" * 60)
    print("步骤2：执行 scan ./materials")
    print("=" * 60)
    parser = create_parser()
    args = parser.parse_args(["scan", "./materials"])
    result, output = capture_output(cmd_scan, args)
    print(output)
    print(f"  退出码: {result}")
    print("  步骤2完成 ✓")
    print()


def step3_status():
    print("=" * 60)
    print("步骤3：执行 status")
    print("=" * 60)
    parser = create_parser()
    args = parser.parse_args(["status"])
    result, output = capture_output(cmd_status, args)
    print(output)
    print(f"  退出码: {result}")
    print("  步骤3完成 ✓")
    print()


def step4_note_rehearsal():
    print("=" * 60)
    print('步骤4：执行 note --type rehearsal "排练时学生A的高音比上次稳多了，节奏也明显变准"')
    print("=" * 60)
    parser = create_parser()
    args = parser.parse_args(["note", "--type", "rehearsal", "排练时学生A的高音比上次稳多了，节奏也明显变准"])
    result, output = capture_output(cmd_note, args)
    print(output)
    print(f"  退出码: {result}")
    print("  步骤4完成 ✓")
    print()


def step5_note_auth():
    print("=" * 60)
    print('步骤5：执行 note --type auth "授权到期日确认到2026-07-20，双方已确认"')
    print("=" * 60)
    parser = create_parser()
    args = parser.parse_args(["note", "--type", "auth", "授权到期日确认到2026-07-20，双方已确认"])
    result, output = capture_output(cmd_note, args)
    print(output)
    print(f"  退出码: {result}")
    print("  步骤5完成 ✓")
    print()


def step6_note_general():
    print("=" * 60)
    print('步骤6：执行 note "学生A的额外奖励单独备注，分账结论里暂未包含"')
    print("=" * 60)
    parser = create_parser()
    args = parser.parse_args(["note", "学生A的额外奖励单独备注，分账结论里暂未包含"])
    result, output = capture_output(cmd_note, args)
    print(output)
    print(f"  退出码: {result}")
    print("  步骤6完成 ✓")
    print()


def step7_rescan():
    print("=" * 60)
    print("步骤7：执行 scan ./materials --rescan")
    print("=" * 60)
    parser = create_parser()
    args = parser.parse_args(["scan", "./materials", "--rescan"])
    result, output = capture_output(cmd_scan, args)
    print(output)
    print(f"  退出码: {result}")
    print("  步骤7完成 ✓")
    print()


def step8_status():
    print("=" * 60)
    print("步骤8：执行 status")
    print("=" * 60)
    parser = create_parser()
    args = parser.parse_args(["status"])
    result, output = capture_output(cmd_status, args)
    print(output)
    print(f"  退出码: {result}")
    print("  步骤8完成 ✓")
    print()


def step9_read_progress_report():
    print("=" * 60)
    print("步骤9：读取 reports/学生进步分析.md")
    print("=" * 60)
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports", "学生进步分析.md")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        print(content)
    else:
        print(f"  文件不存在: {path}")
    print("  步骤9完成 ✓")
    print()


def step10_read_alignment_report():
    print("=" * 60)
    print("步骤10：读取 reports/分账对齐报告.md")
    print("=" * 60)
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports", "分账对齐报告.md")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        print(content)
    else:
        print(f"  文件不存在: {path}")
    print("  步骤10完成 ✓")
    print()


def main():
    step1_clean()
    step2_scan()
    step3_status()
    step4_note_rehearsal()
    step5_note_auth()
    step6_note_general()
    step7_rescan()
    step8_status()
    step9_read_progress_report()
    step10_read_alignment_report()
    print("\n" + "=" * 60)
    print("🎉 所有步骤执行完成！")
    print("=" * 60)


if __name__ == "__main__":
    main()
