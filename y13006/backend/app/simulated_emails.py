SIMULATED_EMAILS = [
    {
        "email_message_id": "ABS-2026-001-normal@company.com",
        "subject": "【审批】ABS现金流明细 - 2026年5月第1批",
        "sender": "finance_sender@company.com",
        "recipient": "amin_cashflow@company.com",
        "sent_at": "2026-05-15 09:30:00",
        "received_at": "2026-05-15 09:32:15",
        "status": "completed",
        "is_attachment_late": False,
        "raw_content": """
各位好，

附件是2026年5月第1批ABS现金流明细，请审批。

现金流表格如下（税费与汇率在同一列，格式为"税费/汇率"）：

| 行号 | 交易日期   | 金额       | 币种 | 对手方         | 税费/汇率   | 凭证号       |
|------|------------|------------|------|----------------|-------------|--------------|
| 1    | 2026-05-10 | 1,250,000  | CNY  | 兴业信托       | 25000/7.2345| ABS-2026-001 |
| 2    | 2026-05-12 | 580,000    | USD  | 招商证券       | 11600/1.0000| ABS-2026-002 |

附件：ABS现金流明细_20260515.xlsx
已同步凭证：ABS-2026-001、ABS-2026-002

财务部
2026-05-15
""",
        "attachments": [
            {
                "file_name": "ABS现金流明细_20260515.xlsx",
                "is_arrived": True,
                "arrived_at": "2026-05-15 09:32:15",
                "rows": [
                    {
                        "row_number": 1,
                        "transaction_date": "2026-05-10",
                        "amount": 1250000.00,
                        "currency": "CNY",
                        "counterparty": "兴业信托",
                        "raw_mixed_tax_rate": "25000/7.2345",
                        "tax_amount": 25000.00,
                        "exchange_rate": 7.2345,
                        "voucher_number": "ABS-2026-001",
                        "unique_key": "ABS-2026-001"
                    },
                    {
                        "row_number": 2,
                        "transaction_date": "2026-05-12",
                        "amount": 580000.00,
                        "currency": "USD",
                        "counterparty": "招商证券",
                        "raw_mixed_tax_rate": "11600/1.0000",
                        "tax_amount": 11600.00,
                        "exchange_rate": 1.0000,
                        "voucher_number": "ABS-2026-002",
                        "unique_key": "ABS-2026-002"
                    }
                ]
            }
        ],
        "record_statuses": {
            "ABS-2026-001": "normal",
            "ABS-2026-002": "normal"
        },
        "manual_remarks": [
            {
                "voucher_number": "ABS-2026-001",
                "remark_content": "兴业信托5月利息已确认到账，与台账一致。",
                "operator": "项目经理-李明",
                "is_export_synced": True
            }
        ]
    },
    {
        "email_message_id": "ABS-2026-002-late-attachment@company.com",
        "subject": "【审批】ABS现金流明细 - 2026年5月第2批（凭证后补）",
        "sender": "finance_sender@company.com",
        "recipient": "amin_cashflow@company.com",
        "sent_at": "2026-05-18 14:20:00",
        "received_at": "2026-05-18 14:22:30",
        "status": "suspended",
        "is_attachment_late": True,
        "raw_content": """
阿敏好，

本批有1笔业务凭证还在走流程，预计明天上午可以补上。先把邮件发过来，其余记录可以先审批。

现金流表格如下：

| 行号 | 交易日期   | 金额       | 币种 | 对手方         | 税费/汇率   | 凭证号       |
|------|------------|------------|------|----------------|-------------|--------------|
| 1    | 2026-05-15 | 890,000    | CNY  | 平安资管       | 17800/7.2180| ABS-2026-003 |
| 2    | 2026-05-16 | 320,000    | HKD  | 中信建投       | 待确认/待确认| ABS-2026-004 |

附件：ABS现金流明细_20260518.xlsx
已同步凭证：ABS-2026-003
【注意】ABS-2026-004 凭证和附件晚到，待明日补充。

财务部
2026-05-18
""",
        "attachments": [
            {
                "file_name": "ABS现金流明细_20260518.xlsx",
                "is_arrived": True,
                "arrived_at": "2026-05-18 14:22:30",
                "rows": [
                    {
                        "row_number": 1,
                        "transaction_date": "2026-05-15",
                        "amount": 890000.00,
                        "currency": "CNY",
                        "counterparty": "平安资管",
                        "raw_mixed_tax_rate": "17800/7.2180",
                        "tax_amount": 17800.00,
                        "exchange_rate": 7.2180,
                        "voucher_number": "ABS-2026-003",
                        "unique_key": "ABS-2026-003"
                    }
                ]
            },
            {
                "file_name": "ABS现金流明细_20260518_补充凭证.xlsx",
                "is_arrived": False,
                "arrived_at": None,
                "rows": [
                    {
                        "row_number": 2,
                        "transaction_date": "2026-05-16",
                        "amount": 320000.00,
                        "currency": "HKD",
                        "counterparty": "中信建投",
                        "raw_mixed_tax_rate": "待确认/待确认",
                        "tax_amount": None,
                        "exchange_rate": None,
                        "voucher_number": "ABS-2026-004",
                        "unique_key": "ABS-2026-004"
                    }
                ]
            }
        ],
        "record_statuses": {
            "ABS-2026-003": "normal",
            "ABS-2026-004": "suspended"
        },
        "abnormal_reasons": {
            "ABS-2026-004": "凭证晚到：审批邮件第2行税费与汇率均标注'待确认'，对应附件'ABS现金流明细_20260518_补充凭证.xlsx'尚未到达。系统已挂起，待项目经理确认后再处理。"
        },
        "manual_remarks": []
    },
    {
        "email_message_id": "ABS-2026-003-bad-data@company.com",
        "subject": "【审批】ABS现金流明细 - 2026年5月第3批（含异常）",
        "sender": "finance_sender@company.com",
        "recipient": "amin_cashflow@company.com",
        "sent_at": "2026-05-20 11:05:00",
        "received_at": "2026-05-20 11:08:00",
        "status": "completed",
        "is_attachment_late": False,
        "raw_content": """
各位好，

附件是2026年5月第3批ABS现金流明细。

注意：第1行金额为负数（冲销），第2行数据录入有误，税费和汇率格式不对。

现金流表格：

| 行号 | 交易日期   | 金额       | 币种 | 对手方         | 税费/汇率       | 凭证号       |
|------|------------|------------|------|----------------|-----------------|--------------|
| 1    | 2026-05-18 | -45,000    | CNY  | 华泰证券       | 900/7.2000      | ABS-2026-005 |
| 2    | 2026-05-19 | ABCDEF     | CNY  | ？？？         | 格式错误格式错   | ABS-2026-006 |

附件：ABS现金流明细_20260520.xlsx
凭证：ABS-2026-005（第2行凭证号错误，待核实）

财务部
2026-05-20
""",
        "attachments": [
            {
                "file_name": "ABS现金流明细_20260520.xlsx",
                "is_arrived": True,
                "arrived_at": "2026-05-20 11:08:00",
                "rows": [
                    {
                        "row_number": 1,
                        "transaction_date": "2026-05-18",
                        "amount": -45000.00,
                        "currency": "CNY",
                        "counterparty": "华泰证券",
                        "raw_mixed_tax_rate": "900/7.2000",
                        "tax_amount": 900.00,
                        "exchange_rate": 7.2000,
                        "voucher_number": "ABS-2026-005",
                        "unique_key": "ABS-2026-005"
                    },
                    {
                        "row_number": 2,
                        "transaction_date": "2026-05-19",
                        "amount": "ABCDEF",
                        "currency": "CNY",
                        "counterparty": "？？？",
                        "raw_mixed_tax_rate": "格式错误格式错",
                        "tax_amount": None,
                        "exchange_rate": None,
                        "voucher_number": "ABS-2026-006",
                        "unique_key": "ABS-2026-006"
                    }
                ]
            }
        ],
        "record_statuses": {
            "ABS-2026-005": "normal",
            "ABS-2026-006": "abnormal"
        },
        "abnormal_reasons": {
            "ABS-2026-006": "审批邮件第2行数据异常：金额列='ABCDEF'（非数字），对手方='？？？'（无效名称），税费/汇率列='格式错误格式错'（无法按'/'拆分为税费和汇率）。已跳过该记录，请人工核实原始邮件数据。"
        },
        "manual_remarks": [
            {
                "voucher_number": "ABS-2026-005",
                "remark_content": "负金额为冲销上月多计提的利息，已与财务确认。",
                "operator": "项目经理-李明",
                "is_export_synced": False
            }
        ]
    }
]
