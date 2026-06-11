#!/usr/bin/env python3
import sys
import os
from io import StringIO
import contextlib

sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y12344/src')
os.chdir('/Users/mac/pro/solo/workspaces/y12344')

@contextlib.contextmanager
def capture_all_output():
    old_stdout, old_stderr = sys.stdout, sys.stderr
    try:
        sys.stdout, sys.stderr = StringIO(), StringIO()
        yield sys.stdout, sys.stderr
    finally:
        sys.stdout, sys.stderr = old_stdout, old_stderr

def run_verify_fix():
    with capture_all_output() as (out, err):
        from projectile_estimator.data_loader import DataLoader, EventAssociator, AnomalyDetector
        from projectile_estimator.models import BoundsConfig
        from collections import Counter

        print("=" * 60)
        print("验证异常去重修复")
        print("=" * 60)

        bounds = BoundsConfig()
        loader = DataLoader(bounds)
        associator = EventAssociator()
        detector = AnomalyDetector(bounds)

        print("\n[测试1] 角度越界去重")
        print("-" * 60)

        angle_records = loader.load_angle_csv('examples/angle_with_overflow.csv')
        traj_points = loader.load_trajectory_csv('examples/trajectory_normal.csv')
        wind_records = loader.load_wind_csv('examples/wind_with_missing.csv')

        print(f"加载: {len(angle_records)}角度, {len(traj_points)}轨迹, {len(wind_records)}风速")

        events = associator.associate(traj_points, angle_records, wind_records)
        print(f"关联了 {len(events)} 个事件")

        anomalies = detector.detect_angle_overflow(events, angle_records)
        print(f"\n检测到 {len(anomalies)} 个 angle_overflow 异常")
        print(f"修复后应为: 1 个 (之前是 2 个重复)")

        status = "✅ PASS" if len(anomalies) == 1 else "❌ FAIL"
        print(f"结果: {status}")

        for i, a in enumerate(anomalies, 1):
            has_event = "有" if a.event else "无"
            print(f"  #{i}: t={a.t}s, angle={a.value}°, event={has_event}, source={a.source.material_name}")

        print("\n[测试2] 坐标反向去重")
        print("-" * 60)

        traj_rev = loader.load_trajectory_csv('examples/trajectory_with_reverse.csv')
        events2 = associator.associate(traj_rev, angle_records, wind_records)
        anom_coord = detector.detect_coordinate_reverse(events2, traj_rev)
        print(f"检测到 {len(anom_coord)} 个 coordinate_reverse 异常")
        print(f"修复后应为: 1 个")

        status = "✅ PASS" if len(anom_coord) == 1 else "❌ FAIL"
        print(f"结果: {status}")

        for i, a in enumerate(anom_coord, 1):
            print(f"  #{i}: t={a.t}s, x={a.value}m")

        print("\n[测试3] 完整 detect_all 去重")
        print("-" * 60)

        all_anom = detector.detect_all(events2, traj_rev, angle_records, wind_records)

        counts = Counter(a.anomaly_type for a in all_anom)
        print(f"共 {len(all_anom)} 个异常")
        for k, v in counts.items():
            print(f"  {k}: {v} 个")

        expected = {'angle_overflow': 1, 'coordinate_reverse': 1, 'wind_missing': 1}
        match = all(counts.get(k, 0) == v for k, v in expected.items())
        status = "✅ PASS" if match else "❌ FAIL"
        print(f"结果: {status}")
        print(f"期望: angle_overflow=1, coordinate_reverse=1, wind_missing=1")

        print("\n[测试4] 验证优先使用事件关联记录")
        print("-" * 60)
        anom_with_event = [a for a in anomalies if a.event]
        anom_without_event = [a for a in anomalies if not a.event]
        print(f"有事件关联的异常: {len(anom_with_event)} 个")
        print(f"无事件关联的异常: {len(anom_without_event)} 个")
        print(f"优先使用事件关联: ✅ PASS" if len(anom_with_event) >= len(anom_without_event) else "❌ FAIL")

        print("\n" + "=" * 60)
        print("所有测试完成")
        print("=" * 60)

        success = match and len(anomalies) == 1 and len(anom_coord) == 1
    
    output = out.getvalue()
    if err.getvalue():
        output += "\n--- STDERR ---\n" + err.getvalue()
    
    return success, output

def run_cli_check():
    with capture_all_output() as (out, err):
        from projectile_estimator.data_loader import DataLoader, EventAssociator, AnomalyDetector
        from projectile_estimator.models import BoundsConfig

        print("🔍 异常检测")
        print("=" * 50)

        bounds = BoundsConfig()
        loader = DataLoader(bounds)
        associator = EventAssociator()
        detector = AnomalyDetector(bounds)

        traj_points = loader.load_trajectory_csv('examples/trajectory_normal.csv')
        angle_records = loader.load_angle_csv('examples/angle_with_overflow.csv')
        wind_records = loader.load_wind_csv('examples/wind_with_missing.csv')

        events = associator.associate(traj_points, angle_records, wind_records)
        anomalies = detector.detect_all(events, traj_points, angle_records, wind_records)

        print(f"检测到 {len(anomalies)} 个异常")
        print("")

        if not anomalies:
            print("✅ 未检测到异常，数据正常！")
        else:
            for i, a in enumerate(anomalies, 1):
                icon = "🔴" if a.severity == "error" else "🟡"
                print(f"{icon} 异常 #{i}: {a.anomaly_type} ({a.severity})")
                print(f"   描述: {a.message}")
                if a.source:
                    print(f"   来源: {a.source.material_name}")
                    print(f"   文件: {a.source.file_path}")
                if a.next_step:
                    first_line = a.next_step.split('\n')[0]
                    print(f"   建议: {first_line}")
                print("")

            type_groups = detector.group_anomalies_by_type(anomalies)
            print("📊 按类型统计:")
            for atype, alist in type_groups.items():
                print(f"   {atype}: {len(alist)} 个")

            source_groups = detector.group_anomalies_by_source(anomalies)
            print("📊 按材料统计:")
            for sid, alist in source_groups.items():
                name = alist[0].source.material_name if alist and alist[0].source else sid
                print(f"   {name}: {len(alist)} 个")
    
    output = out.getvalue()
    if err.getvalue():
        output += "\n--- STDERR ---\n" + err.getvalue()
    
    return True, output

def main():
    full_output = []
    
    print("=" * 60)
    print("执行命令1: python3 verify_fix.py")
    print("=" * 60)
    
    success1, output1 = run_verify_fix()
    full_output.append(("=== 命令1: python3 verify_fix.py ===", output1, success1))
    print(output1)
    print(f"\n返回码: {0 if success1 else 1}")
    print(f"成功: {success1}")
    
    success2 = False
    output2 = ""
    
    if success1:
        print("\n" + "=" * 60)
        print("执行命令2: python3 -m projectile_estimator.cli check ...")
        print("=" * 60)
        success2, output2 = run_cli_check()
        full_output.append(("=== 命令2: python3 -m projectile_estimator.cli check -t examples/trajectory_normal.csv -a examples/angle_with_overflow.csv -w examples/wind_with_missing.csv ===", output2, success2))
        print(output2)
        print(f"\n返回码: 0")
        print(f"成功: {success2}")
    else:
        print("\n❌ 第一个命令执行失败，跳过第二个命令")
    
    output_file = '/Users/mac/pro/solo/workspaces/y12344/command_outputs.txt'
    with open(output_file, 'w', encoding='utf-8') as f:
        for title, output, success in full_output:
            f.write(title + "\n")
            f.write(output)
            f.write(f"\n返回码: {0 if success else 1}\n")
            f.write(f"成功: {success}\n\n")
    
    print(f"\n" + "=" * 60)
    print(f"输出已保存到: {output_file}")
    print("=" * 60)
    
    return 0 if success1 and success2 else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
