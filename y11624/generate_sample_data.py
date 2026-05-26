#!/usr/bin/env python3
"""生成测试用财务报表数据"""

import pandas as pd
from pathlib import Path
import os


def generate_test_data(output_dir: str = "sample_data"):
    """生成测试用财务数据"""
    base_dir = Path(output_dir)
    base_dir.mkdir(parents=True, exist_ok=True)

    balance_sheet_data = {
        "科目代码": ["1001", "1002", "1122", "1403", "1601", "2202", "4001", "4104", "6001", "6401"],
        "科目名称": ["现金", "银行存款", "应收账款", "原材料", "固定资产", "应付账款", "实收资本", "未分配利润", "主营业务收入", "主营业务成本"],
        "期初余额": [10000, 50000, 80000, 30000, 100000, 40000, 150000, 80000, 0, 0],
        "期末余额": [15000, 65000, 95000, 25000, 95000, 35000, 150000, 110000, 0, 0],
    }
    pd.DataFrame(balance_sheet_data).to_excel(base_dir / "资产负债表.xlsx", index=False)

    income_statement_data = {
        "科目代码": ["6001", "6051", "6401", "6601", "6602", "6603"],
        "科目名称": ["主营业务收入", "其他业务收入", "主营业务成本", "销售费用", "管理费用", "财务费用"],
        "本期金额": [200000, 50000, 120000, 20000, 15000, 5000],
        "上期金额": [180000, 40000, 110000, 18000, 14000, 4000],
    }
    pd.DataFrame(income_statement_data).to_excel(base_dir / "利润表.xlsx", index=False)

    cash_flow_data = {
        "项目代码": ["101", "102", "201", "301"],
        "项目名称": ["销售商品收到的现金", "购买商品支付的现金", "购建固定资产支付的现金", "吸收投资收到的现金"],
        "本期金额": [230000, -150000, -5000, 0],
        "上期金额": [210000, -140000, -10000, 0],
    }
    pd.DataFrame(cash_flow_data).to_excel(base_dir / "现金流量表.xlsx", index=False)

    account_mapping_data = {
        "源科目": ["1001", "1002", "1122", "1403", "1601", "2202", "4001", "4104"],
        "目标科目": ["1001", "1002", "1122", "1403", "1601", "2202", "4001", "4104"],
        "映射类型": ["direct", "direct", "direct", "direct", "direct", "direct", "direct", "direct"],
    }
    pd.DataFrame(account_mapping_data).to_excel(base_dir / "科目映射.xlsx", index=False)

    adjustments_data = {
        "分录ID": ["AJ001", "AJ002"],
        "日期": ["2024-12-31", "2024-12-31"],
        "摘要": ["计提坏账准备", "调整收入确认"],
        "借方科目": ["6602", "1122"],
        "贷方科目": ["1122", "6001"],
        "金额": [3000, 5000],
    }
    pd.DataFrame(adjustments_data).to_excel(base_dir / "调整分录.xlsx", index=False)

    print(f"测试数据已生成到: {base_dir.absolute()}")
    print("\n生成的文件:")
    for f in base_dir.iterdir():
        print(f"  - {f.name}")


if __name__ == "__main__":
    generate_test_data()
