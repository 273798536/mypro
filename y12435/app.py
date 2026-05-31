from app import create_app, db
from datetime import datetime, date
from decimal import Decimal

app = create_app()

def init_sample_data():
    from app.models import Channel, Contract, GameFlow, Prepayment
    
    if Channel.query.count() > 0:
        return
    
    huawei = Channel(code='HW001', name='华为应用市场', channel_type='HUAWEI', 
                     contact_person='张经理', contact_email='zhang@huawei.com')
    xiaomi = Channel(code='MI001', name='小米应用商店', channel_type='XIAOMI',
                     contact_person='李经理', contact_email='li@xiaomi.com')
    oppo = Channel(code='OP001', name='OPPO软件商店', channel_type='OPPO',
                   contact_person='王经理', contact_email='wang@oppo.com')
    
    db.session.add_all([huawei, xiaomi, oppo])
    db.session.commit()
    
    contract1 = Contract(
        channel_id=huawei.id,
        contract_no='HT-HW-2024-001',
        game_name='修仙传',
        guarantee_amount=Decimal('500000'),
        revenue_share_ratio=Decimal('0.5'),
        start_date=date(2024, 1, 1),
        end_date=date(2024, 12, 31),
        deduction_rules='保底抵扣优先，买量抵扣次之'
    )
    
    contract2 = Contract(
        channel_id=xiaomi.id,
        contract_no='HT-MI-2024-001',
        game_name='修仙传',
        guarantee_amount=Decimal('300000'),
        revenue_share_ratio=Decimal('0.5'),
        start_date=date(2024, 1, 1),
        end_date=date(2024, 12, 31)
    )
    
    db.session.add_all([contract1, contract2])
    db.session.commit()
    
    prepayment1 = Prepayment(
        channel_id=huawei.id,
        contract_id=contract1.id,
        prepayment_no='YF-HW-001',
        prepayment_type='GUARANTEE',
        amount=Decimal('500000'),
        used_amount=Decimal('450000'),
        remaining_amount=Decimal('50000'),
        effective_date=date(2024, 1, 1),
        expiry_date=date(2024, 12, 31),
        remark='修仙传华为渠道保底预付'
    )
    
    prepayment2 = Prepayment(
        channel_id=xiaomi.id,
        contract_id=contract2.id,
        prepayment_no='YF-MI-001',
        prepayment_type='GUARANTEE',
        amount=Decimal('300000'),
        used_amount=Decimal('300000'),
        remaining_amount=Decimal('0'),
        is_exhausted=True,
        effective_date=date(2024, 1, 1),
        expiry_date=date(2024, 12, 31),
        remark='修仙传小米渠道保底预付'
    )
    
    prepayment3 = Prepayment(
        channel_id=huawei.id,
        contract_id=contract1.id,
        prepayment_no='YF-HW-AD-001',
        prepayment_type='AD_COST',
        amount=Decimal('100000'),
        used_amount=Decimal('30000'),
        remaining_amount=Decimal('70000'),
        effective_date=date(2024, 3, 1),
        expiry_date=date(2024, 12, 31),
        remark='修仙传华为渠道买量预付'
    )
    
    db.session.add_all([prepayment1, prepayment2, prepayment3])
    db.session.commit()
    
    flows = []
    for i in range(1, 11):
        flows.append(GameFlow(
            channel_id=huawei.id,
            contract_id=contract1.id,
            game_name='修仙传',
            flow_date=date(2024, 1, i),
            total_flow=Decimal(str(50000 + i * 1000)),
            channel_fee=Decimal(str(25000 + i * 500)),
            tax_amount=Decimal(str(3000 + i * 60)),
            net_flow=Decimal(str(22000 + i * 440)),
            settlement_month='2024-01',
            status='SETTLED' if i < 8 else 'PENDING'
        ))
    
    for i in range(1, 8):
        flows.append(GameFlow(
            channel_id=xiaomi.id,
            contract_id=contract2.id,
            game_name='修仙传',
            flow_date=date(2024, 1, i),
            total_flow=Decimal(str(30000 + i * 800)),
            channel_fee=Decimal(str(15000 + i * 400)),
            tax_amount=Decimal(str(1800 + i * 48)),
            net_flow=Decimal(str(13200 + i * 352)),
            settlement_month='2024-01',
            status='SETTLED'
        ))
    
    db.session.add_all(flows)
    db.session.commit()
    
    print('示例数据初始化完成')

with app.app_context():
    db.create_all()
    init_sample_data()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
