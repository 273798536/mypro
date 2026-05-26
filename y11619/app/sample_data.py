from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from app import db
from app.models import (
    DataSource, PointsLedger, PointTransaction, ExpiryRule,
    OrderRefund, Coupon, ActivityPlan
)

def init_sample_data():
    if PointsLedger.query.first():
        print("  检测到已有数据，跳过示例数据初始化")
        return
    
    print("  正在初始化示例数据...")
    
    source = DataSource(
        source_name='示例数据初始化',
        source_type='system',
        record_count=0
    )
    db.session.add(source)
    db.session.flush()
    
    members = [
        ('M001', '张三', 5800),
        ('M002', '李四', 12500),
        ('M003', '王五', 3200),
        ('M004', '赵六', 8900),
        ('M005', '钱七', 15600),
        ('M006', '孙八', 2100),
        ('M007', '周九', 6700),
        ('M008', '吴十', 9800),
        ('M009', '郑十一', 4500),
        ('M010', '王十二', 11200),
    ]
    
    for idx, (member_id, name, points) in enumerate(members, start=1):
        ledger = PointsLedger(
            member_id=member_id,
            member_name=name,
            total_points=points,
            available_points=points,
            frozen_points=0,
            expired_points=0,
            source_id=source.id,
            source_line=idx
        )
        db.session.add(ledger)
    
    db.session.flush()
    
    ledgers = PointsLedger.query.all()
    ledger_map = {l.member_id: l.id for l in ledgers}
    
    now = datetime.now()
    transactions = []
    
    for member_id, ledger_id in ledger_map.items():
        txn1 = PointTransaction(
            ledger_id=ledger_id,
            member_id=member_id,
            transaction_type='earn',
            points=3000,
            balance_after=3000,
            expire_date=now + timedelta(days=30),
            remark='购物赠送积分',
            source_id=source.id,
            source_line=len(transactions) + 1
        )
        transactions.append(txn1)
        
        txn2 = PointTransaction(
            ledger_id=ledger_id,
            member_id=member_id,
            transaction_type='earn',
            points=2000,
            balance_after=5000,
            expire_date=now + timedelta(days=60),
            remark='活动奖励积分',
            source_id=source.id,
            source_line=len(transactions) + 1
        )
        transactions.append(txn2)
        
        if member_id in ['M002', 'M005', 'M008', 'M010']:
            txn3 = PointTransaction(
                ledger_id=ledger_id,
                member_id=member_id,
                transaction_type='earn',
                points=5000,
                balance_after=10000,
                expire_date=now + timedelta(days=90),
                remark='大促活动额外赠送',
                source_id=source.id,
                source_line=len(transactions) + 1
            )
            transactions.append(txn3)
    
    for member_id in ['M003', 'M006']:
        ledger_id = ledger_map[member_id]
        txn_cross = PointTransaction(
            ledger_id=ledger_id,
            member_id=member_id,
            transaction_type='earn',
            points=1500,
            balance_after=1500,
            expire_date=now + relativedelta(months=2) + timedelta(days=15),
            remark='跨月过期测试积分',
            source_id=source.id,
            source_line=len(transactions) + 1
        )
        transactions.append(txn_cross)
    
    db.session.add_all(transactions)
    
    refunds = [
        ('ORD2024001', 'M001', now - timedelta(days=5), 500, 500),
        ('ORD2024002', 'M002', now - timedelta(days=12), 800, 800),
        ('ORD2024003', 'M004', now - timedelta(days=45), 300, 300),
        ('ORD2024004', 'M007', now - timedelta(days=3), 1200, 1200),
        ('ORD2024005', 'M009', now - timedelta(days=20), 600, 600),
    ]
    
    for idx, (order_no, member_id, refund_time, original, return_p) in enumerate(refunds, start=1):
        refund = OrderRefund(
            order_no=order_no,
            member_id=member_id,
            refund_time=refund_time,
            original_points=original,
            return_points=return_p,
            return_status='pending',
            points_returned=False,
            source_id=source.id,
            source_line=idx
        )
        db.session.add(refund)
    
    coupons = [
        ('COUPON001', '满100减20券', 'discount', 500, 20, 100, 30),
        ('COUPON002', '满200减50券', 'discount', 1000, 50, 50, 15),
        ('COUPON003', '9折优惠券', 'discount', 2000, 100, 20, 5),
        ('COUPON004', '免邮券', 'shipping', 300, 10, 200, 80),
        ('COUPON005', '会员专属券', 'vip', 1500, 80, 30, 10),
    ]
    
    for idx, (code, name, ctype, points, value, total, used) in enumerate(coupons, start=1):
        coupon = Coupon(
            coupon_code=code,
            coupon_name=name,
            coupon_type=ctype,
            points_cost=points,
            face_value=value,
            total_quantity=total,
            used_quantity=used,
            expire_date=now + relativedelta(months=3),
            source_id=source.id,
            source_line=idx
        )
        db.session.add(coupon)
    
    activities = [
        ('618年中大促', 'promotion', now + timedelta(days=10), now + timedelta(days=30), 50000, 0.4, 5000),
        ('新人专享活动', 'new_user', now, now + relativedelta(months=1), 10000, 0.2, 1000),
        ('会员日双倍积分', 'vip_day', now + timedelta(days=20), now + timedelta(days=22), 20000, 0.3, 2000),
    ]
    
    for idx, (name, atype, start, end, points, rate, cost) in enumerate(activities, start=1):
        activity = ActivityPlan(
            activity_name=name,
            activity_type=atype,
            start_date=start,
            end_date=end,
            expected_points_issued=points,
            expected_redemption_rate=rate,
            expected_coupon_cost=cost,
            status='planned'
        )
        db.session.add(activity)
    
    expiry_rule = ExpiryRule(
        rule_name='默认过期规则',
        rule_type='fixed_date',
        effective_date=now,
        validity_days=365,
        description='积分自获取之日起365天内有效',
        is_active=True
    )
    db.session.add(expiry_rule)
    
    source.record_count = len(transactions) + len(refunds) + len(coupons) + len(activities) + len(members)
    db.session.commit()
    
    print(f"  示例数据初始化完成: {len(members)} 个会员, {len(transactions)} 笔交易, "
          f"{len(refunds)} 笔待处理退款, {len(coupons)} 种兑换券, {len(activities)} 个活动计划")
