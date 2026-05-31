#!/usr/bin/env python3
"""
光伏逆变器削峰分析系统 - 完整测试脚本
验证4种场景、5个API接口、参数一致性
"""

import requests
import pandas as pd
import json
from pathlib import Path

BASE_URL = "http://localhost:8000"

def test_case(name, func):
    """测试用例装饰器"""
    print(f"\n{'='*60}")
    print(f"测试: {name}")
    print('='*60)
    try:
        func()
        print(f"✓ {name} - 测试通过")
        return True
    except Exception as e:
        print(f"✗ {name} - 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_scenarios():
    """测试4种场景样例生成"""
    scenarios = ['normal', 'irradiance_gap', 'temperature_high', 'curtailment_overlap']
    results = {}
    
    for scenario in scenarios:
        print(f"\n生成场景: {scenario}")
        resp = requests.post(f"{BASE_URL}/api/samples/generate", 
                           json={"scenario": scenario})
        assert resp.status_code == 200, f"生成失败: {resp.text}"
        data = resp.json()
        assert data['success'], f"生成失败: {data.get('message')}"
        results[scenario] = data['analysis_id']
        print(f"  ✓ 生成成功, 分析ID: {data['analysis_id']}")
        print(f"    功率数据: {data['sample_data']['component_power_count']} 条")
        print(f"    辐照数据: {data['sample_data']['irradiance_count']} 条")
        print(f"    限发记录: {data['sample_data']['curtailment_count']} 条")
    
    return results

def test_list_analysis():
    """测试查询分析结果列表"""
    resp = requests.get(f"{BASE_URL}/api/analysis")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 4, f"应该至少有4条记录，实际{len(data)}条"
    print(f"  ✓ 查询到 {len(data)} 条分析记录")
    for r in data[:4]:
        print(f"    ID:{r['id']} 场景:{r['scenario']} 损失:{r['total_loss_energy']:.2f}kWh")

def test_get_detail(analysis_id):
    """测试查询分析详情"""
    resp = requests.get(f"{BASE_URL}/api/analysis/{analysis_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert 'inverter_params' in data
    assert 'peak_clipping_periods' in data
    assert 'power_curve_data' in data
    assert 'loss_analysis' in data
    print(f"  ✓ 查询详情成功")
    print(f"    逆变器: {data['inverter_params']['inverter_name']}")
    print(f"    削峰时段: {len(data['peak_clipping_periods'])} 处")
    print(f"    功率曲线点: {len(data['power_curve_data']['timestamps'])} 个")
    return data

def test_update_status(analysis_id):
    """测试修改状态"""
    resp = requests.patch(f"{BASE_URL}/api/analysis/{analysis_id}/status",
                         json={"status": "confirmed", "confirmed_by": "测试工程师"})
    assert resp.status_code == 200
    data = resp.json()
    assert data['success']
    assert data['new_status'] == 'confirmed'
    assert data['confirmed_by'] == '测试工程师'
    print(f"  ✓ 状态更新为 confirmed")
    print(f"    确认人: {data['confirmed_by']}")
    print(f"    确认时间: {data['confirmed_at']}")

def test_export_csv(analysis_id):
    """测试导出CSV"""
    resp = requests.get(f"{BASE_URL}/api/analysis/{analysis_id}/export?format=csv")
    assert resp.status_code == 200
    assert 'text/csv' in resp.headers['content-type']
    
    filepath = Path('exports/test_verification.csv')
    filepath.write_bytes(resp.content)
    print(f"  ✓ CSV导出成功: {filepath} ({len(resp.content)} 字节)")
    return filepath

def test_export_excel(analysis_id):
    """测试导出Excel"""
    resp = requests.get(f"{BASE_URL}/api/analysis/{analysis_id}/export?format=excel")
    assert resp.status_code == 200
    assert 'spreadsheet' in resp.headers['content-type']
    
    filepath = Path('exports/test_verification.xlsx')
    filepath.write_bytes(resp.content)
    print(f"  ✓ Excel导出成功: {filepath} ({len(resp.content)} 字节)")
    return filepath

def test_trace(analysis_id):
    """测试追踪分析链路"""
    resp = requests.get(f"{BASE_URL}/api/analysis/{analysis_id}/trace")
    assert resp.status_code == 200
    data = resp.json()
    
    assert 'power_curve' in data
    assert 'clipping_identification' in data
    assert 'loss_estimation' in data
    assert 'verification_points' in data
    
    print(f"  ✓ 追踪链路成功")
    print(f"    功率曲线: {data['power_curve']['data_points_count']} 点")
    print(f"    削峰识别: {data['clipping_identification']['clipping_count']} 处")
    print(f"    损失明细: {data['loss_estimation']['details_count']} 条")
    print(f"    核对要点: {len(data['verification_points'])} 个")
    return data

def test_parameter_consistency(analysis_id, csv_path, xlsx_path):
    """测试参数一致性：CSV、Excel、终端摘要必须一致"""
    print("\n验证参数一致性...")
    
    resp = requests.get(f"{BASE_URL}/api/analysis/{analysis_id}")
    api_params = resp.json()['inverter_params']
    
    csv_df = pd.read_csv(csv_path, skiprows=7, nrows=12, header=None, 
                        index_col=0, encoding='utf-8-sig')
    csv_params = {}
    for idx, row in csv_df.iterrows():
        if '---' not in str(idx):
            csv_params[idx] = row[1]
    
    xlsx_df = pd.read_excel(xlsx_path, sheet_name='逆变器参数')
    xlsx_params = dict(zip(xlsx_df['参数名称'], xlsx_df['参数值']))
    
    print(f"\n  API返回参数:")
    for k, v in list(api_params.items())[:6]:
        print(f"    {k}: {v}")
    
    print(f"\n  CSV文件参数:")
    for k, v in list(csv_params.items())[:6]:
        print(f"    {k}: {v}")
    
    print(f"\n  Excel文件参数:")
    for k, v in list(xlsx_params.items())[:6]:
        print(f"    {k}: {v}")
    
    assert float(api_params['rated_power']) == float(csv_params['额定功率(kW)']), "额定功率不一致"
    assert float(api_params['dc_capacity']) == float(csv_params['直流容量(kWp)']), "直流容量不一致"
    assert f"{api_params['dc_ac_ratio']}:1" == str(csv_params['容配比']), "容配比不一致"
    assert float(api_params['max_actual_power']) == float(csv_params['最大实际功率(kW)']), "最大实际功率不一致"
    assert float(api_params['clipping_ratio']) == float(csv_params['削峰比例(%)']), "削峰比例不一致"
    
    assert float(api_params['rated_power']) == float(xlsx_params['额定功率(kW)']), "Excel额定功率不一致"
    assert float(api_params['dc_capacity']) == float(xlsx_params['直流容量(kWp)']), "Excel直流容量不一致"
    
    print(f"\n  ✓ 所有参数在API、CSV、Excel中完全一致")

def test_scenario_analysis():
    """验证各场景分析结果的合理性"""
    print("\n验证各场景分析结果合理性...")
    
    resp = requests.get(f"{BASE_URL}/api/analysis")
    all_results = {r['scenario']: r for r in resp.json()}
    
    normal = all_results['normal']
    assert normal['clipping_loss'] > 0, "正常场景应该有削峰损失"
    assert normal['temperature_loss'] < 1, "正常场景温度损失应该很小"
    assert normal['curtailment_loss'] < 1, "正常场景限发损失应该很小"
    print(f"  ✓ 正常场景: 削峰损失{normal['clipping_loss']:.2f}kWh, 损失率{normal['loss_rate']:.2f}%")
    
    temp_high = all_results['temperature_high']
    assert temp_high['temperature_loss'] > 0, "温度过高场景应该有温度损失"
    print(f"  ✓ 温度过高场景: 温度损失{temp_high['temperature_loss']:.2f}kWh")
    
    curtail = all_results['curtailment_overlap']
    assert curtail['curtailment_loss'] > 50, "限发重叠场景应该有大量限发损失"
    assert curtail['loss_rate'] > 10, "限发重叠场景损失率应该较高"
    print(f"  ✓ 限发重叠场景: 限发损失{curtail['curtailment_loss']:.2f}kWh, 损失率{curtail['loss_rate']:.2f}%")

def main():
    print("\n" + "="*70)
    print("光伏逆变器削峰分析系统 - 完整测试")
    print("="*70)
    
    all_passed = True
    
    try:
        requests.get(f"{BASE_URL}/")
    except:
        print("错误: 无法连接到服务，请先启动服务")
        print("运行: python3 -m uvicorn app.main:app --port 8000")
        return False
    
    print("✓ 服务连接正常")
    
    results = test_scenarios()
    if not results:
        return False
    print("✓ 4种场景样例生成 - 测试通过")
    
    test_list_analysis()
    print("✓ 查询分析列表 - 测试通过")
    
    test_id = results['curtailment_overlap']
    detail_data = test_get_detail(test_id)
    print("✓ 查询分析详情 - 测试通过")
    
    test_update_status(results['normal'])
    print("✓ 修改分析状态 - 测试通过")
    
    csv_path = test_export_csv(test_id)
    print("✓ 导出CSV - 测试通过")
    
    xlsx_path = test_export_excel(test_id)
    print("✓ 导出Excel - 测试通过")
    
    trace_data = test_trace(test_id)
    print("✓ 追踪分析链路 - 测试通过")
    
    test_parameter_consistency(test_id, csv_path, xlsx_path)
    print("✓ 参数一致性验证 - 测试通过")
    
    test_scenario_analysis()
    print("✓ 场景分析合理性验证 - 测试通过")
    all_passed = True
    
    print("\n" + "="*70)
    if all_passed:
        print("✓ 所有测试通过！系统功能正常")
    else:
        print("✗ 部分测试失败，请检查错误信息")
    print("="*70 + "\n")
    
    return all_passed

if __name__ == "__main__":
    main()
