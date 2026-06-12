#!/usr/bin/env python3
import os
import sys
import pandas as pd
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import DEMO_DIR


def generate_demo_data():
    os.makedirs(DEMO_DIR, exist_ok=True)
    
    base_date = datetime(2024, 6, 15)
    
    boxes = []
    stations = ['青岛站', '舟山站', '厦门站', '深圳站', '海口站']
    sample_types = ['海水样品', '沉积物样品', '浮游生物', '底栖生物']
    expeditions = ['向阳红01_2024航次', '科学三号_2024航次']
    
    for i in range(1, 21):
        station = stations[(i - 1) % len(stations)]
        sample_type = sample_types[(i - 1) % len(sample_types)]
        expedition = expeditions[(i - 1) // 10]
        
        sample_date = base_date + timedelta(days=((i - 1) % 5))
        temp = 4.0 + (i % 3) * 1.5
        transport = 'normal'
        
        if i == 7:
            sample_date = base_date + timedelta(days=2)
            temp = 12.5
            transport = 'delayed'
        
        boxes.append({
            '样品箱编号': f'BOX{i:03d}',
            '航次名称': expedition,
            '站点名称': station,
            '样品类型': sample_type,
            '采样时间': sample_date.strftime('%Y-%m-%d %H:%M:%S'),
            '存储温度': temp,
            '运输状态': transport
        })
    
    df_boxes = pd.DataFrame(boxes)
    box_file = os.path.join(DEMO_DIR, '样品箱数据.xlsx')
    df_boxes.to_excel(box_file, index=False)
    print(f'✓ 生成样品箱数据: {box_file} ({len(boxes)} 条)')
    
    logs = []
    for i in range(10):
        log_date = base_date + timedelta(days=i)
        for station in stations[:3]:
            logs.append({
                '日期': log_date.strftime('%Y-%m-%d'),
                '站点名称': station,
                '水温': round(18 + (i % 5) * 0.8, 1),
                '盐度': round(32 + (i % 3) * 0.5, 1),
                '溶解氧': round(6.5 - (i % 4) * 0.3, 1),
                'PH值': round(8.1 + (i % 2) * 0.05, 2),
                '投饵量': round(50 + (i % 5) * 10, 1),
                '死亡数': i % 7 == 0 and 1 or 0,
                '备注': '日常监测' if i % 3 != 0 else '水质波动，已加强观测'
            })
    
    df_logs = pd.DataFrame(logs)
    log_file = os.path.join(DEMO_DIR, '养殖日志数据.xlsx')
    df_logs.to_excel(log_file, index=False)
    print(f'✓ 生成养殖日志数据: {log_file} ({len(logs)} 条)')
    
    waves = []
    for i in range(10):
        forecast_date = base_date + timedelta(days=i)
        for station in stations[:4]:
            is_delayed = '否'
            delay_reason = ''
            
            if station == '舟山站' and i == 2:
                is_delayed = '是'
                delay_reason = '气象卫星数据传输故障，预报晚到6小时'
            
            wave_h = 1.2 + (i % 4) * 0.5
            wind_s = 8 + (i % 5) * 3
            
            if station == '舟山站' and i == 2:
                wave_h = 3.5
                wind_s = 18
            
            waves.append({
                '预报日期': forecast_date.strftime('%Y-%m-%d'),
                '预报时间': '08:00',
                '站点名称': station,
                '浪高': round(wave_h, 1),
                '浪周期': round(6 + (i % 3) * 1.5, 1),
                '风速': wind_s,
                '风向': ['东北风', '东南风', '南风', '东风'][i % 4],
                '预报发布时间': forecast_date.strftime('%Y-%m-%d') + (' 14:30:00' if is_delayed == '是' else ' 08:00:00'),
                '实际到达时间': forecast_date.strftime('%Y-%m-%d') + (' 14:30:00' if is_delayed == '是' else ' 08:00:00'),
                '是否延迟': is_delayed,
                '延迟原因': delay_reason
            })
    
    df_waves = pd.DataFrame(waves)
    wave_file = os.path.join(DEMO_DIR, '风浪预报数据.xlsx')
    df_waves.to_excel(wave_file, index=False)
    print(f'✓ 生成风浪预报数据: {wave_file} ({len(waves)} 条)')
    
    print()
    print('【验收场景说明】')
    print('  风浪预报晚到异常链路:')
    print('    样品箱 BOX007 (舟山站) → 采样日期 2024-06-17')
    print('    → 关联风浪预报 (舟山站 2024-06-17)')
    print('    → 预报延迟6小时 (气象卫星数据传输故障)')
    print('    → 系统自动标记为"风浪预报晚到"异常')
    print('    → 同时该样品箱存储温度 12.5℃ (越界) + 运输状态 delayed')
    print()
    print('  追溯路径:')
    print('    结果(异常样品箱) → 处理记录 → 风浪预报(来源) → 养殖日志 → 复核意见')
    print()
    
    return {
        'boxes': box_file,
        'logs': log_file,
        'waves': wave_file
    }


if __name__ == '__main__':
    generate_demo_data()
