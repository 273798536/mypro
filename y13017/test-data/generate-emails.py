import os
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from email.utils import formatdate, make_msgid
from pathlib import Path

out_dir = Path(__file__).parent

def make_eml(from_addr, to_addr, subject, date_str, body, attachments=None):
    msg = MIMEMultipart()
    msg['From'] = from_addr
    msg['To'] = to_addr
    msg['Subject'] = subject
    msg['Date'] = date_str
    msg['Message-ID'] = make_msgid()

    msg.attach(MIMEText(body, 'plain', 'utf-8'))

    if attachments:
        for att in attachments:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(att['content'].encode('utf-8'))
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename="{att["filename"]}"'
            )
            part.add_header('Content-Type', f'{att.get("type", "application/octet-stream")}; name="{att["filename"]}"')
            msg.attach(part)

    return msg.as_string()

emails = [
    {
        'file': '01-CD202506001-approval.eml',
        'from': 'risk@bank.com',
        'to': 'ops@company.com',
        'subject': '审批：争议款 CD202506001 信用卡拒付',
        'date': 'Mon, 09 Jun 2025 10:30:00 +0800',
        'body': '''争议款编号: CD202506001
卡号: 4336********7788
交易日期: 2025-06-01
交易金额: USD 1299.50
授权号: AP882734
商户名称: GLOBAL SHOP HK LIMITED
争议类型: 持卡人未收到货物
税费: 77.97
汇率: 7.2450
清算金额: CNY 9414.58

审批意见: 同意拒付，请提供物流凭证。
状态: 待补材料
''',
        'attachments': [
            {'filename': '拒付申请表.pdf', 'type': 'application/pdf', 'content': 'FAKE PDF CONTENT FOR CD202506001'}
        ]
    },
    {
        'file': '02-CD202506002-approval.eml',
        'from': 'risk@bank.com',
        'to': 'ops@company.com',
        'subject': '审批：争议款 CD202506002 金额异议',
        'date': 'Mon, 09 Jun 2025 11:15:00 +0800',
        'body': '''争议款编号: CD202506002
卡号: 5187********2231
交易日期: 2025-06-03
交易金额: HKD 5600.00
授权号: AP991280
商户名称: BEAUTY PLUS COSMETICS
争议类型: 金额不符

审批意见: 请补充交易小票，确认税费和汇率。
状态: 待补材料
''',
        'attachments': [
            {'filename': '持卡人异议.pdf', 'type': 'application/pdf', 'content': 'DISPUTE LETTER'}
        ]
    },
    {
        'file': '03-CD202506003-processed.eml',
        'from': 'risk@bank.com',
        'to': 'ops@company.com',
        'subject': '审批通过：争议款 CD202506003 已处理完成',
        'date': 'Mon, 09 Jun 2025 14:00:00 +0800',
        'body': '''争议款编号: CD202506003
卡号: 4931********5562
交易日期: 2025-05-28
交易金额: EUR 488.00
授权号: AP776543
商户名称: EUROPEAN WATCH CO
争议类型: 伪冒交易
税费: 0
汇率: 7.8520
清算金额: CNY 3831.78

审批结果: 已处理，银行已赔付。
状态: 已处理
''',
        'attachments': [
            {'filename': '银行赔付凭证.pdf', 'type': 'application/pdf', 'content': 'BANK PAYMENT CONFIRMATION'}
        ]
    },
    {
        'file': '04-CD202506001-late-attachment.eml',
        'from': 'logistics@vendor.com',
        'to': 'ops@company.com',
        'subject': 'Re: CD202506001 物流凭证（晚到）',
        'date': 'Mon, 09 Jun 2025 16:45:00 +0800',
        'body': '''争议款编号: CD202506001

关于 2025-06-01 的交易，附上物流签收凭证。
该邮件因服务器问题延迟送达，请见谅。

补充信息:
税费: 77.97
汇率: 7.2450
''',
        'attachments': [
            {'filename': '物流签收单_CD202506001.pdf', 'type': 'application/pdf', 'content': 'LATE LOGISTICS RECEIPT'},
            {'filename': '发货单副本.pdf', 'type': 'application/pdf', 'content': 'SHIPPING ORDER COPY'}
        ]
    },
    {
        'file': '05-CD202506002-supplement.eml',
        'from': 'finance@bank.com',
        'to': 'ops@company.com',
        'subject': '补充：CD202506002 税费汇率确认',
        'date': 'Mon, 09 Jun 2025 15:20:00 +0800',
        'body': '''争议款编号: CD202506002

补充税费和汇率信息:
税费: 448.00
汇率: 0.9250
清算金额: CNY 5180.00
''',
        'attachments': [
            {'filename': '汇率确认单.xlsx', 'type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content': 'FX CONFIRMATION DATA'}
        ]
    }
]

for e in emails:
    content = make_eml(e['from'], e['to'], e['subject'], e['date'], e['body'], e.get('attachments'))
    path = out_dir / e['file']
    path.write_text(content, encoding='utf-8')
    print(f'已生成: {e["file"]}')

print('\n测试邮件已生成，共 5 封:')
print('  01-CD202506001-approval.eml        - 正常审批（完整数据+1附件）')
print('  02-CD202506002-approval.eml        - 正常审批（缺少税费汇率+1附件）')
print('  03-CD202506003-processed.eml       - 已处理完成（完整数据）')
print('  04-CD202506001-late-attachment.eml - 晚到凭证（针对001，含2附件）')
print('  05-CD202506002-supplement.eml      - 补充税费汇率（针对002）')
print('\n测试场景说明:')
print('  第一轮导入 01~03 → 创建 3 条争议款')
print('  重复导入 01 → 检测到重复，不覆盖，人工备注保留')
print('  导入 04（晚到凭证）→ 关联到 CD202506001，标记晚到，记录影响范围')
print('  导入 05 → 补充 CD202506002 缺失的税费汇率')
