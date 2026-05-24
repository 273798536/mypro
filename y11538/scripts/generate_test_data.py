#!/usr/bin/env python3
import json
import random
from datetime import datetime, timedelta

BATCH_ID = 'BATCH_2024_Q1_TRAINING_001'
COURSE_NAME = '2024年Q1企业合规培训'
TRAINING_DATE = '2024-03-15'

employees = [
    {'id': 'EMP001', 'name': '张三', 'dept': '技术部'},
    {'id': 'EMP002', 'name': '李四', 'dept': '市场部'},
    {'id': 'EMP003', 'name': '王五', 'dept': '人事部'},
    {'id': 'EMP004', 'name': '赵六', 'dept': '财务部'},
    {'id': 'EMP005', 'name': '钱七', 'dept': '技术部'},
    {'id': 'EMP006', 'name': '孙八', 'dept': '市场部'},
    {'id': 'EMP007', 'name': '周九', 'dept': '运营部'},
    {'id': 'EMP008', 'name': '吴十', 'dept': '技术部'},
]

def generate_registrations():
    data = []
    for emp in employees:
        data.append({
            'batch_id': BATCH_ID,
            'employee_id': emp['id'],
            'employee_name': emp['name'],
            'department': emp['dept'],
            'training_course': COURSE_NAME,
            'training_date': TRAINING_DATE,
            'registration_time': '2024-03-10 10:00:00',
            'amount': 100.0,
            'status': 'registered'
        })
    return data

def generate_sign_records():
    data = []
    sign_idx = 1
    
    for emp in employees[:6]:
        data.append({
            'batch_id': BATCH_ID,
            'sign_id': f'SIGN_{sign_idx:04d}',
            'employee_id': emp['id'],
            'employee_name': emp['name'],
            'training_course': COURSE_NAME,
            'sign_time': f'2024-03-15 09:{random.randint(0, 30):02d}:{random.randint(0, 59):02d}',
            'sign_type': 'normal',
            'qr_code': f'QR_{BATCH_ID}_{sign_idx:04d}',
            'location': '3楼会议室A',
            'device_info': 'iPhone 14',
            'is_proxy': False,
            'is_makeup': False
        })
        sign_idx += 1
    
    emp = employees[3]
    data.append({
        'batch_id': BATCH_ID,
        'sign_id': f'SIGN_{sign_idx:04d}',
        'employee_id': emp['id'],
        'employee_name': emp['name'],
        'training_course': COURSE_NAME,
        'sign_time': '2024-03-15 09:25:00',
        'sign_type': 'proxy',
        'qr_code': f'QR_{BATCH_ID}_{sign_idx:04d}',
        'location': '3楼会议室A',
        'device_info': '华为Mate 60',
        'is_proxy': True,
        'is_makeup': False
    })
    sign_idx += 1
    
    emp = employees[6]
    data.append({
        'batch_id': BATCH_ID,
        'sign_id': f'SIGN_{sign_idx:04d}',
        'employee_id': emp['id'],
        'employee_name': emp['name'],
        'training_course': COURSE_NAME,
        'sign_time': '2024-03-16 14:30:00',
        'sign_type': 'makeup',
        'qr_code': f'QR_{BATCH_ID}_{sign_idx:04d}',
        'location': '线上补签',
        'device_info': 'Web',
        'is_proxy': False,
        'is_makeup': True
    })
    sign_idx += 1
    
    return data

def generate_homeworks():
    data = []
    for i, emp in enumerate(employees[:5]):
        data.append({
            'batch_id': BATCH_ID,
            'homework_id': f'HW_{i+1:04d}',
            'employee_id': emp['id'],
            'employee_name': emp['name'],
            'training_course': COURSE_NAME,
            'submit_time': f'2024-03-16 {10+i}:00:00',
            'score': round(random.uniform(70, 100), 1),
            'status': 'submitted'
        })
    return data

def generate_refunds():
    return [{
        'batch_id': BATCH_ID,
        'refund_id': 'REFUND_001',
        'employee_id': 'EMP007',
        'employee_name': '周九',
        'training_course': COURSE_NAME,
        'refund_amount': 100.0,
        'refund_time': '2024-03-17 10:00:00',
        'refund_reason': '员工离职'
    }]

def generate_dirty_data():
    return [
        {
            'type': 'registration',
            'data': {
                'batch_id': BATCH_ID,
                'employee_id': 'EMP_DIRTY01',
                'training_course': COURSE_NAME
            }
        },
        {
            'type': 'sign',
            'data': {
                'batch_id': BATCH_ID,
                'sign_id': 'SIGN_DIRTY01',
                'employee_id': 'EMP001',
                'employee_name': '张三三',
                'training_course': COURSE_NAME,
                'sign_time': '2024-03-15 09:05:00'
            }
        }
    ]

if __name__ == '__main__':
    print('=== 测试数据生成 ===')
    print(f'\n批次ID: {BATCH_ID}')
    print(f'培训课程: {COURSE_NAME}')
    
    print('\n1. 报名表数据:')
    for r in generate_registrations():
        print(f"   {r['employee_id']} - {r['employee_name']}")
    
    print('\n2. 签到记录:')
    for s in generate_sign_records():
        proxy_marker = ' [代签]' if s['is_proxy'] else ''
        makeup_marker = ' [补签]' if s['is_makeup'] else ''
        print(f"   {s['sign_id']} - {s['employee_name']} - {s['sign_time']}{proxy_marker}{makeup_marker}")
    
    print('\n3. 课后作业:')
    for h in generate_homeworks():
        print(f"   {h['homework_id']} - {h['employee_name']} - {h['score']}分")
    
    print('\n4. 退款流水:')
    for r in generate_refunds():
        print(f"   {r['refund_id']} - {r['employee_name']} - {r['refund_amount']}元")
    
    print('\n5. 脏数据示例:')
    for d in generate_dirty_data():
        print(f"   {d['type']} - {json.dumps(d['data'], ensure_ascii=False)}")
    
    with open(f'test_data_{BATCH_ID}.json', 'w', encoding='utf-8') as f:
        json.dump({
            'batch_id': BATCH_ID,
            'registrations': generate_registrations(),
            'signs': generate_sign_records(),
            'homeworks': generate_homeworks(),
            'refunds': generate_refunds(),
            'dirty_samples': generate_dirty_data()
        }, f, ensure_ascii=False, indent=2)
    
    print(f'\n测试数据已保存到: test_data_{BATCH_ID}.json')
