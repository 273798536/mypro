#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def print_response(title, response):
    print(f"\n【{title}】")
    print(f"状态码: {response.status_code}")
    try:
        data = response.json()
        print(json.dumps(data, ensure_ascii=False, indent=2))
    except:
        print(response.text)
    return response

def main():
    print("=" * 60)
    print("城市照明抢修重试补偿队列 API 演示")
    print("请先启动 API 服务: python -m app.api")
    print("=" * 60)

    try:
        requests.get(BASE_URL + "/docs")
    except:
        print("\n错误: 无法连接到 API 服务")
        print("请先运行: python -m app.api")
        return

    print("\n【1】提交巡检照片线索")
    r = requests.post(BASE_URL + "/clues/submit", json={
        "source_type": "inspection",
        "content": {
            "location": "中山路456号",
            "photo_id": "P101",
            "lamp_count": 5,
            "description": "多盏路灯闪烁"
        },
        "operator": "api_demo"
    })
    print_response("提交巡检照片", r)
    wo_id = r.json()["work_order"]["id"]

    print("\n【2】提交报修热线 - 同一地点")
    r = requests.post(BASE_URL + "/clues/submit", json={
        "source_type": "hotline",
        "content": {
            "location": "中山路456号",
            "phone": "13900139000",
            "report_time": "2024-05-20T14:00:00"
        }
    })
    print_response("提交报修热线", r)

    print("\n【3】获取工单列表")
    r = requests.get(BASE_URL + "/work-orders")
    print_response("工单列表", r)

    print("\n【4】获取工单详情")
    r = requests.get(BASE_URL + f"/work-orders/{wo_id}")
    print_response("工单详情", r)

    print("\n【5】执行批量重试")
    r = requests.post(BASE_URL + "/retry/batch", params={"operator": "api_demo"})
    print_response("批量重试", r)

    print("\n【6】人工接管")
    r = requests.post(BASE_URL + f"/work-orders/{wo_id}/manual", json={
        "handler": "李工"
    })
    print_response("人工接管", r)

    print("\n【7】补偿入账")
    r = requests.post(BASE_URL + f"/work-orders/{wo_id}/compensate", json={
        "amount": 200.00,
        "reason": "紧急抢修费用",
        "executor": "api_demo"
    })
    print_response("补偿入账", r)

    print("\n【8】获取重试分类统计")
    r = requests.get(BASE_URL + "/stats/retry-categories")
    print_response("重试分类统计", r)

    print("\n【9】获取完整统计报告")
    r = requests.get(BASE_URL + "/stats/full")
    print_response("完整统计报告", r)

    print("\n【10】关闭工单")
    r = requests.post(BASE_URL + f"/work-orders/{wo_id}/close", json={
        "operator": "api_demo",
        "remarks": "问题已解决，全部恢复正常"
    })
    print_response("关闭工单", r)

    print("\n【11】导出数据")
    r = requests.get(BASE_URL + "/export/work-orders", params={"format": "json"})
    print(f"导出响应状态: {r.status_code}")
    print(f"文件名: {r.headers.get('content-disposition', 'N/A')}")

    print("\n" + "=" * 60)
    print("API 演示完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
