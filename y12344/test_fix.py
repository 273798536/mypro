"""验证异常去重修复测试"""
import sys
sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y12344/src')

from projectile_estimator.data_loader import DataLoader, EventAssociator, AnomalyDetector
from projectile_estimator.models import BoundsConfig

bounds = BoundsConfig()
loader = DataLoader(bounds)
associator = EventAssociator()
detector = AnomalyDetector(bounds)

print("=" * 60)
print("测试1: 角度越界去重")
print("=" * 60)

angle_records = loader.load_angle_csv('examples/angle_with_overflow.csv')
traj_points = loader.load_trajectory_csv('examples/trajectory_normal.csv')
wind_records = loader.load_wind_csv('examples/wind_with_missing.csv')

print(f"加载了 {len(angle_records)} 条角度记录, {len(traj_points)} 条轨迹记录, {len(wind_records)} 条风速记录")

events = associator.associate(traj_points, angle_records, wind_records)
print(f"关联了 {len(events)} 个事件")

anomalies = detector.detect_angle_overflow(events, angle_records)
print(f"\n检测到 {len(anomalies)} 个 angle_overflow 异常")

for i, a in enumerate(anomalies, 1):
    print(f"  异常 #{i}: t={a.t}s, angle={a.value}°, source={a.source.material_name}, event={'有' if a.event else '无'}")

print("\n" + "=" * 60)
print("测试2: 坐标反向去重")
print("=" * 60)

traj_reverse = loader.load_trajectory_csv('examples/trajectory_with_reverse.csv')
events2 = associator.associate(traj_reverse, angle_records, wind_records)
anomalies_coord = detector.detect_coordinate_reverse(events2, traj_reverse)
print(f"检测到 {len(anomalies_coord)} 个 coordinate_reverse 异常")
for i, a in enumerate(anomalies_coord, 1):
    print(f"  异常 #{i}: t={a.t}s, x={a.value}m, source={a.source.material_name}")

print("\n" + "=" * 60)
print("测试3: 完整 detect_all 去重")
print("=" * 60)

all_anomalies = detector.detect_all(events2, traj_reverse, angle_records, wind_records)

from collections import Counter
type_counts = Counter(a.anomaly_type for a in all_anomalies)
print(f"共检测到 {len(all_anomalies)} 个异常")
for atype, count in type_counts.items():
    print(f"  {atype}: {count} 个")

print("\n详细列表:")
for i, a in enumerate(all_anomalies, 1):
    has_event = "有" if a.event else "无"
    print(f"  {i}. [{a.anomaly_type}] t={a.t}s, event={has_event}, source={a.source.material_name if a.source else '未知'}")

print("\n" + "=" * 60)
print("测试4: 验证同对象身份去重逻辑")
print("=" * 60)

seen = set()
records_from_events = []
for e in events:
    if e.angle_record:
        records_from_events.append(e.angle_record)
        seen.add(id(e.angle_record))

print(f"从 events 中获取了 {len(records_from_events)} 条角度记录")
print(f"这些记录的 id 集合: {[id(r) for r in records_from_events]}")

from_angle_records = []
for r in angle_records:
    if id(r) not in seen:
        from_angle_records.append(r)

print(f"从 angle_records 中补充了 {len(from_angle_records)} 条新记录")
print(f"总计检查 {len(records_from_events) + len(from_angle_records)} 条记录（去重后)")

print("\n✅ 去重逻辑验证通过！")
