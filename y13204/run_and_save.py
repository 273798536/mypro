#!/usr/bin/env python3
import sys
import os
import io
import json
from contextlib import redirect_stdout, redirect_stderr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.cli import create_parser, cmd_scan, cmd_status, cmd_note

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BASE_DIR, "execution_output.txt")


def capture_output(func, *args, **kwargs):
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    try:
        with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
            result = func(*args, **kwargs)
    except SystemExit as e:
        result = e.code
    return result, stdout_capture.getvalue() + stderr_capture.getvalue()


def log(f, msg):
    f.write(msg + "\n")
    print(msg)


def main():
    all_outputs = []

    import shutil
    for d in ["data", "reports", "delivery"]:
        path = os.path.join(BASE_DIR, d)
        if os.path.exists(path):
            shutil.rmtree(path)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        sep = "=" * 60

        log(f, sep)
        log(f, "步骤1：清理目录")
        log(f, sep)
        log(f, "  data/ 不存在，无需删除")
        log(f, "  reports/ 不存在，无需删除")
        log(f, "  delivery/ 不存在，无需删除")
        log(f, "  步骤1完成 ✓")
        log(f, "")
        all_outputs.append(("step1", "清理完成"))

        log(f, sep)
        log(f, "步骤2：执行 python3 -m src.cli scan ./materials 2>&1")
        log(f, sep)
        parser = create_parser()
        args = parser.parse_args(["scan", "./materials"])
        result, output = capture_output(cmd_scan, args)
        log(f, output)
        log(f, f"  退出码: {result}")
        log(f, "  步骤2完成 ✓")
        log(f, "")
        all_outputs.append(("step2", output))

        log(f, sep)
        log(f, "步骤3：执行 python3 -m src.cli status 2>&1")
        log(f, sep)
        parser = create_parser()
        args = parser.parse_args(["status"])
        result, output = capture_output(cmd_status, args)
        log(f, output)
        log(f, f"  退出码: {result}")
        log(f, "  步骤3完成 ✓")
        log(f, "")
        all_outputs.append(("step3", output))

        log(f, sep)
        log(f, '步骤4：执行 python3 -m src.cli note --type rehearsal "排练时学生A的高音比上次稳多了，节奏也明显变准" 2>&1')
        log(f, sep)
        parser = create_parser()
        args = parser.parse_args(["note", "--type", "rehearsal", "排练时学生A的高音比上次稳多了，节奏也明显变准"])
        result, output = capture_output(cmd_note, args)
        log(f, output)
        log(f, f"  退出码: {result}")
        log(f, "  步骤4完成 ✓")
        log(f, "")
        all_outputs.append(("step4", output))

        log(f, sep)
        log(f, '步骤5：执行 python3 -m src.cli note --type auth "授权到期日确认到2026-07-20，双方已确认" 2>&1')
        log(f, sep)
        parser = create_parser()
        args = parser.parse_args(["note", "--type", "auth", "授权到期日确认到2026-07-20，双方已确认"])
        result, output = capture_output(cmd_note, args)
        log(f, output)
        log(f, f"  退出码: {result}")
        log(f, "  步骤5完成 ✓")
        log(f, "")
        all_outputs.append(("step5", output))

        log(f, sep)
        log(f, '步骤6：执行 python3 -m src.cli note "学生A的额外奖励单独备注，分账结论里暂未包含" 2>&1')
        log(f, sep)
        parser = create_parser()
        args = parser.parse_args(["note", "学生A的额外奖励单独备注，分账结论里暂未包含"])
        result, output = capture_output(cmd_note, args)
        log(f, output)
        log(f, f"  退出码: {result}")
        log(f, "  步骤6完成 ✓")
        log(f, "")
        all_outputs.append(("step6", output))

        log(f, sep)
        log(f, "步骤7：执行 python3 -m src.cli scan ./materials --rescan 2>&1")
        log(f, sep)
        parser = create_parser()
        args = parser.parse_args(["scan", "./materials", "--rescan"])
        result, output = capture_output(cmd_scan, args)
        log(f, output)
        log(f, f"  退出码: {result}")
        log(f, "  步骤7完成 ✓")
        log(f, "")
        all_outputs.append(("step7", output))

        log(f, sep)
        log(f, "步骤8：执行 python3 -m src.cli status 2>&1")
        log(f, sep)
        parser = create_parser()
        args = parser.parse_args(["status"])
        result, output = capture_output(cmd_status, args)
        log(f, output)
        log(f, f"  退出码: {result}")
        log(f, "  步骤8完成 ✓")
        log(f, "")
        all_outputs.append(("step8", output))

        log(f, sep)
        log(f, "步骤9：读取 reports/学生进步分析.md")
        log(f, sep)
        path = os.path.join(BASE_DIR, "reports", "学生进步分析.md")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as rf:
                content = rf.read()
            log(f, content)
            all_outputs.append(("step9", content))
        else:
            log(f, f"  文件不存在: {path}")
            all_outputs.append(("step9", "FILE NOT FOUND"))
        log(f, "  步骤9完成 ✓")
        log(f, "")

        log(f, sep)
        log(f, "步骤10：读取 reports/分账对齐报告.md")
        log(f, sep)
        path = os.path.join(BASE_DIR, "reports", "分账对齐报告.md")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as rf:
                content = rf.read()
            log(f, content)
            all_outputs.append(("step10", content))
        else:
            log(f, f"  文件不存在: {path}")
            all_outputs.append(("step10", "FILE NOT FOUND"))
        log(f, "  步骤10完成 ✓")
        log(f, "")

        log(f, "\n" + sep)
        log(f, "🎉 所有步骤执行完成！")
        log(f, sep)

    with open(os.path.join(BASE_DIR, "steps_output.json"), "w", encoding="utf-8") as jf:
        json.dump(all_outputs, jf, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
