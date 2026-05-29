import requests
import json

BASE = "http://localhost:8000/api"

def seed():
    print("=== 准备基础数据 ===")
    
    containers = [
        {"code": "20GP", "name": "20尺普柜", "teu": 1.0},
        {"code": "40GP", "name": "40尺普柜", "teu": 2.0},
        {"code": "40HQ", "name": "40尺高柜", "teu": 2.0},
    ]
    for c in containers:
        r = requests.post(f"{BASE}/container-types", json=c)
        print(f"箱型 {c['code']}: {'OK' if r.status_code == 200 else r.text}")
    
    print("\n=== 准备航线费率（含多版本，用于复现报价过期） ===")
    rates = [
        {
            "route_code": "PACIFIC",
            "route_name": "太平洋航线",
            "effective_date": "2026-01-01",
            "expiry_date": "2026-01-31",
            "bunker_rate": 350.0,
            "version": "V1",
            "remark": "Q1报价（1月份，已过期）"
        },
        {
            "route_code": "PACIFIC",
            "route_name": "太平洋航线",
            "effective_date": "2026-04-01",
            "expiry_date": "2026-06-30",
            "bunker_rate": 420.0,
            "version": "V2",
            "remark": "Q2报价（燃油涨价）"
        },
        {
            "route_code": "EUROPE",
            "route_name": "欧洲航线",
            "effective_date": "2026-04-01",
            "expiry_date": "2026-06-30",
            "bunker_rate": 580.0,
            "version": "V1",
            "remark": "Q2报价"
        },
    ]
    for r in rates:
        resp = requests.post(f"{BASE}/route-rates", json=r)
        print(f"航线 {r['route_code']} {r['version']}: {'OK' if resp.status_code == 200 else resp.text}")
    
    print("\n=== 准备运输订单 ===")
    orders = [
        {
            "order_no": "SH202605001",
            "container_code": "20GP",
            "route_code": "PACIFIC",
            "sailing_date": "2026-05-15",
            "cargo_weight": 18.5,
            "remark": "正常单：有效期内"
        },
        {
            "order_no": "SH202605002",
            "container_code": "40HQ",
            "route_code": "PACIFIC",
            "sailing_date": "2026-02-10",
            "cargo_weight": 22.0,
            "remark": "改单追溯：原用V1，现在开航日在V1已过期"
        },
        {
            "order_no": "SH202605003",
            "container_code": "45HQ",
            "route_code": "EUROPE",
            "sailing_date": "2026-05-20",
            "cargo_weight": 25.0,
            "remark": "箱型问题：45HQ不在清单"
        },
        {
            "order_no": "SH202605004",
            "container_code": "40GP",
            "route_code": "EUROPE",
            "sailing_date": "2026-07-10",
            "cargo_weight": 20.0,
            "remark": "报价过期：开航日超出Q2有效期"
        },
    ]
    for o in orders:
        resp = requests.post(f"{BASE}/transport-orders", json=o)
        print(f"订单 {o['order_no']}: {'OK' if resp.status_code == 200 else resp.text}")
    
    print("\n=== 数据准备完成 ===")

if __name__ == "__main__":
    seed()
