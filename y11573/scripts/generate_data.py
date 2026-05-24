#!/usr/bin/env python3
import json
import random
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import init_database
from app.models import SlaRule, Ticket, TicketTransferLog, SessionSummary, CompensationApproval

TICKET_TYPES = ['complaint', 'consultation', 'refund', 'technical', 'billing']
PRIORITIES = ['low', 'normal', 'high', 'urgent']
HANDLERS = ['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'sunqi']
CUSTOMER_NAMES = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十']


def generate_sla_rules():
    rules = [
        {
            'rule_code': 'SLA-COMPLAINT-HIGH',
            'rule_name': '投诉工单-高优先级',
            'ticket_type': 'complaint',
            'priority_level': 'high',
            'first_response_timeout': 30,
            'resolution_timeout': 240,
            'compensation_coefficient': 2.0,
        },
        {
            'rule_code': 'SLA-COMPLAINT-NORMAL',
            'rule_name': '投诉工单-普通优先级',
            'ticket_type': 'complaint',
            'priority_level': 'normal',
            'first_response_timeout': 60,
            'resolution_timeout': 480,
            'compensation_coefficient': 1.5,
        },
        {
            'rule_code': 'SLA-REFUND-URGENT',
            'rule_name': '退款工单-紧急',
            'ticket_type': 'refund',
            'priority_level': 'urgent',
            'first_response_timeout': 15,
            'resolution_timeout': 120,
            'compensation_coefficient': 3.0,
        },
        {
            'rule_code': 'SLA-TECHNICAL-HIGH',
            'rule_name': '技术工单-高优先级',
            'ticket_type': 'technical',
            'priority_level': 'high',
            'first_response_timeout': 45,
            'resolution_timeout': 360,
            'compensation_coefficient': 1.5,
        },
        {
            'rule_code': 'SLA-CONSULTATION-NORMAL',
            'rule_name': '咨询工单-普通',
            'ticket_type': 'consultation',
            'priority_level': 'normal',
            'first_response_timeout': 120,
            'resolution_timeout': 1440,
            'compensation_coefficient': 1.0,
        },
        {
            'rule_code': 'SLA-BILLING-NORMAL',
            'rule_name': '账单工单-普通',
            'ticket_type': 'billing',
            'priority_level': 'normal',
            'first_response_timeout': 90,
            'resolution_timeout': 720,
            'compensation_coefficient': 1.2,
        },
    ]
    
    for rule_data in rules:
        existing = SlaRule.get_by_code(rule_data['rule_code'])
        if not existing:
            SlaRule.create(**rule_data, created_by='system')
            print(f"Created SLA rule: {rule_data['rule_code']}")
        else:
            print(f"SLA rule exists: {rule_data['rule_code']}")


def generate_tickets(count=50):
    tickets = []
    import uuid
    
    for i in range(count):
        ticket_type = random.choice(TICKET_TYPES)
        priority = random.choice(PRIORITIES)
        handler = random.choice(HANDLERS)
        customer_name = random.choice(CUSTOMER_NAMES)
        
        created_at = datetime.now() - timedelta(
            days=random.randint(0, 30),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        )
        
        unique_suffix = str(uuid.uuid4().hex[:6]).upper()
        ticket_no = f'TK{datetime.now().strftime("%Y%m%d")}{unique_suffix}'
        
        sla_rule = SlaRule.match_rule(ticket_type, priority)
        
        ticket_data = {
            'ticket_no': ticket_no,
            'title': f'{get_ticket_title(ticket_type)} - {customer_name}',
            'ticket_type': ticket_type,
            'priority_level': priority,
            'customer_id': f'CUST{random.randint(1000, 9999)}',
            'customer_name': customer_name,
            'current_handler': handler,
            'status': random.choice(['open', 'in_progress', 'resolved', 'closed']),
            'sla_rule_id': sla_rule.id if sla_rule else None,
            'created_at': created_at.isoformat(),
            'updated_at': created_at.isoformat(),
        }
        
        if ticket_data['status'] in ['resolved', 'closed']:
            resolved_at = created_at + timedelta(hours=random.randint(1, 72))
            ticket_data['resolved_at'] = resolved_at.isoformat()
            ticket_data['first_response_at'] = (created_at + timedelta(minutes=random.randint(10, 120))).isoformat()
            if ticket_data['status'] == 'closed':
                ticket_data['closed_at'] = (resolved_at + timedelta(hours=1)).isoformat()
        
        ticket = Ticket.create(**ticket_data)
        tickets.append(ticket)
        
        print(f"Created ticket: {ticket_no} ({ticket_type}/{priority})")
        
        generate_ticket_extras(ticket, created_at)
    
    return tickets


def generate_ticket_extras(ticket, created_at):
    if random.random() > 0.3:
        summary_types = ['auto', 'manual']
        summary = SessionSummary.create(
            ticket_id=ticket.id,
            summary_content=generate_session_summary(ticket.ticket_type),
            summary_type=random.choice(summary_types),
            key_points=json.dumps(generate_key_points(), ensure_ascii=False),
            customer_emotion=random.choice(['neutral', 'satisfied', 'dissatisfied', 'angry']),
            created_by='system',
            version=1
        )
        print(f"  - Added session summary")
    
    transfer_count = random.randint(0, 3)
    current_handler = ticket.current_handler
    current_time = created_at
    
    for j in range(transfer_count):
        new_handler = random.choice([h for h in HANDLERS if h != current_handler])
        transfer_time = current_time + timedelta(minutes=random.randint(30, 240))
        
        TicketTransferLog.create(
            ticket_id=ticket.id,
            from_handler=current_handler,
            to_handler=new_handler,
            transfer_reason=random.choice(['技能不匹配', '需要专家介入', '休假交接', '客户指定']),
            transfer_time=transfer_time.isoformat(),
            operator='system'
        )
        
        current_handler = new_handler
        current_time = transfer_time
        print(f"  - Added transfer log")
    
    if random.random() > 0.5 and ticket.status in ['resolved', 'closed']:
        comp_amount = round(random.uniform(50, 500), 2)
        CompensationApproval.create(
            ticket_id=ticket.id,
            compensation_type=random.choice(['refund', 'discount', 'coupon', 'cash']),
            requested_amount=comp_amount,
            approved_amount=comp_amount * random.uniform(0.8, 1.0),
            approval_status=random.choice(['pending', 'approved', 'rejected']),
            sla_rule_id=ticket.sla_rule_id,
            calculation_basis=json.dumps({'base_amount': comp_amount, 'reason': 'SLA violation'}, ensure_ascii=False),
            applicant='system',
            approver=random.choice(HANDLERS) if random.random() > 0.5 else None,
            version=1
        )
        print(f"  - Added compensation approval")


def get_ticket_title(ticket_type):
    titles = {
        'complaint': ['服务态度投诉', '处理时效投诉', '解决方案不满意', '重复问题投诉'],
        'consultation': ['产品使用咨询', '功能咨询', '流程咨询', '政策咨询'],
        'refund': ['申请退款', '部分退款', '全额退款', '重复扣款退款'],
        'technical': ['系统故障', '功能异常', '性能问题', '兼容性问题'],
        'billing': ['账单疑问', '费用异常', '发票问题', '扣费失败'],
    }
    return random.choice(titles.get(ticket_type, ['问题咨询']))


def generate_session_summary(ticket_type):
    summaries = {
        'complaint': '客户对处理结果不满意，要求重新处理。客户情绪激动，建议优先处理。',
        'consultation': '客户咨询产品功能使用方法，已提供详细操作步骤和文档链接。',
        'refund': '客户因产品未达预期申请退款，已核实符合退款条件，走正常退款流程。',
        'technical': '客户反馈系统响应缓慢，已记录相关日志，转交技术团队排查。',
        'billing': '客户对本月账单有疑问，已解释明细构成，客户表示理解。',
    }
    return summaries.get(ticket_type, '客户咨询相关问题，已记录并转相应部门处理。')


def generate_key_points():
    points = [
        '客户首次反馈',
        '需要后续跟进',
        '涉及敏感操作',
        '客户情绪稳定',
        '需要升级处理',
    ]
    return random.sample(points, random.randint(1, 3))


def generate_json_test_file(output_path='data/test_tickets.json', count=20):
    tickets = []
    
    for i in range(count):
        ticket_type = random.choice(TICKET_TYPES)
        priority = random.choice(PRIORITIES)
        customer_name = random.choice(CUSTOMER_NAMES)
        
        ticket = {
            'ticket_no': f'IMPORT{datetime.now().strftime("%Y%m%d")}{i+1:04d}',
            '标题': f'{get_ticket_title(ticket_type)} - {customer_name}',
            '工单类型': ticket_type,
            '优先级': priority,
            '客户ID': f'CUST{random.randint(1000, 9999)}',
            '客户姓名': customer_name,
            '处理人': random.choice(HANDLERS),
            '状态': random.choice(['open', 'in_progress', 'resolved']),
            '会话摘要': generate_session_summary(ticket_type),
            'SLA规则': '',
            '补偿金额': round(random.uniform(0, 300), 2) if random.random() > 0.5 else 0,
        }
        tickets.append(ticket)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(tickets, f, ensure_ascii=False, indent=2)
    
    print(f"Generated test JSON file: {output_path} with {count} tickets")
    return output_path


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate test data')
    parser.add_argument('--tickets', type=int, default=50, help='Number of tickets to generate')
    parser.add_argument('--json-file', type=str, help='Generate JSON test file')
    parser.add_argument('--json-count', type=int, default=20, help='Number of tickets in JSON file')
    
    args = parser.parse_args()
    
    init_database()
    
    print("=" * 50)
    print("Generating SLA rules...")
    generate_sla_rules()
    
    print("\nGenerating tickets...")
    generate_tickets(args.tickets)
    
    if args.json_file:
        print("\nGenerating JSON test file...")
        generate_json_test_file(args.json_file, args.json_count)
    
    print("\n" + "=" * 50)
    print("Data generation complete!")
