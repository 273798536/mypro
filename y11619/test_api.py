#!/usr/bin/env python3
import requests
import json
import sys
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

BASE_URL = 'http://localhost:5001'
failures = []

def print_header(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def print_response(response):
    try:
        data = response.json()
        print(json.dumps(data, ensure_ascii=False, indent=2))
    except:
        print(response.text)

def assert_eq(label, actual, expected):
    if actual != expected:
        msg = f"  ✗ {label}: 期望={expected}, 实际={actual}"
        print(msg)
        failures.append(msg)
    else:
        print(f"  ✓ {label}: {actual}")

def assert_gt(label, actual, threshold):
    if actual <= threshold:
        msg = f"  ✗ {label}: 期望>{threshold}, 实际={actual}"
        print(msg)
        failures.append(msg)
    else:
        print(f"  ✓ {label}: {actual}")

def assert_true(label, condition, detail=""):
    if not condition:
        msg = f"  ✗ {label}: 条件不满足 {detail}"
        print(msg)
        failures.append(msg)
    else:
        print(f"  ✓ {label} {detail}")

def test_health():
    print_header("健康检查")
    r = requests.get(f'{BASE_URL}/health')
    print_response(r)

def test_api_help():
    print_header("API 文档")
    r = requests.get(f'{BASE_URL}/api/help')
    data = r.json()
    print(f"API名称: {data['api_name']} v{data['version']}")

def test_points_ledger():
    print_header("积分账本查询")
    r = requests.get(f'{BASE_URL}/api/points/ledger?page=1&per_page=5')
    data = r.json()
    print(f"共 {data['total']} 个会员账本")
    for item in data['items']:
        print(f"  {item['member_id']} {item['member_name']}: 可用 {item['available_points']} 积分")

def test_expiry_simulate():
    print_header("积分过期试算 + 跨月隔离验证")
    end_date = (datetime.now() + relativedelta(months=3)).strftime('%Y-%m-%d')
    r = requests.get(f'{BASE_URL}/api/points/expiry/simulate?end_date={end_date}')
    data = r.json()
    
    print(f"全部过期积分: {data['total_expired_points']}")
    print(f"正常过期积分: {data['normal_expired_points']}")
    print(f"跨月过期积分: {data['cross_month_expired_points']}")
    
    assert_eq("normal + cross_month == total",
              data['normal_expired_points'] + data['cross_month_expired_points'],
              data['total_expired_points'])
    
    if data['cross_month_expired_points'] > 0:
        assert_true("跨月过期已隔离",
                    data['normal_expired_points'] < data['total_expired_points'],
                    f"正常={data['normal_expired_points']} < 总计={data['total_expired_points']}")
    else:
        print("  ℹ 本期无跨月过期数据")
    
    if data['warnings']:
        print(f"\n跨月过期警告 ({len(data['warnings'])} 条):")
        for w in data['warnings'][:3]:
            print(f"  {w['message']}")
            print(f"    来源: {w['source_reference']}")
        if len(data['warnings']) > 3:
            print(f"  ... 共 {len(data['warnings'])} 条")

def test_pending_refunds():
    print_header("待处理退款列表")
    r = requests.get(f'{BASE_URL}/api/refunds/pending')
    data = r.json()
    print(f"待处理退款: {data['count']} 笔")
    for item in data['items']:
        print(f"  订单 {item['order_no']}: 返还 {item['return_points']} 积分, 源行={item['source_line']}")

def test_process_refund(refund_id):
    print_header(f"处理退款 ID={refund_id}")
    r = requests.post(f'{BASE_URL}/api/refunds/{refund_id}/process')
    print_response(r)

def test_list_coupons():
    print_header("兑换券列表")
    r = requests.get(f'{BASE_URL}/api/coupons')
    data = r.json()
    print(f"共 {data['count']} 种兑换券")
    for item in data['items']:
        print(f"  {item['coupon_code']} {item['coupon_name']}: {item['remaining_quantity']}/{item['total_quantity']} 剩余")

def test_redeem_coupon():
    print_header("积分兑换券")
    payload = {
        'coupon_code': 'COUPON001',
        'member_id': 'M001'
    }
    r = requests.post(f'{BASE_URL}/api/coupons/redeem', json=payload)
    print_response(r)
    if r.status_code == 200:
        return r.json()['redemption_id']
    return None

def test_verify_failed(redemption_id):
    print_header(f"核销失败测试 ID={redemption_id}")
    payload = {
        'success': False,
        'fail_reason': '库存不足，无法发放实物商品'
    }
    r = requests.post(f'{BASE_URL}/api/coupons/verify/{redemption_id}', json=payload)
    data = r.json()
    print_response(r)
    if r.status_code == 200 and data.get('warnings'):
        assert_true("核销失败产生警告", True, data['warnings'][0]['message'])

def test_list_activities():
    print_header("活动计划列表")
    r = requests.get(f'{BASE_URL}/api/activities')
    data = r.json()
    print(f"共 {data['count']} 个活动计划")
    for item in data['items']:
        print(f"  {item['activity_name']}: {item['start_date']} ~ {item['end_date']}")

def test_create_forecast():
    print_header("创建预测 + 跨月隔离核心验证")
    start_date = datetime.now().strftime('%Y-%m-%d')
    end_date = (datetime.now() + relativedelta(months=3)).strftime('%Y-%m-%d')
    
    payload = {
        'forecast_name': '618大促积分负债预测',
        'start_date': start_date,
        'end_date': end_date,
        'forecast_period': 'monthly',
        'points_per_yuan': 0.01,
        'created_by': '运营-小明',
        'remark': '618大促前负债预估，包含过期、退款、券兑换'
    }
    r = requests.post(f'{BASE_URL}/api/forecast', json=payload)
    data = r.json()
    
    if r.status_code != 201:
        print(f"  ✗ 创建预测失败: {data}")
        return None
    
    print(f"预测ID: {data['id']}")
    print(f"expected_expired_points(正常): {data['expected_expired_points']}")
    print(f"cross_month_expired_points: {data['cross_month_expired_points']}")
    print(f"total_estimated_liability: {data['total_estimated_liability']}")
    
    expired_pts = data['expected_expired_points']
    cross_pts = data['cross_month_expired_points']
    refund_pts = data['expected_refund_points']
    coupon_cost = data['expected_coupon_cost']
    ppy = data['points_per_yuan']
    total_liab = data['total_estimated_liability']
    
    expected_liab = (expired_pts + refund_pts) * ppy + coupon_cost
    assert_eq("total_estimated_liability 仅含正常过期+退款+券成本",
              round(total_liab, 2), round(expected_liab, 2))
    
    if cross_pts > 0:
        wrong_liab = (expired_pts + cross_pts + refund_pts) * ppy + coupon_cost
        assert_true("跨月过期未混入正常负债",
                    abs(total_liab - wrong_liab) > 0.01,
                    f"实际负债={total_liab}, 若含跨月应为={wrong_liab}")
    
    assert_true("expected_expired_points 不含跨月部分",
                expired_pts == data['total_points_balance'] - cross_pts or expired_pts < data['total_points_balance'],
                f"正常过期={expired_pts}, 跨月={cross_pts}")
    
    warning_types = [w['type'] for w in data['warnings']]
    if cross_pts > 0:
        assert_true("存在跨月过期警告",
                    'cross_month_expiry' in warning_types,
                    f"警告类型={set(warning_types)}")
    
    return data['id']

def test_get_forecast(forecast_id):
    print_header(f"获取预测详情 ID={forecast_id} + 隔离复查")
    r = requests.get(f'{BASE_URL}/api/forecast/{forecast_id}')
    data = r.json()
    
    print(f"预测名称: {data['forecast_name']}")
    print(f"expected_expired_points(正常): {data['expected_expired_points']}")
    print(f"cross_month_expired_points: {data['cross_month_expired_points']}")
    print(f"total_estimated_liability: {data['total_estimated_liability']}")
    print(f"风险提示数: {data['summary']['warning_count']}")
    
    expired_pts = data['expected_expired_points']
    cross_pts = data['cross_month_expired_points']
    refund_pts = data['expected_refund_points']
    coupon_cost = data['expected_coupon_cost']
    ppy = data['points_per_yuan']
    total_liab = data['total_estimated_liability']
    
    expected_liab = (expired_pts + refund_pts) * ppy + coupon_cost
    assert_eq("详情页 total_estimated_liability 仅含正常数据",
              round(total_liab, 2), round(expected_liab, 2))
    
    if cross_pts > 0:
        assert_true("详情页跨月过期未混入正常负债",
                    expired_pts + cross_pts != expired_pts,
                    f"正常={expired_pts}, 跨月={cross_pts}")
    
    summary = data['summary']
    assert_true("summary 含 cross_month_expired_liability",
                'cross_month_expired_liability' in summary,
                f"keys={list(summary.keys())}")
    
    if data['warnings']:
        print(f"\n风险提示 (前3条):")
        for w in data['warnings'][:3]:
            print(f"  [{w['level']}] {w['message']}")
            if w['source_reference']:
                print(f"    来源: {w['source_reference']}")
    
    if data['curve']:
        print(f"\n预测曲线数据点 ({len(data['curve'])} 个):")
        for c in data['curve']:
            print(f"  {c['date']}: {c['cumulative_liability']} 元")

def test_list_forecasts():
    print_header("获取预测列表")
    r = requests.get(f'{BASE_URL}/api/forecast?page=1&per_page=10')
    data = r.json()
    print(f"共 {data['total']} 条预测记录")

def test_update_status(forecast_id):
    print_header(f"推进预测状态 ID={forecast_id}")
    payload = {
        'status': 'reviewing',
        'updated_by': '财务-小红'
    }
    r = requests.put(f'{BASE_URL}/api/forecast/{forecast_id}/status', json=payload)
    data = r.json()
    print_response(r)
    if r.status_code == 200:
        assert_eq("状态已更新", data['new_status'], 'reviewing')

def test_correct_forecast(forecast_id):
    print_header(f"修正预测数据 ID={forecast_id}")
    r = requests.get(f'{BASE_URL}/api/forecast/{forecast_id}')
    old_expired = r.json()['expected_expired_points']
    
    payload = {
        'field_name': 'expected_expired_points',
        'old_value': old_expired,
        'new_value': 15000,
        'correction_reason': '根据历史数据调整过期预估，6月过期积分约1.5万',
        'corrected_by': '财务-小红',
        'source_reference': '历史数据报表第15行'
    }
    r = requests.post(f'{BASE_URL}/api/forecast/{forecast_id}/correct', json=payload)
    data = r.json()
    print_response(r)
    
    if r.status_code == 200:
        assert_eq("修正后字段值", str(data['new_value']), '15000')
        r2 = requests.get(f'{BASE_URL}/api/forecast/{forecast_id}')
        updated = r2.json()
        assert_eq("修正后 expected_expired_points", str(updated['expected_expired_points']), '15000')
        
        expired_pts = updated['expected_expired_points']
        refund_pts = updated['expected_refund_points']
        coupon_cost = updated['expected_coupon_cost']
        ppy = updated['points_per_yuan']
        total_liab = updated['total_estimated_liability']
        expected_liab = (expired_pts + refund_pts) * ppy + coupon_cost
        assert_eq("修正后负债仍仅含正常数据",
                  round(total_liab, 2), round(expected_liab, 2))

def test_export_forecast(forecast_id):
    print_header(f"导出预测报告 ID={forecast_id}")
    r = requests.get(f'{BASE_URL}/api/forecast/{forecast_id}/export?format=xlsx')
    if r.status_code == 200:
        filename = f'forecast_{forecast_id}.xlsx'
        with open(filename, 'wb') as f:
            f.write(r.content)
        print(f"报告已导出: {filename}")
    else:
        print(f"  ✗ 导出失败: {r.status_code}")
        failures.append(f"导出失败: {r.status_code}")

def main():
    print("\n" + "#"*60)
    print("#  会员积分负债预测 API - 功能测试 (含跨月隔离验证)")
    print("#"*60)
    
    try:
        test_health()
        test_api_help()
        
        test_points_ledger()
        test_expiry_simulate()
        test_pending_refunds()
        test_list_coupons()
        test_list_activities()
        
        forecast_id = test_create_forecast()
        if forecast_id:
            test_list_forecasts()
            test_get_forecast(forecast_id)
            test_update_status(forecast_id)
            test_correct_forecast(forecast_id)
            test_get_forecast(forecast_id)
            test_export_forecast(forecast_id)
        
        redemption_id = test_redeem_coupon()
        if redemption_id:
            test_verify_failed(redemption_id)
        
        refunds = requests.get(f'{BASE_URL}/api/refunds/pending').json()
        if refunds['items']:
            test_process_refund(refunds['items'][0]['id'])
        
        print("\n" + "="*60)
        if failures:
            print(f"  ❌ 测试完成，{len(failures)} 项断言失败:")
            for f in failures:
                print(f)
            sys.exit(1)
        else:
            print("  ✅ 所有测试通过，跨月过期积分已从正常负债中隔离")
        print("="*60 + "\n")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ 无法连接到服务器，请先启动服务:")
        print("   python3 run.py")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 测试出错: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
