import pandas as pd
from datetime import date, timedelta
import os

today = date.today()
samples_dir = os.path.dirname(__file__)

def generate_customers():
    data = [
        {"customer_code": "C001", "customer_name": "北京科技有限公司", "industry": "信息技术", "region": "华北", "credit_rating": "A", "contact_person": "张三", "contact_phone": "13800138001", "address": "北京市朝阳区"},
        {"customer_code": "C002", "customer_name": "上海贸易公司", "industry": "商贸零售", "region": "华东", "credit_rating": "B", "contact_person": "李四", "contact_phone": "13800138002", "address": "上海市浦东新区"},
        {"customer_code": "C003", "customer_name": "广州制造集团", "industry": "制造业", "region": "华南", "credit_rating": "A", "contact_person": "王五", "contact_phone": "13800138003", "address": "广州市天河区"},
        {"customer_code": "C004", "customer_name": "深圳电子科技", "industry": "电子制造", "region": "华南", "credit_rating": "B", "contact_person": "赵六", "contact_phone": "13800138004", "address": "深圳市南山区"},
        {"customer_code": "C005", "customer_name": "杭州互联网公司", "industry": "互联网", "region": "华东", "credit_rating": "A", "contact_person": "钱七", "contact_phone": "13800138005", "address": "杭州市西湖区"},
    ]
    df = pd.DataFrame(data)
    df.to_excel(os.path.join(samples_dir, "customers.xlsx"), index=False)
    print("生成 customers.xlsx")

def generate_contracts():
    data = [
        {"contract_no": "HT2025001", "customer_code": "C001", "customer_name": "北京科技有限公司", "contract_amount": 500000, "contract_date": today - timedelta(days=90), "start_date": today - timedelta(days=90), "end_date": today + timedelta(days=90), "payment_terms": "月结30天", "credit_days": 30, "status": "active"},
        {"contract_no": "HT2025002", "customer_code": "C002", "customer_name": "上海贸易公司", "contract_amount": 300000, "contract_date": today - timedelta(days=60), "start_date": today - timedelta(days=60), "end_date": today + timedelta(days=120), "payment_terms": "月结45天", "credit_days": 45, "status": "active"},
        {"contract_no": "HT2025003", "customer_code": "C003", "customer_name": "广州制造集团", "contract_amount": 800000, "contract_date": today - timedelta(days=120), "start_date": today - timedelta(days=120), "end_date": today + timedelta(days=60), "payment_terms": "月结60天", "credit_days": 60, "status": "active"},
    ]
    df = pd.DataFrame(data)
    df.to_excel(os.path.join(samples_dir, "contracts.xlsx"), index=False)
    print("生成 contracts.xlsx")

def generate_invoices():
    data = []
    inv_no = 1
    for cust_code, cust_name, days_ago, amount, credit_days in [
        ("C001", "北京科技有限公司", 10, 100000, 30),
        ("C001", "北京科技有限公司", 45, 150000, 30),
        ("C001", "北京科技有限公司", 75, 80000, 30),
        ("C002", "上海贸易公司", 20, 120000, 45),
        ("C002", "上海贸易公司", 60, 90000, 45),
        ("C003", "广州制造集团", 30, 200000, 60),
        ("C003", "广州制造集团", 90, 250000, 60),
        ("C003", "广州制造集团", 120, 180000, 60),
        ("C004", "深圳电子科技", 15, 170000, 30),
        ("C005", "杭州互联网公司", 50, 300000, 30),
    ]:
        inv_date = today - timedelta(days=days_ago)
        due_date = inv_date + timedelta(days=credit_days)
        tax = amount * 0.13
        total = amount + tax
        data.append({
            "invoice_no": f"INV{today.year}{inv_no:06d}",
            "customer_code": cust_code,
            "customer_name": cust_name,
            "contract_no": f"HT202500{1 if cust_code == 'C001' else 2 if cust_code == 'C002' else 3}",
            "invoice_date": inv_date,
            "due_date": due_date,
            "invoice_amount": amount,
            "tax_amount": tax,
            "total_amount": total,
            "remaining_amount": total,
            "status": "unpaid",
            "promise_date": due_date + timedelta(days=15) if days_ago > credit_days else None
        })
        inv_no += 1
    df = pd.DataFrame(data)
    df.to_excel(os.path.join(samples_dir, "invoices.xlsx"), index=False)
    print("生成 invoices.xlsx")

def generate_receipts():
    data = [
        {"receipt_no": "RCP2025001", "customer_code": "C001", "customer_name": "北京科技有限公司", "receipt_date": today - timedelta(days=5), "receipt_amount": 80000, "payment_method": "电汇", "bank_account": "工行北京分行"},
        {"receipt_no": "RCP2025002", "customer_code": "C002", "customer_name": "上海贸易公司", "receipt_date": today - timedelta(days=10), "receipt_amount": 100000, "payment_method": "银行承兑", "bank_account": "招行上海分行"},
        {"receipt_no": "RCP2025003", "customer_code": "C003", "customer_name": "广州制造集团", "receipt_date": today - timedelta(days=3), "receipt_amount": 150000, "payment_method": "电汇", "bank_account": "建行广州分行"},
        {"receipt_no": "RCP2025004", "customer_code": "C001", "customer_name": "北京科技有限公司", "receipt_date": today - timedelta(days=1), "receipt_amount": 50000, "payment_method": "电汇", "bank_account": "工行北京分行"},
    ]
    df = pd.DataFrame(data)
    df.to_excel(os.path.join(samples_dir, "receipts.xlsx"), index=False)
    print("生成 receipts.xlsx")

def generate_collection():
    data = [
        {"customer_code": "C001", "customer_name": "北京科技有限公司", "contact_date": today - timedelta(days=7), "collector": "销售经理A", "contact_method": "电话", "contact_person": "财务经理", "promise_date": today + timedelta(days=3), "promise_amount": 100000, "next_action_date": today + timedelta(days=5), "next_action": "再次电话跟进", "status": "in_progress", "notes": "客户承诺本周内安排付款"},
        {"customer_code": "C003", "customer_name": "广州制造集团", "contact_date": today - timedelta(days=14), "collector": "销售经理B", "contact_method": "上门拜访", "contact_person": "采购总监", "promise_date": today - timedelta(days=2), "promise_amount": 250000, "next_action_date": today + timedelta(days=1), "next_action": "发送催款函", "status": "in_progress", "notes": "承诺已过期，需进一步跟进"},
    ]
    df = pd.DataFrame(data)
    df.to_excel(os.path.join(samples_dir, "collection.xlsx"), index=False)
    print("生成 collection.xlsx")

def generate_credit():
    data = [
        {"customer_code": "C001", "customer_name": "北京科技有限公司", "credit_limit": 500000, "effective_date": today - timedelta(days=180), "expiry_date": today + timedelta(days=180), "is_frozen": 0, "approved_by": "财务总监"},
        {"customer_code": "C002", "customer_name": "上海贸易公司", "credit_limit": 300000, "effective_date": today - timedelta(days=90), "expiry_date": today + timedelta(days=270), "is_frozen": 0, "approved_by": "财务总监"},
        {"customer_code": "C003", "customer_name": "广州制造集团", "credit_limit": 1000000, "effective_date": today - timedelta(days=365), "expiry_date": today, "is_frozen": 0, "approved_by": "总经理"},
        {"customer_code": "C004", "customer_name": "深圳电子科技", "credit_limit": 400000, "effective_date": today - timedelta(days=60), "expiry_date": today + timedelta(days=300), "is_frozen": 0, "approved_by": "财务总监"},
        {"customer_code": "C005", "customer_name": "杭州互联网公司", "credit_limit": 800000, "effective_date": today - timedelta(days=120), "expiry_date": today + timedelta(days=240), "is_frozen": 0, "approved_by": "财务总监"},
    ]
    df = pd.DataFrame(data)
    df.to_excel(os.path.join(samples_dir, "credit.xlsx"), index=False)
    print("生成 credit.xlsx")

if __name__ == "__main__":
    generate_customers()
    generate_contracts()
    generate_invoices()
    generate_receipts()
    generate_collection()
    generate_credit()
    print("\n所有样例数据生成完成！")
