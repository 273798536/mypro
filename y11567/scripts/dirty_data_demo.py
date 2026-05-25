#!/usr/bin/env python3
import sys
import subprocess
import json

def run_cli(args):
    cmd = [sys.executable, "-m", "app.cli"] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    return result

def main():
    print("=" * 60)
    print("脏记录处理演示 - 完整链路")
    print("=" * 60 + "\n")

    print("【1】初始化数据库")
    run_cli(["init"])

    print("【2】提交正常的巡检记录")
    run_cli([
        "submit",
        "--type", "inspection",
        "--data", '{"location":"解放路789号","photo_id":"P201","lamp_count":2}'
    ])

    print("【3】提交缺少必填字段的热线记录（自动触发脏记录检测）")
    run_cli([
        "submit",
        "--type", "hotline",
        "--data", '{"location":"解放路789号"}'
    ])

    print("【4】查看脏记录列表（验证脏记录已被检测并标记）")
    run_cli(["dirty"])

    print("【5】查看脏记录统计")
    run_cli(["stats"])

    print("【6】查看工单详情（查看操作历史中的脏记录标记）")
    run_cli(["detail", "--id", "1"])

    print("【7】修正脏记录 - 补充缺失字段，触发重新汇总")
    run_cli([
        "correct",
        "--id", "2",
        "--data", '{"location":"解放路789号","phone":"13800138000","report_time":"2024-05-20T10:00:00"}',
        "--notes", "补充缺失的phone和report_time字段"
    ])

    print("【8】再次查看工单详情（验证重新汇总后的结果）")
    run_cli(["detail", "--id", "1"])

    print("【9】再次查看脏记录列表（确认脏记录已被修正）")
    run_cli(["dirty"])

    print("\n" + "=" * 60)
    print("脏记录演示完成！")
    print("=" * 60)
    print("\n核心链路已接入:")
    print("  1. submit_clue -> 自动调用 analyze_clue/mark_dirty")
    print("  2. 缺字段、跨日、改名、金额/数量冲突自动识别")
    print("  3. correct_clue -> 保留原始内容 + 触发重新汇总 + 更新工单")
    print("  4. 操作日志记录完整的修改历史")

if __name__ == "__main__":
    main()
