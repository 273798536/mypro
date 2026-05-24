#!/usr/bin/env python3
import sys
import json
import subprocess
import time

def run_cli(args):
    cmd = [sys.executable, "-m", "app.cli"] + args
    print(f"$ python -m app.cli {' '.join(args)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    print(f"退出码: {result.returncode}\n")
    return result.returncode == 0

def main():
    print("=" * 60)
    print("城市照明抢修重试补偿队列 - 完整流程演示")
    print("=" * 60 + "\n")

    print("【步骤1】初始化数据库")
    run_cli(["init"])
    time.sleep(0.5)

    print("【步骤2】提交巡检照片 - 人民路123号")
    run_cli([
        "submit",
        "--type", "inspection",
        "--data", '{"location":"人民路123号","photo_id":"P001","lamp_count":3,"description":"路灯不亮"}'
    ])

    print("【步骤3】提交报修热线 - 同一地点（人民路123号），应关联到同一工单")
    run_cli([
        "submit",
        "--type", "hotline",
        "--data", '{"location":"人民路123号","phone":"13800138000","report_time":"2024-05-20T10:30:00"}'
    ])

    print("【步骤4】提交备件批次记录")
    run_cli([
        "submit",
        "--type", "spare_part",
        "--data", '{"location":"人民路123号","batch_no":"BATCH20240501","part_name":"LED驱动器","quantity":5}'
    ])

    print("【步骤5】提交异常照片")
    run_cli([
        "submit",
        "--type", "exception_photo",
        "--data", '{"location":"人民路123号","photo_id":"E001","exception_type":"线路烧毁","lamp_count":3}'
    ])

    print("【步骤6】查看工单队列")
    run_cli(["queue"])

    print("【步骤7】查看工单详情（验证多线索关联）")
    run_cli(["detail", "--id", "1"])

    print("【步骤8】执行重试处理")
    run_cli(["retry"])

    print("【步骤9】人工接管")
    run_cli(["manual", "--id", "1", "--handler", "张三"])

    print("【步骤10】补偿入账")
    run_cli(["compensate", "--id", "1", "--amount", "150.00", "--reason", "夜间抢修加班补助", "--executor", "财务"])

    print("【步骤11】查看统计报告")
    run_cli(["stats"])

    print("【步骤12】导出数据（JSON格式）")
    run_cli(["export", "--format", "json"])

    print("【步骤13】关闭工单")
    run_cli(["close", "--id", "1", "--operator", "系统管理员", "--remarks", "问题已解决，路灯恢复正常"])

    print("=" * 60)
    print("演示完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
