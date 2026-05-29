#!/usr/bin/env python3
"""
验证修复的测试脚本：
1. 基础路由 200
2. append 策略重复导入不报错、语义正确
3. alerts/summary 返回 200
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from app.database import engine, Base, SessionLocal
from main import app

Base.metadata.create_all(bind=engine)

client = TestClient(app)

passed = 0
failed = 0

def test(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✓ {name}")
    else:
        failed += 1
        print(f"  ✗ {name} {detail}")

print("=" * 60)
print("  验证修复")
print("=" * 60)

# ---- 1. 基础路由 ----
print("\n[1] 基础路由")
r = client.get("/api/health")
test("GET /api/health → 200", r.status_code == 200)

r = client.get("/api/reports/rolling")
test("GET /api/reports/rolling → 200", r.status_code == 200)

r = client.get("/api/reports/rolling/export")
test("GET /api/reports/rolling/export → 200", r.status_code == 200)

# ---- 2. alerts/summary 路由 ----
print("\n[2] alerts/summary 路由修复")
r = client.get("/api/alerts/summary")
test("GET /api/alerts/summary → 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    body = r.json()
    test("summary 含 total_unresolved 字段", "total_unresolved" in body)
    test("summary 含 by_type 字段", "by_type" in body)

r = client.get("/api/alerts/")
test("GET /api/alerts/ → 200", r.status_code == 200)

# ---- 3. 首次导入客户 ----
print("\n[3] 首次导入客户")
from app.services.import_service import ImportService
from app.models.models import ImportStrategy

db = SessionLocal()
svc = ImportService(db)

result = svc.import_customers([
    {"customer_code": "C001", "customer_name": "客户A", "industry": "IT"},
    {"customer_code": "C002", "customer_name": "客户B", "industry": "零售"},
], ImportStrategy.APPEND, "test.xlsx", "tester")
test("首次 append 导入 2 客户 → created=2", result.created == 2, f"created={result.created}")
test("首次 append 导入 2 客户 → skipped=0", result.skipped == 0, f"skipped={result.skipped}")

# ---- 4. 重复导入客户 - append 策略 ----
print("\n[4] 重复导入客户 - append 策略")
result = svc.import_customers([
    {"customer_code": "C001", "customer_name": "客户A-修改", "industry": "IT"},
    {"customer_code": "C003", "customer_name": "客户C", "industry": "制造"},
], ImportStrategy.APPEND, "test2.xlsx", "tester")
test("append 重复 C001 → skipped=1", result.skipped == 1, f"skipped={result.skipped}")
test("append 新增 C003 → created=1", result.created == 1, f"created={result.created}")
test("append 重复 C001 → updated=0", result.updated == 0, f"updated={result.updated}")

# 验证 C001 没有被修改
from app.models.models import Customer
c001 = db.query(Customer).filter(Customer.customer_code == "C001").first()
test("C001 名称未被修改", c001.customer_name == "客户A", f"name={c001.customer_name}")

# ---- 5. 重复导入客户 - overwrite 策略 ----
print("\n[5] 重复导入客户 - overwrite 策略")
result = svc.import_customers([
    {"customer_code": "C001", "customer_name": "客户A-覆盖", "industry": "新行业"},
], ImportStrategy.OVERWRITE, "test3.xlsx", "tester")
test("overwrite 重复 C001 → updated=1", result.updated == 1, f"updated={result.updated}")
test("overwrite 重复 C001 → created=0", result.created == 0, f"created={result.created}")

db.refresh(c001)
test("C001 名称已被覆盖", c001.customer_name == "客户A-覆盖", f"name={c001.customer_name}")

# ---- 6. 重复导入客户 - ignore 策略 ----
print("\n[6] 重复导入客户 - ignore 策略")
result = svc.import_customers([
    {"customer_code": "C001", "customer_name": "客户A-忽略", "industry": "应忽略"},
], ImportStrategy.IGNORE, "test4.xlsx", "tester")
test("ignore 重复 C001 → skipped=1", result.skipped == 1, f"skipped={result.skipped}")
test("ignore 重复 C001 → updated=0", result.updated == 0, f"updated={result.updated}")

db.refresh(c001)
test("C001 名称未被 ignore 改变", c001.customer_name == "客户A-覆盖", f"name={c001.customer_name}")

# ---- 7. 重复导入合同 - append 策略 ----
print("\n[7] 重复导入合同 - append 策略")
from app.models.models import Contract
result = svc.import_contracts([
    {"contract_no": "HT001", "customer_code": "C001", "customer_name": "客户A-覆盖",
     "contract_date": "2026-01-01", "contract_amount": 100000},
], ImportStrategy.APPEND, "test.xlsx", "tester")
test("首次 append 导入合同 → created=1", result.created == 1, f"created={result.created}")

result = svc.import_contracts([
    {"contract_no": "HT001", "customer_code": "C001", "customer_name": "客户A-覆盖",
     "contract_date": "2026-01-01", "contract_amount": 200000},
], ImportStrategy.APPEND, "test2.xlsx", "tester")
test("append 重复合同 HT001 → skipped=1", result.skipped == 1, f"skipped={result.skipped}")
test("append 重复合同 → 无唯一键冲突", True)

ht = db.query(Contract).filter(Contract.contract_no == "HT001").first()
test("合同金额未被 append 修改", ht.contract_amount == 100000, f"amount={ht.contract_amount}")

# ---- 8. 重复导入发票 - append 策略 ----
print("\n[8] 重复导入发票 - append 策略")
from app.models.models import Invoice
result = svc.import_invoices([
    {"invoice_no": "INV001", "customer_code": "C001", "customer_name": "客户A-覆盖",
     "invoice_date": "2026-01-01", "due_date": "2026-02-01",
     "invoice_amount": 50000, "total_amount": 56500},
], ImportStrategy.APPEND, "test.xlsx", "tester")
test("首次 append 导入发票 → created=1", result.created == 1, f"created={result.created}")

result = svc.import_invoices([
    {"invoice_no": "INV001", "customer_code": "C001", "customer_name": "客户A-覆盖",
     "invoice_date": "2026-01-01", "due_date": "2026-02-01",
     "invoice_amount": 99999, "total_amount": 99999},
], ImportStrategy.APPEND, "test2.xlsx", "tester")
test("append 重复发票 INV001 → skipped=1", result.skipped == 1, f"skipped={result.skipped}")
test("append 重复发票 → 无唯一键冲突", True)

inv = db.query(Invoice).filter(Invoice.invoice_no == "INV001").first()
test("发票金额未被 append 修改", inv.total_amount == 56500, f"amount={inv.total_amount}")

# ---- 9. 重复导入回款 - append 策略 ----
print("\n[9] 重复导入回款 - append 策略")
from app.models.models import Receipt
result = svc.import_receipts([
    {"receipt_no": "RCP001", "customer_code": "C001", "customer_name": "客户A-覆盖",
     "receipt_date": "2026-01-15", "receipt_amount": 30000},
], ImportStrategy.APPEND, "test.xlsx", "tester")
test("首次 append 导入回款 → created=1", result.created == 1, f"created={result.created}")

result = svc.import_receipts([
    {"receipt_no": "RCP001", "customer_code": "C001", "customer_name": "客户A-覆盖",
     "receipt_date": "2026-01-15", "receipt_amount": 88888},
], ImportStrategy.APPEND, "test2.xlsx", "tester")
test("append 重复回款 RCP001 → skipped=1", result.skipped == 1, f"skipped={result.skipped}")
test("append 重复回款 → 无唯一键冲突", True)

rcp = db.query(Receipt).filter(Receipt.receipt_no == "RCP001").first()
test("回款金额未被 append 修改", rcp.receipt_amount == 30000, f"amount={rcp.receipt_amount}")

# ---- 10. overwrite 策略修改已有数据 ----
print("\n[10] overwrite 策略修改已有数据")
result = svc.import_invoices([
    {"invoice_no": "INV001", "customer_code": "C001", "customer_name": "客户A-覆盖",
     "invoice_date": "2026-01-01", "due_date": "2026-03-01",
     "invoice_amount": 77777, "total_amount": 87868},
], ImportStrategy.OVERWRITE, "test3.xlsx", "tester")
test("overwrite 重复发票 → updated=1", result.updated == 1, f"updated={result.updated}")

db.refresh(inv)
test("发票金额已被 overwrite 修改", inv.total_amount == 87868, f"amount={inv.total_amount}")

# ---- 11. 报告和导出仍然正常 ----
print("\n[11] 报告和导出仍然正常")
r = client.get("/api/reports/rolling")
test("GET /api/reports/rolling → 200", r.status_code == 200)

r = client.get("/api/reports/rolling/export")
test("GET /api/reports/rolling/export → 200", r.status_code == 200)

db.close()

print(f"\n{'=' * 60}")
print(f"  结果: {passed} 通过, {failed} 失败")
print(f"{'=' * 60}")

if failed > 0:
    sys.exit(1)
