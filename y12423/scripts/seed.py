#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import httpx

BASE = os.environ.get("CONCERT_CLAIM_URL", "http://127.0.0.1:8000")


def seed():
    c = httpx.Client(base_url=BASE, timeout=10)

    print("=== 1. 创建保单条款 ===")
    clauses = [
        {
            "clause_code": "CONCERT-A",
            "content": "演唱会活动综合保险A款：覆盖票务退款损失和场租违约金，免赔率10%，延期跨城额外扣减15%",
            "deductible_rate": 0.10,
            "cross_city_clause": "延期跨城：若演出因跨城延期，净赔付金额按85%计算",
            "effective_date": "2025-01-01",
        },
        {
            "clause_code": "CONCERT-B",
            "content": "演唱会活动综合保险B款：覆盖票务退款损失和场租违约金，免赔率5%，无跨城扣减",
            "deductible_rate": 0.05,
            "cross_city_clause": "本条款不适用跨城扣减",
            "effective_date": "2025-01-01",
        },
        {
            "clause_code": "CONCERT-C",
            "content": "演唱会活动综合保险C款：高风险演出专用，免赔率20%，延期跨城额外扣减25%",
            "deductible_rate": 0.20,
            "cross_city_clause": "延期跨城：若演出因跨城延期，净赔付金额按75%计算",
            "effective_date": "2025-06-01",
        },
    ]
    for cl in clauses:
        r = c.post("/api/clauses", json=cl)
        print(f"  {cl['clause_code']}: {r.status_code} => {r.json().get('id')}")

    print("\n=== 2. 创建票务退款 ===")
    refunds = [
        {"concert_name": "星辰演唱会-北京站", "refund_amount": 120000, "refund_reason": "艺人伤病取消", "ticket_count": 2000, "clause_code": "CONCERT-A"},
        {"concert_name": "潮音节-上海站", "refund_amount": 85000, "refund_reason": "暴雨天气取消", "ticket_count": 1500, "clause_code": "CONCERT-B"},
        {"concert_name": "摇滚之夜-深圳站", "refund_amount": 200000, "refund_reason": "场馆安全问题取消", "ticket_count": 3000, "clause_code": "CONCERT-C"},
        {"concert_name": "民谣回声-广州站", "refund_amount": 50000, "refund_reason": "主办方违约", "ticket_count": 800, "clause_code": "CONCERT-A"},
    ]
    refund_ids = []
    for ref in refunds:
        r = c.post("/api/refunds", json=ref)
        data = r.json()
        refund_ids.append(data["id"])
        print(f"  {ref['concert_name']}: {r.status_code} => id={data['id']}")

    print("\n=== 3. 创建场租合同 ===")
    contracts = [
        {"concert_name": "星辰演唱会-北京站", "venue_name": "国家体育馆", "rent_amount": 300000, "contract_terms": "违约金比例15%", "penalty_rate": 0.15, "clause_code": "CONCERT-A"},
        {"concert_name": "潮音节-上海站", "venue_name": "梅赛德斯奔驰文化中心", "rent_amount": 250000, "contract_terms": "违约金比例10%", "penalty_rate": 0.10, "clause_code": "CONCERT-B"},
        {"concert_name": "摇滚之夜-深圳站", "venue_name": "深圳湾体育中心", "rent_amount": 400000, "contract_terms": "违约金比例20%", "penalty_rate": 0.20, "clause_code": "CONCERT-C"},
        {"concert_name": "民谣回声-广州站", "venue_name": "广州体育馆", "rent_amount": 150000, "contract_terms": "违约金比例8%", "penalty_rate": 0.08, "clause_code": "CONCERT-A"},
    ]
    contract_ids = []
    for con in contracts:
        r = c.post("/api/contracts", json=con)
        data = r.json()
        contract_ids.append(data["id"])
        print(f"  {con['concert_name']} @ {con['venue_name']}: {r.status_code} => id={data['id']}")

    print("\n=== 4. 创建赔付核算 ===")
    calcs = [
        {
            "concert_name": "星辰演唱会-北京站",
            "ticket_refund_id": refund_ids[0],
            "venue_contract_id": contract_ids[0],
            "clause_code": "CONCERT-A",
            "cross_city_delay": False,
            "cross_city_delay_reason": "",
            "deductible_correct": True,
            "deductible_misapply_reason": "",
        },
        {
            "concert_name": "潮音节-上海站",
            "ticket_refund_id": refund_ids[1],
            "venue_contract_id": contract_ids[1],
            "clause_code": "CONCERT-B",
            "cross_city_delay": True,
            "cross_city_delay_reason": "演出从杭州临时迁至上海，跨城延期触发扣减",
            "deductible_correct": True,
            "deductible_misapply_reason": "",
        },
        {
            "concert_name": "摇滚之夜-深圳站",
            "ticket_refund_id": refund_ids[2],
            "venue_contract_id": contract_ids[2],
            "clause_code": "CONCERT-C",
            "cross_city_delay": True,
            "cross_city_delay_reason": "原定东莞延期至深圳，跨城延期",
            "deductible_correct": False,
            "deductible_misapply_reason": "误用B款5%免赔率，实际应适用C款20%免赔率",
        },
        {
            "concert_name": "民谣回声-广州站",
            "ticket_refund_id": refund_ids[3],
            "venue_contract_id": contract_ids[3],
            "clause_code": "CONCERT-A",
            "cross_city_delay": False,
            "cross_city_delay_reason": "",
            "deductible_correct": True,
            "deductible_misapply_reason": "",
        },
    ]
    calc_ids = []
    for cal in calcs:
        r = c.post("/api/calculations", json=cal)
        data = r.json()
        calc_ids.append(data["id"])
        print(f"  {cal['concert_name']}: 净赔付={data['net_compensation']} => id={data['id']}")

    print("\n=== 5. 添加争议备注 ===")
    disputes = [
        {"calculation_id": calc_ids[2], "note_content": "摇滚之夜免赔率适用存在争议：投保时签约为B款，出险后保险公司主张应追溯适用C款高免赔率", "author": "理赔员-王芳"},
        {"calculation_id": calc_ids[1], "note_content": "潮音节跨城延期扣减比例与条款约定一致，无争议", "author": "理赔员-李明"},
    ]
    for dis in disputes:
        r = c.post("/api/disputes", json=dis)
        print(f"  核算{dis['calculation_id']}: {r.status_code}")

    print("\n=== 6. 导出报告 ===")
    for cid in calc_ids:
        r = c.post("/api/reports", json={"calculation_id": cid})
        data = r.json()
        report = data.get("report_data", {})
        if isinstance(report, str):
            report = json.loads(report)
        print(f"  核算{cid}: 影响原因={report.get('影响原因', [])}")

    print("\n造数完成！")
    print(f"  条款数: {len(clauses)}")
    print(f"  退款数: {len(refunds)}")
    print(f"  合同数: {len(contracts)}")
    print(f"  核算数: {len(calcs)}")
    print(f"  核算IDs: {calc_ids}")
    print(f"  退款IDs: {refund_ids}")


if __name__ == "__main__":
    seed()
