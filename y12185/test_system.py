#!/usr/bin/env python3
import subprocess
import sys
import os
import shlex

def run_command(cmd):
    print(f"\n$ python3 band_equipment.py {cmd}")
    args = [sys.executable, 'band_equipment.py'] + shlex.split(cmd)
    result = subprocess.run(
        args,
        capture_output=True,
        text=True
    )
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    return result

def main():
    print("=" * 60)
    print("🎸 校园乐队设备借还系统 - 功能测试")
    print("=" * 60)

    print("\n📌 步骤1: 查看初始状态")
    run_command("status")

    print("\n📌 步骤2: 导入源文件（测试重复导入保护）")
    run_command("import-source test_data/equipment_ledger.txt")
    run_command("import-source test_data/equipment_ledger.txt")
    run_command("import-source test_data/performance_schedule.txt")
    run_command("import-source test_data/borrow_report_dirty.txt")

    print("\n📌 步骤3: 添加设备台账")
    run_command("add-equipment Fender_Strat 电吉他 --source-id 1")
    run_command("add-equipment Gibson_LP 电吉他 --source-id 1")
    run_command("add-equipment Ibanez_RG550 电吉他 --source-id 1")
    run_command("add-equipment MusicMan_Bass 贝斯 --source-id 1")
    run_command("add-equipment Fender_Bass 贝斯 --source-id 1")
    run_command("add-equipment Yamaha_Drums 鼓组 --source-id 1")
    run_command("add-equipment Roland_Keyboard 键盘 --source-id 1")
    run_command("add-equipment Marshall_Amp 音箱 --source-id 1")

    print("\n📌 步骤4: 添加成员")
    run_command("add-member 张明 主音吉他 --source-id 3")
    run_command("add-member 李华 节奏吉他 --source-id 3")
    run_command("add-member 王强 贝斯手 --source-id 3")
    run_command("add-member 赵小龙 鼓手 --source-id 3")

    print("\n📌 步骤5: 标记成员离队")
    run_command("update-member 4 left")
    run_command("list-members")

    print("\n📌 步骤6: 添加演出安排")
    run_command("add-performance 文化节 2026-06-15 --location 学校大礼堂 --source-id 2")
    run_command("add-performance 毕业晚会 2026-06-20 --location 体育场 --source-id 2")
    run_command("upcoming-performances --days 90")

    print("\n📌 步骤7: 创建设备借出记录（测试逾期检测）")
    run_command("borrow 1 1 2026-03-01 --return-date 2026-03-15 --purpose 个人练习 --source-id 3")
    run_command("borrow 2 2 2026-04-01 --return-date 2026-05-01 --purpose 备战演出 --source-id 3")
    run_command("borrow 4 3 2026-04-10 --return-date 2026-04-20 --purpose 排练 --source-id 3")

    print("\n📌 步骤8: 查看逾期设备")
    run_command("overdue")

    print("\n📌 步骤9: 开始设备维修（测试冲突检测）")
    run_command("start-maintenance 3 2026-04-05 --description 品丝打磨 --source-id 3")
    run_command("active-maintenance")

    print("\n📌 步骤10: 测试借还冲突（已借出设备再次借出）")
    run_command("borrow 1 2 2026-04-12 --purpose 测试冲突")

    print("\n📌 步骤11: 测试离队成员借设备")
    run_command("borrow 3 4 2026-04-12 --purpose 测试离队成员")

    print("\n📌 步骤12: 查看所有冲突")
    run_command("conflicts")

    print("\n📌 步骤13: 查看设备状态")
    run_command("list-equipment")
    run_command("equipment-status 1")

    print("\n📌 步骤14: 查看借还历史")
    run_command("history")

    print("\n📌 步骤15: 归还设备")
    run_command("return-equipment 1 --return-date 2026-04-11")
    run_command("equipment-status 1")

    print("\n📌 步骤16: 查看源文件追溯")
    run_command("source-info 3")

    print("\n📌 步骤17: 完成维修")
    run_command("finish-maintenance 1")
    run_command("active-maintenance")

    print("\n📌 步骤18: 解决冲突")
    run_command("resolve-conflict 1")
    run_command("conflicts")

    print("\n📌 步骤19: 最终状态总览")
    run_command("status")

    print("\n" + "=" * 60)
    print("✅ 测试完成！请检查以上输出是否符合预期")
    print("=" * 60)

if __name__ == '__main__':
    main()
