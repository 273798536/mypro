#!/usr/bin/env python3
import requests
import json
import sys
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

BASE_URL = 'http://localhost:5001'

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

def test_health():
    print_header("健康检查")
    r = requests.get(f'{BASE_URL}/health')
    print_response(r)

def test_api_help():
    print_header("API 文档")
    r = requests.get(f'{BASE_URL}/api/help')
    data = r.json()
    print(f"API名称: {data['api_name']} v{data['version']}")
    for category, endpoints in data['endpoints'].items():
        print(f"\n{category}:")
        for path, desc in endpoints.items():
            print(f"  {path} - {desc}")

def test_create_forecast():
    print_header("创建预测")
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
    print_response(r)
    if r.status_code == 201:
        return r.json()['id']
    return None

def test_list_forecasts():
    print_header("获取预测列表")
    r = requests.get(f'{BASE_URL}/api/forecast?page=1&per_page=10')
    print_response(r)

def test_get_forecast(forecast_id):
    print_header(f"获取预测详情 ID={forecast_id}")
    r = requests.get(f'{BASE_URL}/api/forecast/{forecast_id}')
    data = r.json()
    print(f"预测名称: {data['forecast_name']}")
    print(f"总预计负债: {data['total_estimated_liability']} 元")
    print(f"风险提示数: {data['summary']['warning_count']}")
    if data['warnings']:
        print("\n风险提示:")
        for w in data['warnings'][:5]:
            print(f"  [{w['level']}] {w['message']}")
            if w['source_reference']:
                print(f"    来源: {w['source_reference']}")
    if data['curve']:
        print("\n预测曲线数据点:")
        for c in data['curve']:
            print(f"  {c['date']}: {c['cumulative_liability']} 元")

def test_update_status(forecast_id):
    print_header(f"推进预测状态 ID={forecast_id}")
    payload = {
        'status': 'reviewing',
        'updated_by': '财务-小红'
    }
    r = requests.put(f'{BASE_URL}/api/forecast/{forecast_id}/status', json=payload)
    print_response(r)

def test_correct_forecast(forecast_id):
    print_header(f"修正预测数据 ID={forecast_id}")
    payload = {
        'field_name': 'expected_expired_points',
        'old_value': 0,
        'new_value': 15000,
        'correction_reason': '根据历史数据调整过期预估，6月过期积分约1.5万',
        'corrected_by': '财务-小红',
        'source_reference': '历史数据报表第15行'
    }
    r = requests.post(f'{BASE_URL}/api/forecast/{forecast_id}/correct', json=payload)
    print_response(r)

def test_export_forecast(forecast_id):
    print_header(f"导出预测报告 ID={forecast_id}")
    r = requests.get(f'{BASE_URL}/api/forecast/{forecast_id}/export?format=xlsx')
    if r.status_code == 200:
        filename = f'forecast_{forecast_id}.xlsx'
        with open(filename, 'wb') as f:
            f.write(r.content)
        print(f"报告已导出: {filename}")
    else:
        print_response(r)

def test_points_ledger():
    print_header("积分账本查询")
    r = requests.get(f'{BASE_URL}/api/points/ledger?page=1&per_page=5')
    data = r.json()
    print(f"共 {data['total']} 个会员账本")
    for item in data['items']:
        print(f"  {item['member_id']} {item['member_name']}: 可用 {item['available_points']} 积分")

def test_expiry_simulate():
    print_header("积分过期试算")
    end_date = (datetime.now() + relativedelta(months=3)).strftime('%Y-%m-%d')
    r = requests.get(f'{BASE_URL}/api/points/expiry/simulate?end_date={end_date}')
    data = r.json()
    print(f"预计过期积分: {data['total_expired_points']}")
    print(f"影响会员数: {data['affected_ledger_count']}")
    if data['warnings']:
        print("\n跨月过期警告:")
        for w in data['warnings']:
            print(f"  {w['message']}")
            print(f"    来源: {w['source_reference']}")

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

def test_verify_coupon(redemption_id):
    print_header(f"核销兑换券 ID={redemption_id}")
    payload = {
        'success': True
    }
    r = requests.post(f'{BASE_URL}/api/coupons/verify/{redemption_id}', json=payload)
    print_response(r)

def test_verify_failed(redemption_id):
    print_header(f"核销失败测试 ID={redemption_id}")
    payload = {
        'success': False,
        'fail_reason': '库存不足，无法发放实物商品'
    }
    r = requests.post(f'{BASE_URL}/api/coupons/verify/{redemption_id}', json=payload)
    print_response(r)

def test_list_activities():
    print_header("活动计划列表")
    r = requests.get(f'{BASE_URL}/api/activities')
    data = r.json()
    print(f"共 {data['count']} 个活动计划")
    for item in data['items']:
        print(f"  {item['activity_name']}: {item['start_date']} ~ {item['end_date']}")

def main():
    print("\n" + "#"*60)
    print("#  会员积分负债预测 API - 功能测试工具")
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
        print("  所有测试完成!")
        print("="*60 + "\n")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ 无法连接到服务器，请先启动服务:")
        print("   python run.py")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 测试出错: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
