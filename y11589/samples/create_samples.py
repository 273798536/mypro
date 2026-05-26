#!/usr/bin/env python3
import os
import json
import zipfile

SAMPLE_DIR = os.path.dirname(os.path.abspath(__file__))


def create_sample_contract_txt():
    content = """XX系统开发服务合同
合同编号：HT-SAMPLE-001
签订日期：2024年01月15日
生效日期：2024年02月01日
到期日期：2024年12月31日

甲方：甲方科技有限公司
乙方：乙方软件股份有限公司

合同总金额：¥500,000.00元

付款节点：
1. 预付款：合同签订后5个工作日内支付，金额150,000.00元
2. 需求验收款：需求规格说明书验收通过后支付，金额150,000.00元，支付日期2024年04月01日
3. 上线验收款：系统上线验收通过后支付，金额150,000.00元，支付日期2024年08月01日
4. 质保金：质保期满无质量问题支付，金额50,000.00元，支付日期2025年02月01日
"""
    path = os.path.join(SAMPLE_DIR, "sample_contract.txt")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"创建样例合同文本: {path}")
    return path


def create_sample_email():
    content = """From: 项目经理 <pm@company-a.com>
To: 法务部 <legal@company-b.com>
Subject: 关于XX系统需求规格说明书的验收确认
Date: Thu, 28 Mar 2024 10:30:00 +0800

您好，

经过双方项目组的共同评审，现对XX系统需求规格说明书予以验收通过。
验收日期：2024年03月28日

请按照合同约定办理付款手续。

此致
敬礼
项目经理
"""
    path = os.path.join(SAMPLE_DIR, "sample_acceptance.eml")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"创建样例验收邮件: {path}")
    return path


def create_sample_payment_json():
    data = {
        "contract_info": {
            "contract_name": "YY平台运维服务合同",
            "contract_no": "HT-SAMPLE-002"
        },
        "payment_nodes": [
            {
                "node_name": "首季度运维费",
                "node_no": "P001",
                "planned_amount": 90000.00,
                "planned_date": "2024-03-20",
                "milestone": "第一季度服务完成"
            },
            {
                "node_name": "第二季度运维费",
                "node_no": "P002",
                "planned_amount": 90000.00,
                "planned_date": "2024-06-20",
                "milestone": "第二季度服务完成"
            },
            {
                "bad_data": "缺少node_name",
                "planned_amount": 50000.00
            }
        ]
    }
    path = os.path.join(SAMPLE_DIR, "sample_payment_nodes.json")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"创建样例付款节点JSON: {path}")
    return path


def create_sample_zip():
    contract_txt = """ZZ硬件采购合同
合同编号：HT-SAMPLE-003
签订日期：2024年02月20日
甲方：甲方科技有限公司
乙方：丁方设备销售有限公司
合同总金额：1,200,000.00元

付款节点：
P01 预付款：360,000.00元，合同签订后支付
P02 到货验收款：600,000.00元，设备到货验收后支付
P03 质保金：240,000.00元，质保期满支付
"""

    email_txt = """From: 设备管理员 <admin@company.com>
To: 财务 <finance@company.com>
Subject: ZZ硬件设备到货验收确认
Date: 2024-03-15

设备已到货并验收通过，日期2024年03月15日，请安排付款。
"""

    path = os.path.join(SAMPLE_DIR, "sample_archive.zip")
    with zipfile.ZipFile(path, 'w') as zf:
        zf.writestr("zz_hardware_contract.txt", contract_txt)
        zf.writestr("acceptance_email.txt", email_txt)
    print(f"创建样例压缩包: {path}")
    return path


def create_all_samples():
    os.makedirs(SAMPLE_DIR, exist_ok=True)
    create_sample_contract_txt()
    create_sample_email()
    create_sample_payment_json()
    create_sample_zip()
    print("\n所有样例文件创建完成！")


if __name__ == "__main__":
    create_all_samples()
