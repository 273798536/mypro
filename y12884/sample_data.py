import sqlite3
import json
from datetime import datetime, timedelta
from database import get_connection, init_db


def load_sample_data():
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    today = datetime.now()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)
    day_after = today + timedelta(days=2)

    sample_records = [
        {
            'record_no': 'HJ202606001',
            'project_name': '东海大桥桩基加固工程',
            'construction_area': '东海大桥海域禁航区A段',
            'coordinates': '122.1234,30.5678',
            'planned_date': tomorrow.strftime('%Y-%m-%d'),
            'construction_type': '水下桩基施工',
            'submitter': '张工',
            'submit_time': yesterday.strftime('%Y-%m-%d %10:30:00')
        },
        {
            'record_no': 'HJ202606002',
            'project_name': '宁波舟山港航道疏浚',
            'construction_area': '舟山港进港航道B区',
            'coordinates': '121.8765,29.9876',
            'planned_date': tomorrow.strftime('%Y-%m-%d'),
            'construction_type': '航道疏浚作业',
            'submitter': '李工',
            'submit_time': yesterday.strftime('%Y-%m-%d %14:20:00')
        },
        {
            'record_no': 'HJ202606003',
            'project_name': '温州海域海底电缆铺设',
            'construction_area': '温州洞头列岛保护区边缘',
            'coordinates': '121.1111,27.6543',
            'planned_date': day_after.strftime('%Y-%m-%d'),
            'construction_type': '海底电缆铺设',
            'submitter': '王工',
            'submit_time': today.strftime('%Y-%m-%d %09:15:00')
        },
        {
            'record_no': 'HJ202606004',
            'project_name': '洋山港四期码头扩建',
            'construction_area': '洋山港保税区作业区',
            'coordinates': '122.3333,30.6666',
            'planned_date': tomorrow.strftime('%Y-%m-%d'),
            'construction_type': '码头平台浇筑',
            'submitter': '赵工',
            'submit_time': yesterday.strftime('%Y-%m-%d %16:45:00')
        },
        {
            'record_no': 'HJ202606005',
            'project_name': '台州沿海风电安装',
            'construction_area': '台州温岭海域风电区',
            'coordinates': '121.5555,28.4444',
            'planned_date': tomorrow.strftime('%Y-%m-%d'),
            'construction_type': '风机吊装作业',
            'submitter': '孙工',
            'submit_time': today.strftime('%Y-%m-%d %08:00:00')
        }
    ]

    for rec in sample_records:
        cursor.execute('''
        INSERT OR IGNORE INTO records 
        (record_no, project_name, construction_area, coordinates, planned_date, 
         construction_type, submitter, submit_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ''', (rec['record_no'], rec['project_name'], rec['construction_area'],
              rec['coordinates'], rec['planned_date'], rec['construction_type'],
              rec['submitter'], rec['submit_time']))

    conn.commit()

    cursor.execute("SELECT id, record_no, planned_date FROM records")
    records = cursor.fetchall()

    forecast_data = {
        'HJ202606001': {
            'forecasts': [
                {
                    'forecast_date': tomorrow.strftime('%Y-%m-%d'),
                    'wind_level': 3,
                    'wave_height': 0.8,
                    'visibility': 10,
                    'forecast_source': '国家海洋预报台',
                    'forecast_time': yesterday.strftime('%Y-%m-%d %18:00:00'),
                    'is_delayed': 0
                }
            ]
        },
        'HJ202606002': {
            'forecasts': [
                {
                    'forecast_date': tomorrow.strftime('%Y-%m-%d'),
                    'wind_level': 7,
                    'wave_height': 3.2,
                    'visibility': 2,
                    'forecast_source': '浙江省海洋监测站',
                    'forecast_time': today.strftime('%Y-%m-%d %07:30:00'),
                    'is_delayed': 0
                }
            ]
        },
        'HJ202606003': {
            'forecasts': [
                {
                    'forecast_date': day_after.strftime('%Y-%m-%d'),
                    'wind_level': 5,
                    'wave_height': 1.8,
                    'visibility': 5,
                    'forecast_source': '温州海洋预报台',
                    'forecast_time': yesterday.strftime('%Y-%m-%d %20:00:00'),
                    'is_delayed': 1,
                    'delay_reason': '海上监测浮标通信故障，数据延迟48小时'
                }
            ]
        },
        'HJ202606004': {
            'forecasts': [
                {
                    'forecast_date': tomorrow.strftime('%Y-%m-%d'),
                    'wind_level': 4,
                    'wave_height': 1.2,
                    'visibility': 8,
                    'forecast_source': '上海海洋预报中心',
                    'forecast_time': yesterday.strftime('%Y-%m-%d %17:00:00'),
                    'is_delayed': 0
                }
            ]
        },
        'HJ202606005': {
            'forecasts': []
        }
    }

    for rec in records:
        rec_id = rec['id']
        rec_no = rec['record_no']
        if rec_no in forecast_data:
            for fc in forecast_data[rec_no]['forecasts']:
                cursor.execute('''
                INSERT INTO weather_forecasts 
                (record_id, forecast_date, wind_level, wave_height, visibility, 
                 forecast_source, forecast_time, is_delayed, delay_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (rec_id, fc['forecast_date'], fc['wind_level'], fc['wave_height'],
                      fc['visibility'], fc['forecast_source'], fc['forecast_time'],
                      fc.get('is_delayed', 0), fc.get('delay_reason')))

    conn.commit()
    conn.close()
    print("样例数据加载完成，共导入 {} 条核查记录".format(len(sample_records)))


if __name__ == '__main__':
    load_sample_data()
