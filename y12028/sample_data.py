from datetime import datetime, date, time, timedelta
from models import db, DM, Script, ScriptAuthorization, GameSession, Order, Coupon, CouponVerification


def create_sample_data():
    db.drop_all()
    db.create_all()

    dms = [
        DM(name='张三', phone='13800138001', base_fee=200.0, split_ratio=0.3),
        DM(name='李四', phone='13800138002', base_fee=180.0, split_ratio=0.28),
        DM(name='王五', phone='13800138003', base_fee=220.0, split_ratio=0.32),
        DM(name='赵六', phone='13800138004', base_fee=190.0, split_ratio=0.3),
    ]
    db.session.add_all(dms)
    db.session.flush()

    scripts = [
        Script(name='窗边的女人', author='75先生', difficulty='中等', player_count=6, duration_hours=5.0),
        Script(name='年轮', author='峤然', difficulty='硬核', player_count=5, duration_hours=6.0),
        Script(name='漓川怪谈簿', author='大皮球/钧士林', difficulty='中等', player_count=7, duration_hours=5.5),
        Script(name='持斧奥夫', author='咖啡猫殿下', difficulty='硬核', player_count=6, duration_hours=7.0),
        Script(name='破晓', author='星星', difficulty='情感', player_count=6, duration_hours=5.0),
    ]
    db.session.add_all(scripts)
    db.session.flush()

    authorizations = [
        ScriptAuthorization(
            script_id=scripts[0].id, authorized_dm_id=dms[0].id,
            authorization_fee=100.0, fee_type='per_session',
            valid_from=date(2025, 1, 1), valid_to=date(2026, 12, 31),
            maintained_by='李经理（授权）', maintainer_note='正版盒装授权'
        ),
        ScriptAuthorization(
            script_id=scripts[1].id, authorized_dm_id=dms[1].id,
            authorization_fee=150.0, fee_type='per_session',
            valid_from=date(2025, 1, 1), valid_to=date(2026, 12, 31),
            maintained_by='李经理（授权）', maintainer_note='正版盒装授权'
        ),
        ScriptAuthorization(
            script_id=scripts[2].id, authorized_dm_id=dms[2].id,
            authorization_fee=120.0, fee_type='per_session',
            valid_from=date(2025, 6, 1), valid_to=date(2026, 5, 31),
            maintained_by='王主管（授权）', maintainer_note='正版盒装授权，5月底到期'
        ),
        ScriptAuthorization(
            script_id=scripts[4].id, authorized_dm_id=dms[3].id,
            authorization_fee=5.0, fee_type='percentage',
            valid_from=date(2025, 1, 1), valid_to=None,
            maintained_by='李经理（授权）', maintainer_note='城限授权，分成5%'
        ),
    ]
    db.session.add_all(authorizations)
    db.session.flush()

    coupons = [
        Coupon(coupon_code='NEW2026-001', coupon_type='discount', face_value=50.0, min_spend=200.0,
               valid_from=date(2026, 5, 1), valid_to=date(2026, 5, 31), total_usage_limit=1, used_count=2),
        Coupon(coupon_code='VIP-8888', coupon_type='discount', face_value=88.0, min_spend=300.0,
               valid_from=date(2026, 1, 1), valid_to=date(2026, 12, 31), total_usage_limit=1, used_count=1),
        Coupon(coupon_code='GROUP-100', coupon_type='discount', face_value=100.0, min_spend=500.0,
               valid_from=date(2026, 5, 1), valid_to=date(2026, 5, 31), total_usage_limit=1, used_count=1),
        Coupon(coupon_code='MAY-SALE', coupon_type='discount', face_value=30.0, min_spend=150.0,
               valid_from=date(2026, 5, 1), valid_to=date(2026, 5, 31), total_usage_limit=10, used_count=2),
    ]
    db.session.add_all(coupons)
    db.session.flush()

    base_date = date(2026, 5, 25)
    sessions_data = [
        {
            'session_no': '20260525-01',
            'script_id': scripts[0].id,
            'scheduled_dm_id': dms[0].id,
            'actual_dm_id': dms[0].id,
            'session_date': base_date,
            'start_time': time(14, 0),
            'end_time': time(19, 0),
            'player_count': 6,
            'room_no': 'Room-1',
            'status': 'completed',
            'maintained_by': '张前台（场次）',
            'maintainer_note': '常规场，整车'
        },
        {
            'session_no': '20260525-02',
            'script_id': scripts[1].id,
            'scheduled_dm_id': dms[1].id,
            'actual_dm_id': dms[0].id,
            'session_date': base_date,
            'start_time': time(19, 30),
            'end_time': time(1, 30),
            'player_count': 5,
            'room_no': 'Room-2',
            'status': 'completed',
            'maintained_by': '张前台（场次）',
            'maintainer_note': '李四临时有事，张三代班'
        },
        {
            'session_no': '20260526-01',
            'script_id': scripts[2].id,
            'scheduled_dm_id': dms[2].id,
            'actual_dm_id': dms[2].id,
            'session_date': base_date + timedelta(days=1),
            'start_time': time(13, 0),
            'end_time': time(18, 30),
            'player_count': 7,
            'room_no': 'Room-3',
            'status': 'completed',
            'maintained_by': '刘收银（场次）',
            'maintainer_note': '周末场'
        },
        {
            'session_no': '20260526-02',
            'script_id': scripts[3].id,
            'scheduled_dm_id': dms[3].id,
            'actual_dm_id': dms[3].id,
            'session_date': base_date + timedelta(days=1),
            'start_time': time(20, 0),
            'end_time': time(3, 0),
            'player_count': 6,
            'room_no': 'Room-1',
            'status': 'completed',
            'maintained_by': '刘收银（场次）',
            'maintainer_note': '硬核本，老玩家'
        },
        {
            'session_no': '20260527-01',
            'script_id': scripts[4].id,
            'scheduled_dm_id': dms[3].id,
            'actual_dm_id': dms[3].id,
            'session_date': base_date + timedelta(days=2),
            'start_time': time(14, 0),
            'end_time': time(19, 0),
            'player_count': 6,
            'room_no': 'Room-2',
            'status': 'completed',
            'maintained_by': '张前台（场次）',
            'maintainer_note': '情感本，哭哭车'
        },
        {
            'session_no': '20260527-02',
            'script_id': scripts[0].id,
            'scheduled_dm_id': dms[0].id,
            'actual_dm_id': dms[0].id,
            'session_date': base_date + timedelta(days=2),
            'start_time': time(19, 30),
            'end_time': time(0, 30),
            'player_count': 6,
            'room_no': 'Room-3',
            'status': 'completed',
            'maintained_by': '张前台（场次）',
            'maintainer_note': '拼车成功'
        },
    ]

    sessions = []
    for sd in sessions_data:
        session = GameSession(**sd)
        sessions.append(session)
        db.session.add(session)
    db.session.flush()

    orders_data = [
        {
            'order_no': 'ORD-20260525-001',
            'session_id': sessions[0].id,
            'customer_name': '王先生',
            'customer_phone': '13900139001',
            'player_count': 6,
            'original_amount': 780.0,
            'coupon_discount': 50.0,
            'other_discount': 0.0,
            'actual_amount': 730.0,
            'payment_method': 'wechat',
            'order_status': 'completed',
            'maintained_by': '刘收银（订单）',
            'coupon_index': 0,
        },
        {
            'order_no': 'ORD-20260525-002',
            'session_id': sessions[1].id,
            'customer_name': '李女士',
            'customer_phone': '13900139002',
            'player_count': 5,
            'original_amount': 688.0,
            'coupon_discount': 88.0,
            'other_discount': 0.0,
            'actual_amount': 600.0,
            'payment_method': 'alipay',
            'order_status': 'completed',
            'maintained_by': '刘收银（订单）',
            'coupon_index': 1,
        },
        {
            'order_no': 'ORD-20260526-001',
            'session_id': sessions[2].id,
            'customer_name': '张先生',
            'customer_phone': '13900139003',
            'player_count': 7,
            'original_amount': 910.0,
            'coupon_discount': 100.0,
            'other_discount': 30.0,
            'actual_amount': 780.0,
            'payment_method': 'cash',
            'order_status': 'completed',
            'maintained_by': '孙收银（订单）',
            'coupon_index': 2,
        },
        {
            'order_no': 'ORD-20260526-002',
            'session_id': sessions[3].id,
            'customer_name': '陈先生',
            'customer_phone': '13900139004',
            'player_count': 5,
            'original_amount': 900.0,
            'coupon_discount': 0.0,
            'other_discount': 0.0,
            'actual_amount': 900.0,
            'payment_method': 'wechat',
            'order_status': 'completed',
            'maintained_by': '孙收银（订单）',
            'coupon_index': -1,
        },
        {
            'order_no': 'ORD-20260527-001',
            'session_id': sessions[4].id,
            'customer_name': '周女士',
            'customer_phone': '13900139005',
            'player_count': 6,
            'original_amount': 980.0,
            'coupon_discount': 50.0,
            'other_discount': 0.0,
            'actual_amount': 930.0,
            'payment_method': 'alipay',
            'order_status': 'completed',
            'maintained_by': '刘收银（订单）',
            'coupon_index': 0,
        },
        {
            'order_no': 'ORD-20260527-002',
            'session_id': sessions[4].id,
            'customer_name': '吴女士',
            'customer_phone': '13900139006',
            'player_count': 6,
            'original_amount': 100.0,
            'coupon_discount': 30.0,
            'other_discount': 0.0,
            'actual_amount': 70.0,
            'payment_method': 'wechat',
            'order_status': 'completed',
            'maintained_by': '刘收银（订单）',
            'coupon_index': 3,
        },
        {
            'order_no': 'ORD-20260527-003',
            'session_id': sessions[5].id,
            'customer_name': '郑先生',
            'customer_phone': '13900139007',
            'player_count': 5,
            'original_amount': 650.0,
            'coupon_discount': 30.0,
            'other_discount': 0.0,
            'actual_amount': 620.0,
            'payment_method': 'wechat',
            'order_status': 'completed',
            'maintained_by': '孙收银（订单）',
            'coupon_index': 3,
        },
    ]

    orders = []
    coupon_indices = []
    for od in orders_data:
        coupon_idx = od.pop('coupon_index', -1)
        coupon_indices.append(coupon_idx)
        order = Order(**od)
        orders.append(order)
        db.session.add(order)
    db.session.flush()

    verifiers = ['刘收银（核验）', '孙收银（核验）', '张前台（核验）']
    for i, order in enumerate(orders):
        od = orders_data[i]
        if coupon_indices[i] >= 0 and od['coupon_discount'] > 0:
            coupon = coupons[coupon_indices[i]]
            verification = CouponVerification(
                coupon_id=coupon.id,
                order_id=order.id,
                verified_by=verifiers[i % len(verifiers)],
                verified_at=datetime.combine(
                    sessions[i % len(sessions)].session_date,
                    time(12 + i, 30)
                ),
                verification_note='正常核销' if i != 4 else '系统异常重复核销'
            )
            db.session.add(verification)

    db.session.commit()

    return {
        'dms_count': len(dms),
        'scripts_count': len(scripts),
        'authorizations_count': len(authorizations),
        'coupons_count': len(coupons),
        'sessions_count': len(sessions),
        'orders_count': len(orders),
    }
