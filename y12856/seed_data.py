#!/usr/bin/env python3
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db, get_conn

SAMPLE_DATE = '2026-06-10'


def seed():
    init_db()
    conn = get_conn()
    c = conn.cursor()

    c.execute('DELETE FROM visibility_records')
    c.execute('DELETE FROM ship_tracks_clean')
    c.execute('DELETE FROM ship_tracks')
    c.execute('DELETE FROM ships')
    c.execute('DELETE FROM wind_wave_forecasts')
    c.execute('DELETE FROM inspection_photos')
    c.execute('DELETE FROM aquaculture_logs')
    c.execute('DELETE FROM no_go_zones')
    c.execute('DELETE FROM dive_sites')
    c.execute('DELETE FROM process_runs')

    sites = [
        {'name': '东澳岛珊瑚礁潜点', 'lat': 22.023, 'lng': 113.712, 'radius_m': 150},
        {'name': '万山岛深水网箱区', 'lat': 21.935, 'lng': 113.728, 'radius_m': 200},
        {'name': '桂山岛海藻床观测点', 'lat': 22.127, 'lng': 113.815, 'radius_m': 120},
    ]
    site_ids = []
    for s in sites:
        cur = c.execute('INSERT INTO dive_sites (name, lat, lng, radius_m) VALUES (?, ?, ?, ?)',
                        (s['name'], s['lat'], s['lng'], s['radius_m']))
        site_ids.append(cur.lastrowid)

    zones = [
        {
            'name': '中华白海豚核心保护区',
            'description': '全年禁航，任何船舶不得进入',
            'polygon': [
                [22.040, 113.680], [22.060, 113.680], [22.060, 113.730], [22.040, 113.730]
            ]
        },
        {
            'name': '万山岛军事禁锚区',
            'description': '禁止抛锚及低速徘徊',
            'polygon': [
                [21.920, 113.710], [21.950, 113.710], [21.950, 113.750], [21.920, 113.750]
            ]
        },
        {
            'name': '桂山岛航道禁渔区',
            'description': '主航道两侧禁止渔业作业',
            'polygon': [
                [22.110, 113.800], [22.140, 113.800], [22.140, 113.840], [22.110, 113.840]
            ]
        },
    ]
    for z in zones:
        c.execute('INSERT INTO no_go_zones (name, polygon, description) VALUES (?, ?, ?)',
                  (z['name'], json.dumps(z['polygon']), z['description']))

    ships = [
        {'name': '深渔运001', 'mmsi': '413123456'},
        {'name': '科考船探索号', 'mmsi': '413234567'},
        {'name': '养殖工船海丰号', 'mmsi': '413345678'},
        {'name': '休闲海钓蓝鲸号', 'mmsi': '413456789'},
        {'name': '巡检艇海燕号', 'mmsi': '413567890'},
    ]
    ship_ids = []
    for s in ships:
        cur = c.execute('INSERT INTO ships (name, mmsi) VALUES (?, ?)', (s['name'], s['mmsi']))
        ship_ids.append(cur.lastrowid)

    s1_id, s2_id, s3_id, s4_id, s5_id = ship_ids

    tracks_s1_normal = []
    base_time = f'{SAMPLE_DATE} 08:00:00'
    for i in range(20):
        h, m = divmod(i * 15, 60)
        tracks_s1_normal.append({
            'ship_id': s1_id,
            'recorded_at': f'{SAMPLE_DATE} {8+h:02d}:{m:02d}:00',
            'lat': 22.020 + i * 0.001,
            'lng': 113.705 + i * 0.0008,
            'speed': 5.0 + i * 0.1,
            'heading': 90.0,
            'source': 'AIS'
        })

    tracks_s2_violation = []
    for i in range(15):
        h, m = divmod(i * 20, 60)
        lat = 21.925 + i * 0.002
        lng = 113.715 + i * 0.002
        if 4 <= i <= 8:
            lat = 21.930 + (i - 6) * 0.001
            lng = 113.725 + (i - 6) * 0.001
        tracks_s2_violation.append({
            'ship_id': s2_id,
            'recorded_at': f'{SAMPLE_DATE} {9+h:02d}:{m:02d}:00',
            'lat': lat, 'lng': lng, 'speed': 4.0, 'heading': 45.0, 'source': 'AIS'
        })

    tracks_s3_bad = [
        {'ship_id': s3_id, 'recorded_at': f'{SAMPLE_DATE} 07:30:00', 'lat': 22.120, 'lng': 113.800, 'speed': 3.0, 'heading': 0, 'source': 'AIS'},
        {'ship_id': s3_id, 'recorded_at': f'{SAMPLE_DATE} 07:45:00', 'lat': None, 'lng': 113.805, 'speed': 3.5, 'heading': 0, 'source': 'AIS'},
        {'ship_id': s3_id, 'recorded_at': f'{SAMPLE_DATE} 08:00:00', 'lat': 999.999, 'lng': 113.810, 'speed': 4.0, 'heading': 0, 'source': 'AIS'},
        {'ship_id': s3_id, 'recorded_at': 'BAD_TIMESTAMP', 'lat': 22.135, 'lng': 113.815, 'speed': 4.5, 'heading': 0, 'source': 'AIS'},
        {'ship_id': s3_id, 'recorded_at': f'{SAMPLE_DATE} 08:30:00', 'lat': 22.140, 'lng': 113.820, 'speed': 200.0, 'heading': 0, 'source': 'AIS'},
        {'ship_id': s3_id, 'recorded_at': f'{SAMPLE_DATE} 08:45:00', 'lat': 22.145, 'lng': 250.0, 'speed': 5.0, 'heading': 0, 'source': 'AIS'},
    ]

    tracks_s4_missing = [
        {'ship_id': s4_id, 'recorded_at': f'{SAMPLE_DATE} 10:00:00', 'lat': None, 'lng': None, 'speed': None, 'heading': None, 'source': 'import'},
        {'ship_id': s4_id, 'recorded_at': 'NOT_A_DATE', 'lat': 22.0, 'lng': 113.7, 'speed': None, 'heading': None, 'source': 'import'},
        {'ship_id': s4_id, 'recorded_at': f'{SAMPLE_DATE} 10:30:00', 'lat': 1000, 'lng': 2000, 'speed': 999, 'heading': 999, 'source': 'import'},
    ]

    tracks_s5_guishan_violation = []
    for i in range(12):
        tracks_s5_violation = {
            'ship_id': s5_id,
            'recorded_at': f'{SAMPLE_DATE} {10 + (i // 4):02d}:{(i % 4) * 15:02d}:00',
            'lat': 22.115 + i * 0.002 if i < 3 else (22.122 if i < 8 else 22.122 + (i-8) * 0.002),
            'lng': 113.805 + i * 0.002 if i < 3 else (113.815 if i < 8 else 113.815 + (i-8) * 0.002),
            'speed': 2.5, 'heading': 180.0, 'source': 'AIS'
        }
        tracks_s5_guishan_violation.append(tracks_s5_violation)

    all_tracks = tracks_s1_normal + tracks_s2_violation + tracks_s3_bad + tracks_s4_missing + tracks_s5_guishan_violation
    for t in all_tracks:
        c.execute('''INSERT INTO ship_tracks (ship_id, recorded_at, lat, lng, speed, heading, source, raw_data)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                  (t['ship_id'], t['recorded_at'], t['lat'], t['lng'], t['speed'], t['heading'], t['source'], json.dumps(t)))

    forecasts = [
        {'site_id': site_ids[0], 'forecast_for': f'{SAMPLE_DATE} 12:00:00', 'issued_at': f'{SAMPLE_DATE} 06:00:00',
         'wind_speed': 6.5, 'wind_direction': 135, 'wave_height': 1.2, 'wave_period': 6,
         'is_delayed': 0, 'status': 'confirmed'},
        {'site_id': site_ids[1], 'forecast_for': f'{SAMPLE_DATE} 12:00:00', 'issued_at': f'{SAMPLE_DATE} 11:30:00',
         'wind_speed': None, 'wind_direction': None, 'wave_height': None, 'wave_period': None,
         'is_delayed': 1, 'status': 'pending'},
        {'site_id': site_ids[2], 'forecast_for': f'{SAMPLE_DATE} 12:00:00', 'issued_at': f'{SAMPLE_DATE} 05:30:00',
         'wind_speed': 8.2, 'wind_direction': 180, 'wave_height': 1.8, 'wave_period': 7,
         'is_delayed': 0, 'status': 'pending'},
    ]
    for f in forecasts:
        c.execute('''INSERT INTO wind_wave_forecasts
                     (site_id, forecast_for, issued_at, wind_speed, wind_direction, wave_height, wave_period, is_delayed, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (f['site_id'], f['forecast_for'], f['issued_at'], f['wind_speed'], f['wind_direction'],
                   f['wave_height'], f['wave_period'], f['is_delayed'], f['status']))

    photos = [
        {'site_id': site_ids[0], 'taken_at': f'{SAMPLE_DATE} 09:15:00', 'photo_path': '/photos/site1_1.jpg',
         'visibility_estimate': 12.5, 'notes': '水下相机拍摄，珊瑚清晰', 'uploaded_by': '张巡检'},
        {'site_id': site_ids[0], 'taken_at': f'{SAMPLE_DATE} 10:30:00', 'photo_path': '/photos/site1_2.jpg',
         'visibility_estimate': 11.0, 'notes': '略有悬浮物', 'uploaded_by': '张巡检'},
        {'site_id': site_ids[1], 'taken_at': f'{SAMPLE_DATE} 09:45:00', 'photo_path': '/photos/site2_1.jpg',
         'visibility_estimate': 6.5, 'notes': '网箱附近水体浑浊', 'uploaded_by': '李养殖'},
        {'site_id': site_ids[2], 'taken_at': f'{SAMPLE_DATE} 11:00:00', 'photo_path': '/photos/site3_1.jpg',
         'visibility_estimate': None, 'notes': '照片模糊，无法估读', 'uploaded_by': '王观测'},
    ]
    for p in photos:
        c.execute('''INSERT INTO inspection_photos (site_id, taken_at, photo_path, visibility_estimate, notes, uploaded_by)
                     VALUES (?, ?, ?, ?, ?, ?)''',
                  (p['site_id'], p['taken_at'], p['photo_path'], p['visibility_estimate'], p['notes'], p['uploaded_by']))

    logs = [
        {'site_id': site_ids[0], 'log_date': SAMPLE_DATE, 'water_temp': 26.8, 'turbidity': 2.1, 'notes': '正常'},
        {'site_id': site_ids[1], 'log_date': SAMPLE_DATE, 'water_temp': 27.1, 'turbidity': 5.8, 'notes': '投喂后浊度偏高'},
        {'site_id': site_ids[2], 'log_date': SAMPLE_DATE, 'water_temp': 26.5, 'turbidity': 3.2, 'notes': ''},
    ]
    for lg in logs:
        c.execute('INSERT INTO aquaculture_logs (site_id, log_date, water_temp, turbidity, notes) VALUES (?, ?, ?, ?, ?)',
                  (lg['site_id'], lg['log_date'], lg['water_temp'], lg['turbidity'], lg['notes']))

    conn.commit()
    conn.close()
    print(f'✅ 测试数据已载入，日期: {SAMPLE_DATE}')
    print(f'   潜点: {len(sites)} 个')
    print(f'   禁航区: {len(zones)} 个')
    print(f'   船舶: {len(ships)} 艘')
    print(f'   轨迹点: {len(all_tracks)} 个 (包含异常数据)')
    print(f'   预报: {len(forecasts)} 条 (含1条延迟未确认, 1条待确认)')
    print(f'   巡检照片: {len(photos)} 张 (含1张无法估读的坏数据)')
    print(f'   养殖日志: {len(logs)} 条')
    print()
    print('📋 场景覆盖:')
    print('   1. 深渔运001: 正常轨迹，可正常清洗')
    print('   2. 科考船探索号: 进入万山岛军事禁锚区 → 会被检出越界')
    print('   3. 养殖工船海丰号: 混入6种真实坏数据(坐标缺失/越界/时间错/速度异常/经度越界)')
    print('   4. 休闲海钓蓝鲸号: 轨迹全部异常 → 清洗后0条，触发轨迹缺失分支')
    print('   5. 巡检艇海燕号: 进入桂山岛航道禁渔区 → 会被检出越界')
    print('   6. 万山岛预报: 延迟到达、数据为空 → 待补录')
    print('   7. 桂山岛预报: 正常但未确认 → 待人工确认')
    print('   8. 桂山岛照片: 模糊无法估读 → 真实坏数据混入')


if __name__ == '__main__':
    seed()
