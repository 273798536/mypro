import numpy as np
import pandas as pd
import os
import random


def generate_test_data(output_dir: str = 'data'):
    os.makedirs(output_dir, exist_ok=True)
    
    np.random.seed(42)
    random.seed(42)
    
    n_points = 200
    timestamps = np.arange(0, n_points * 0.5, 0.5)
    
    x = np.zeros(n_points)
    y = np.zeros(n_points)
    floor = np.ones(n_points, dtype=int)
    beacon_ids = []
    
    for i in range(n_points):
        if i < 60:
            floor[i] = 1
            x[i] = 5 + i * 0.3 + np.random.normal(0, 0.2)
            y[i] = 10 + np.sin(i * 0.1) * 3 + np.random.normal(0, 0.2)
        elif i < 120:
            floor[i] = 2
            x[i] = 25 + (i - 60) * 0.25 + np.random.normal(0, 0.2)
            y[i] = 15 + np.cos((i - 60) * 0.08) * 4 + np.random.normal(0, 0.2)
        else:
            floor[i] = 3
            x[i] = 40 + np.sin((i - 120) * 0.05) * 8 + np.random.normal(0, 0.2)
            y[i] = 20 + (i - 120) * 0.2 + np.random.normal(0, 0.2)
        
        beacon_prefix = f"BEACON_{floor[i]:02d}_"
        beacon_suffix = f"{int(x[i] / 5):02d}{int(y[i] / 5):02d}"
        beacon_ids.append(beacon_prefix + beacon_suffix)
    
    floor[45] = 3
    floor[90] = 1
    floor[150] = 2
    floor[151] = 2
    floor[175] = 1
    
    x[30] += 8
    x[65] += 10
    x[130] += 12
    
    duplicate_timestamps = []
    duplicate_beacons = []
    duplicate_x = []
    duplicate_y = []
    duplicate_floor = []
    
    dup_ts_1 = timestamps[70]
    duplicate_timestamps.append(dup_ts_1)
    duplicate_beacons.append(beacon_ids[70])
    duplicate_x.append(x[70] + 5)
    duplicate_y.append(y[70] + 3)
    duplicate_floor.append(floor[70])
    
    dup_ts_2 = timestamps[100]
    duplicate_timestamps.append(dup_ts_2)
    duplicate_beacons.append(beacon_ids[100])
    duplicate_x.append(x[100] - 4)
    duplicate_y.append(y[100] + 2)
    duplicate_floor.append(floor[100])
    
    lines = []
    lines.append("# 室内定位测试数据 - 物联网工程演示")
    lines.append("# 包含: 楼层串跳、信标重号、轨迹漂移")
    lines.append("# 生成时间: 2026-05-31")
    lines.append("")
    lines.append("timestamp,x,y,floor,beacon_id,rssi")
    
    for i in range(n_points):
        rssi = -50 - np.random.uniform(0, 30)
        line = f"{timestamps[i]:.1f},{x[i]:.3f},{y[i]:.3f},{floor[i]},{beacon_ids[i]},{rssi:.1f}"
        lines.append(line)
        
        if i == 25:
            lines.append("")
            lines.append("# 备注: 进入楼梯间，信号可能不稳定")
            lines.append("")
        
        if i == 55:
            lines.append("")
        
        if i == 70:
            rssi_dup = -50 - np.random.uniform(0, 30)
            lines.append(f"{dup_ts_1:.1f},{duplicate_x[0]:.3f},{duplicate_y[0]:.3f},{duplicate_floor[0]},{duplicate_beacons[0]},{rssi_dup:.1f}")
        
        if i == 95:
            lines.append(f"{timestamps[i]:.1f},{x[i]:.3f},{y[i]:.3f}")
        
        if i == 100:
            rssi_dup = -50 - np.random.uniform(0, 30)
            lines.append(f"{dup_ts_2:.1f},{duplicate_x[1]:.3f},{duplicate_y[1]:.3f},{duplicate_floor[1]},{duplicate_beacons[1]},{rssi_dup:.1f}")
        
        if i == 125:
            lines.append(f"{timestamps[i]:.1f},invalid,{y[i]:.3f},{floor[i]},{beacon_ids[i]},{rssi:.1f}")
    
    output_path = os.path.join(output_dir, 'indoor_positioning_data.csv')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    
    print(f"Test data generated at: {output_path}")
    
    print("\n" + "="*60)
    print("注入的异常说明:")
    print("="*60)
    print("1. 楼层串跳 (单点):")
    print(f"   - 行~47:  1层 → 3层 → 1层  (单点串跳)")
    print(f"   - 行~92:  2层 → 1层 → 2层  (单点串跳)")
    print(f"   - 行~177: 3层 → 1层 → 3层  (单点串跳)")
    print("2. 楼层串跳 (多点):")
    print(f"   - 行~152-154: 3层 → 2层 → 2层 → 2层 → 3层 (3个点串跳)")
    print("3. 信标重号:")
    print(f"   - 时间~40s: 同一信标出现2次")
    print(f"   - 时间~55s: 同一信标出现2次")
    print("4. 轨迹漂移:")
    print(f"   - 时间~15s: X轴突变8米")
    print(f"   - 时间~32.5s: X轴突变10米")
    print(f"   - 时间~65s: X轴突变12米")
    print("5. 坏行注入:")
    print(f"   - 空行: 2处")
    print(f"   - 备注行: 2处")
    print(f"   - 缺列行: 1处 (缺少beacon_id和rssi列)")
    print(f"   - 无效值行: 1处 (x值为'invalid')")
    print("="*60)
    
    return output_path


if __name__ == '__main__':
    generate_test_data()
