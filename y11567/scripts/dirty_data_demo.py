#!/usr/bin/env python3
import sys
import subprocess
import json

def run_cli(args):
    cmd = [sys.executable, "-m", "app.cli"] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    return result

def main():
    print("=" * 60)
    print("脏记录处理演示")
    print("=" * 60 + "\n")

    print("【1】初始化数据库")
    run_cli(["init"])

    print("【2】提交正常的巡检记录")
    run_cli([
        "submit",
        "--type", "inspection",
        "--data", '{"location":"解放路789号","photo_id":"P201","lamp_count":2}'
    ])

    print("【3】提交缺少必填字段的热线记录（触发脏记录检测）")
    run_cli([
        "submit",
        "--type", "hotline",
        "--data", '{"location":"解放路789号"}'
    ])

    print("【4】查看脏记录列表")
    run_cli(["dirty"])

    print("【5】查看脏记录统计")
    result = run_cli(["stats"])

    print("【6】查看工单详情")
    run_cli(["detail", "--id", "1"])

    print("\n" + "=" * 60)
    print("脏记录演示完成！")
    print("=" * 60)
    print("\n可以使用以下命令修正脏记录:")
    print("  python -m app.cli correct --id 2 --data '{\"location\":\"解放路789号\",\"phone\":\"13800138000\",\"report_time\":\"2024-05-20T10:00:00\"}' --notes '补充缺失字段'")

if __name__ == "__main__":
    main()
