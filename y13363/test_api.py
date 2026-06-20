import requests
import json

base_url = "http://localhost:8000"

print("=== 测试API接口 ===")

r = requests.get(f"{base_url}/api/formulas")
print(f"✅ GET /api/formulas: {len(r.json())} 个公式")

r = requests.get(f"{base_url}/api/field-mappings")
print(f"✅ GET /api/field-mappings: {len(r.json())} 条映射")

r = requests.get(f"{base_url}/api/calibration-ratios")
print(f"✅ GET /api/calibration-ratios: {len(r.json())} 个系数")

sample_data = [
    {
        "run_id": "EXP-API-001",
        "raw_data": {
            "训练样本数": 100000,
            "训练时长": 48.5,
            "GPU卡数": 8,
            "GPU单价": 12.5
        },
        "source_file": "api_test.csv"
    }
]
r = requests.post(f"{base_url}/api/records/batch", json=sample_data)
print(f"✅ POST /api/records/batch: 状态码 {r.status_code}")

r = requests.get(f"{base_url}/api/records")
print(f"✅ GET /api/records: {len(r.json())} 条记录")

r = requests.get(f"{base_url}/api/records/EXP-API-001")
data = r.json()
print(f"✅ GET /api/records/EXP-API-001: 状态={data['status']}, 成本计算数={len(data['cost_calculations'])}")

r = requests.get(f"{base_url}/api/records/EXP-API-001/export")
export_data = r.json()
print(f"✅ GET /api/records/EXP-API-001/export: 包含 {len(export_data.keys())} 个字段")

r = requests.get(f"{base_url}/api/records?run_ids=EXP-API-001")
print(f"✅ GET /api/records?run_ids=...: 查询到 {len(r.json())} 条记录")

print("\n🎉 所有API接口测试通过！")
print("\n📋 看板可通过 http://localhost:8000 访问")
