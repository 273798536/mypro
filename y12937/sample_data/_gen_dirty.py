import csv
import random
from datetime import datetime, timedelta

random.seed(42)

products = ["A4打印纸", "签字笔", "文件夹", "订书机", "便利贴", "计算器", "白板笔", "剪刀", "胶带", "回形针"]
departments = ["市场部", "技术部", "财务部", "人事部", "运营部", "销售部", "行政部"]
cities = ["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "南京"]

start_date = datetime(2025, 1, 10)
rows = []

for i in range(1, 201):
    order_date = start_date + timedelta(days=random.randint(0, 150))
    dept = random.choice(departments)
    product = random.choice(products)
    city = random.choice(cities)
    price = round(random.uniform(5, 500), 2)
    qty = random.randint(1, 200)
    amount = round(price * qty, 2)
    handler = random.choice(["李明", "王芳", "张伟", "刘洋", "陈静", "赵强"])

    row = {
        "订单编号": f"SO{20250000 + i}",
        "下单时间": order_date.strftime("%Y-%m-%d %H:%M:%S"),
        "部门": dept,
        "商品名称": product,
        "城市": city,
        "单价": price,
        "数量": qty,
        "金额": amount,
        "经办人": handler,
        "备注": "",
    }

    if i % 11 == 0:
        row["金额"] = f"{amount}"
    elif i % 7 == 0:
        row["金额"] = f"{amount} 元"
    elif i % 13 == 0:
        row["单价"] = f"约{price}"
    elif i % 17 == 0:
        row["数量"] = f"约{qty}箱"

    if i % 9 == 0:
        row["备注"] = f"【补录】{random.choice(['系统漏单', '客服手工补', '线下订单转线上'])}，操作人{handler}{random.choice(['', '，后补说明'])}"
    elif i % 23 == 0:
        row["备注"] = f"修正：原金额填错，更正为{amount}元，原单{random.choice(['已作废','保留备查'])}"
    elif i % 29 == 0:
        row["备注"] = "备注：此单为历史遗留，等业务方确认后再处理，后续补充相关合同号"

    if i % 19 == 0:
        row["old_code"] = f"LEG-{random.randint(10000, 99999)}"
        row["legacy_id"] = f"2019-{random.randint(1000, 9999)}"

    if i % 31 == 0:
        row["金额"] = round(amount * 100, 2)

    if i % 37 == 0:
        long_text = f"客户定制需求详情：\n" + "\n".join(
            f"第{n}项要求：{random.choice(['包装加固', '分批次发货', '开具增值税专票', '指定送货时间', '需要样品', '上门安装', '验收单签字', '提供质检报告'])}，"
            f"联系电话{random.randint(13000000000, 13999999999)}，"
            f"地址：{city}市{random.choice(['朝阳','海淀','浦东','天河','南山','西湖','锦江','武昌'])}区某某路{random.randint(1, 999)}号"
            for n in range(1, random.randint(8, 15))
        )
        row["备注"] = long_text

    if i == 50:
        row["下单时间"] = "2025-01-05 10:00:00"
        row["备注"] = row["备注"] + " 【版本回滚】系统恢复了旧数据，此单时间异常请勿作为正常样例"

    if 60 <= i <= 62:
        base_idx = 58
        if len(rows) > base_idx:
            base = dict(rows[base_idx])
            row["部门"] = base["部门"]
            row["商品名称"] = base["商品名称"]
            row["城市"] = base["城市"]
            row["单价"] = base["单价"]
            row["数量"] = base["数量"]
            row["金额"] = base["金额"]
            row["经办人"] = base["经办人"]
            if random.random() < 0.5:
                row["备注"] = base["备注"]

    rows.append(row)

rows[42]["下单时间"] = (start_date - timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S")
rows[42]["备注"] = (rows[42].get("备注", "") or "") + " 系统导出版本回滚，此条请重点核查"

output = "/Users/mac/pro/solo/workspaces/y12937/sample_data/sales_dirty.csv"
with open(output, "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "订单编号", "下单时间", "部门", "商品名称", "城市", "单价", "数量", "金额",
        "经办人", "备注", "old_code", "legacy_id"
    ])
    writer.writeheader()
    writer.writerows(rows)

print(f"生成 {len(rows)} 条样例脏数据 -> {output}")
