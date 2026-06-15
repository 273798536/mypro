#!/usr/bin/env python3
"""测试API功能"""
import urllib.request
import json
import sys

def test_health():
    try:
        with urllib.request.urlopen('http://localhost:8000/api/health') as resp:
            data = json.loads(resp.read().decode())
            print(f"[OK] 健康检查: {data}")
            return True
    except Exception as e:
        print(f"[FAIL] 健康检查: {e}")
        return False

def test_processing_records():
    try:
        with urllib.request.urlopen('http://localhost:8000/api/processing/records') as resp:
            data = json.loads(resp.read().decode())
            print(f"[OK] 处理记录: 共 {len(data)} 条")
            if data:
                print(f"     第一条: {data[0].get('record_no', 'N/A')}")
            return True
    except Exception as e:
        print(f"[FAIL] 处理记录: {e}")
        return False

def test_formulas():
    try:
        with urllib.request.urlopen('http://localhost:8000/api/calculation/formulas') as resp:
            data = json.loads(resp.read().decode())
            print(f"[OK] 计算公式: 共 {len(data)} 个")
            for f in data:
                print(f"     - {f['name']}: {f['unit']}")
                print(f"       适用范围: {f['scope'][:50]}...")
            return True
    except Exception as e:
        print(f"[FAIL] 计算公式: {e}")
        return False

def test_trace(anomaly_no):
    try:
        url = f'http://localhost:8000/api/trace/anomaly/{anomaly_no}'
        with urllib.request.urlopen(url) as resp:
            data = json.loads(resp.read().decode())
            print(f"[OK] 追溯查询 {anomaly_no}:")
            print(f"     异常: {data['anomaly']['anomaly_type']}")
            print(f"     处理记录: {data['processing_record']['record_no']}")
            print(f"     巡检照片: {data['inspection'].get('photo_path', '无')}")
            print(f"     处理意见: {data['processing_record'].get('processing_opinion', '无')}")
            return True
    except Exception as e:
        print(f"[FAIL] 追溯查询: {e}")
        return False

def test_trace_chain(anomaly_no):
    try:
        url = f'http://localhost:8000/api/trace/check-chain/{anomaly_no}'
        with urllib.request.urlopen(url) as resp:
            data = json.loads(resp.read().decode())
            print(f"[OK] 链路检查 {anomaly_no}:")
            print(f"     有效: {data['valid']}")
            print(f"     照片存在: {data['has_photo']}")
            print(f"     处理意见存在: {data['has_opinion']}")
            if data['valid']:
                print("     ✅ 验收标准通过: 可以查到巡检照片和处理意见")
            else:
                print(f"     ❌ 问题: {data.get('message', '未知')}")
            return data['valid']
    except Exception as e:
        print(f"[FAIL] 链路检查: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("海水浴场风险播报系统 - API测试")
    print("=" * 60)
    
    all_pass = True
    all_pass &= test_health()
    all_pass &= test_processing_records()
    all_pass &= test_formulas()
    all_pass &= test_trace('ANOM20250615001')
    all_pass &= test_trace_chain('ANOM20250615001')
    
    print("=" * 60)
    if all_pass:
        print("✅ 所有测试通过！")
    else:
        print("❌ 部分测试失败")
        sys.exit(1)
    print("=" * 60)
