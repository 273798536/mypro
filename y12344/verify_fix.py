#!/usr/bin/env python3
"""验证异常去重修复"""
import sys
sys.path.insert(0, 'src')

from projectile_estimator.data_loader import DataLoader, EventAssociator, AnomalyDetector
from projectile_estimator.models import BoundsConfig

def main():
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

    from collections import Counter
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

    return match and len(anomalies) == 1 and len(anom_coord) == 1

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
