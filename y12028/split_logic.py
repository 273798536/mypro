from datetime import datetime, date
from models import (
    db, GameSession, Order, ScriptAuthorization, DM, Script, Coupon,
    CouponVerification, SessionSplit, SplitDetail,
    DataConflict, AnomalyRecord
)


class SplitCalculator:
    def __init__(self, session_id):
        self.session = GameSession.query.get(session_id)
        if not self.session:
            raise ValueError(f"场次 {session_id} 不存在")

    def calculate_split(self, force_recalculate=False):
        if self.session.status != 'completed':
            raise ValueError(f"场次 {self.session.session_no} 未完成，无法分账")

        existing_split = SessionSplit.query.filter_by(session_id=self.session.id).first()
        if existing_split and not force_recalculate:
            return existing_split

        if existing_split:
            SplitDetail.query.filter_by(split_id=existing_split.id).delete()
            db.session.delete(existing_split)
            db.session.flush()

        orders = Order.query.filter_by(
            session_id=self.session.id,
            order_status='completed'
        ).all()

        total_revenue = sum(o.actual_amount for o in orders)
        total_coupon_discount = sum(o.coupon_discount for o in orders)

        actual_dm_id = self.session.actual_dm_id or self.session.scheduled_dm_id
        actual_dm = DM.query.get(actual_dm_id)

        authorization = self._find_valid_authorization()

        dm_fee = self._calculate_dm_fee(actual_dm, total_revenue)
        authorization_fee = self._calculate_authorization_fee(authorization, total_revenue)
        store_share = total_revenue - dm_fee - authorization_fee

        split = SessionSplit(
            session_id=self.session.id,
            total_revenue=total_revenue,
            total_coupon_discount=total_coupon_discount,
            store_share=store_share,
            dm_fee=dm_fee,
            authorization_fee=authorization_fee,
            net_profit=store_share,
            split_date=date.today(),
            remark=self._generate_split_remark(authorization, actual_dm)
        )
        db.session.add(split)
        db.session.flush()

        self._create_split_details(split, actual_dm, authorization, total_revenue, dm_fee, authorization_fee, store_share)

        db.session.commit()
        return split

    def _find_valid_authorization(self):
        session_date = self.session.session_date
        return ScriptAuthorization.query.filter(
            ScriptAuthorization.script_id == self.session.script_id,
            ScriptAuthorization.valid_from <= session_date,
            (ScriptAuthorization.valid_to == None) | (ScriptAuthorization.valid_to >= session_date)
        ).first()

    def _calculate_dm_fee(self, dm, total_revenue):
        if not dm:
            return 0.0
        base_fee = dm.base_fee or 0.0
        ratio = dm.split_ratio or 0.3
        return max(base_fee, total_revenue * ratio)

    def _calculate_authorization_fee(self, authorization, total_revenue):
        if not authorization:
            return 0.0
        if authorization.fee_type == 'fixed':
            return authorization.authorization_fee
        elif authorization.fee_type == 'percentage':
            return total_revenue * (authorization.authorization_fee / 100)
        else:
            return authorization.authorization_fee

    def _generate_split_remark(self, authorization, actual_dm):
        remarks = []
        if self.session.actual_dm_id and self.session.actual_dm_id != self.session.scheduled_dm_id:
            remarks.append(f"DM代班: {self.session.scheduled_dm.name} -> {actual_dm.name if actual_dm else '未知'}")
        if not authorization:
            remarks.append("未找到有效剧本授权")
        return "; ".join(remarks) if remarks else "正常分账"

    def _create_split_details(self, split, actual_dm, authorization, total_revenue, dm_fee, authorization_fee, store_share):
        if dm_fee > 0:
            db.session.add(SplitDetail(
                split_id=split.id,
                recipient_type='dm',
                recipient_id=actual_dm.id if actual_dm else None,
                recipient_name=actual_dm.name if actual_dm else '未知DM',
                amount=dm_fee,
                split_type='dm_fee',
                related_record_id=self.session.id,
                related_record_type='game_session',
                remark=f"DM带场费用，基础费{actual_dm.base_fee if actual_dm else 0}，分成比例{(actual_dm.split_ratio if actual_dm else 0.3) * 100}%"
            ))

        if authorization_fee > 0:
            db.session.add(SplitDetail(
                split_id=split.id,
                recipient_type='authorizer',
                recipient_id=authorization.authorized_dm_id if authorization else None,
                recipient_name=authorization.authorized_dm.name if authorization and authorization.authorized_dm else '授权方',
                amount=authorization_fee,
                split_type='authorization_fee',
                related_record_id=authorization.id if authorization else None,
                related_record_type='script_authorization',
                remark=f"剧本授权费，{authorization.fee_type if authorization else 'per_session'}"
            ))

        if store_share > 0:
            db.session.add(SplitDetail(
                split_id=split.id,
                recipient_type='store',
                recipient_id=0,
                recipient_name='门店',
                amount=store_share,
                split_type='store_share',
                related_record_id=self.session.id,
                related_record_type='game_session',
                remark=f"门店分成，总收入{total_revenue}扣除DM费{dm_fee}和授权费{authorization_fee}"
            ))


class ConflictDetector:
    def __init__(self, session_id=None):
        self.session_id = session_id

    def detect_all_conflicts(self):
        DataConflict.query.filter(DataConflict.status == 'pending').delete()
        db.session.commit()

        sessions = GameSession.query.all()
        if self.session_id:
            sessions = [s for s in sessions if s.id == self.session_id]

        conflicts = []
        for session in sessions:
            conflicts.extend(self._detect_session_conflicts(session))

        return conflicts

    def _detect_session_conflicts(self, session):
        conflicts = []

        authorizations = ScriptAuthorization.query.filter_by(script_id=session.script_id).all()
        for auth in authorizations:
            if auth.maintained_by != session.maintained_by:
                conflict = self._check_dm_conflict(session, auth)
                if conflict:
                    conflicts.append(conflict)
                    db.session.add(conflict)

        for order in session.orders:
            if order.maintained_by != session.maintained_by:
                conflict = self._check_player_count_conflict(session, order)
                if conflict:
                    conflicts.append(conflict)
                    db.session.add(conflict)

        db.session.commit()
        return conflicts

    def _check_dm_conflict(self, session, authorization):
        actual_dm_id = session.actual_dm_id or session.scheduled_dm_id
        if actual_dm_id != authorization.authorized_dm_id:
            scheduled_dm = DM.query.get(session.scheduled_dm_id)
            auth_dm = DM.query.get(authorization.authorized_dm_id)

            return DataConflict(
                conflict_type='dm_mismatch',
                session_id=session.id,
                record_a_id=session.id,
                record_a_type='game_session',
                record_a_maintainer=session.maintained_by,
                record_a_value=f"排期DM: {scheduled_dm.name if scheduled_dm else '未知'}",
                record_b_id=authorization.id,
                record_b_type='script_authorization',
                record_b_maintainer=authorization.maintained_by,
                record_b_value=f"授权DM: {auth_dm.name if auth_dm else '未知'}",
                field_name='dm_id',
                status='pending',
                resolution_note=''
            )
        return None

    def _check_player_count_conflict(self, session, order):
        if session.player_count != order.player_count:
            return DataConflict(
                conflict_type='player_count_mismatch',
                session_id=session.id,
                record_a_id=session.id,
                record_a_type='game_session',
                record_a_maintainer=session.maintained_by,
                record_a_value=f"场次人数: {session.player_count}",
                record_b_id=order.id,
                record_b_type='order',
                record_b_maintainer=order.maintained_by,
                record_b_value=f"订单人数: {order.player_count}",
                field_name='player_count',
                status='pending',
                resolution_note=''
            )
        return None


class AnomalyDetector:
    def __init__(self, session_id=None):
        self.session_id = session_id

    def detect_all_anomalies(self):
        AnomalyRecord.query.filter(AnomalyRecord.status == 'open').delete()
        db.session.commit()

        anomalies = []
        anomalies.extend(self._detect_duplicate_coupon_usage())
        anomalies.extend(self._detect_dm_substitution())
        anomalies.extend(self._detect_missing_authorization())
        anomalies.extend(self._detect_unauthorized_fee())
        anomalies.extend(self._detect_amount_mismatch())

        db.session.commit()
        return anomalies

    def _detect_duplicate_coupon_usage(self):
        anomalies = []

        verifications = CouponVerification.query.all()
        coupon_usage_count = {}

        for v in verifications:
            key = v.coupon_id
            coupon_usage_count[key] = coupon_usage_count.get(key, []) + [v]

        for coupon_id, usages in coupon_usage_count.items():
            coupon = Coupon.query.get(coupon_id)
            if not coupon:
                continue

            if len(usages) > coupon.total_usage_limit:
                for usage in usages[coupon.total_usage_limit:]:
                    order = Order.query.get(usage.order_id)
                    session = GameSession.query.get(order.session_id) if order else None

                    first_usage = usages[0]
                    first_order = Order.query.get(first_usage.order_id)

                    anomaly = AnomalyRecord(
                        anomaly_type='duplicate_coupon',
                        severity='error',
                        session_id=session.id if session else None,
                        related_record_id=usage.id,
                        related_record_type='coupon_verification',
                        description=f"券码【{coupon.coupon_code}】重复核销，"
                                   f"限用{coupon.total_usage_limit}次，实际已用{len(usages)}次。"
                                   f"首次核销订单: {first_order.order_no if first_order else '未知'}，"
                                   f"重复核销订单: {order.order_no if order else '未知'}",
                        plain_explanation=f"这张优惠券【{coupon.coupon_code}】本来只能用{coupon.total_usage_limit}次，"
                                        f"但被用了{len(usages)}次。第一次用在订单「{first_order.order_no if first_order else '未知'}」，"
                                        f"第{coupon.total_usage_limit + 1}次及以后的核销都不能算。"
                                        f"问题出在订单「{order.order_no if order else '未知'}」这次核销，应该退掉这{coupon.face_value}元优惠。",
                        status='open'
                    )
                    anomalies.append(anomaly)
                    db.session.add(anomaly)

        return anomalies

    def _detect_dm_substitution(self):
        anomalies = []

        sessions = GameSession.query.filter(
            GameSession.actual_dm_id != None,
            GameSession.actual_dm_id != GameSession.scheduled_dm_id
        ).all()

        if self.session_id:
            sessions = [s for s in sessions if s.id == self.session_id]

        for session in sessions:
            scheduled_dm = DM.query.get(session.scheduled_dm_id)
            actual_dm = DM.query.get(session.actual_dm_id)

            anomaly = AnomalyRecord(
                anomaly_type='dm_substitution',
                severity='warning',
                session_id=session.id,
                related_record_id=session.id,
                related_record_type='game_session',
                description=f"场次【{session.session_no}】DM代班，"
                           f"排期DM: {scheduled_dm.name if scheduled_dm else '未知'}，"
                           f"实际DM: {actual_dm.name if actual_dm else '未知'}",
                plain_explanation=f"「{session.session_no}」这场本来安排的是{scheduled_dm.name if scheduled_dm else '谁？'}带场，"
                                f"结果换成了{actual_dm.name if actual_dm else '另一个DM'}。"
                                f"请确认代班是否经过审批，分账时要把DM费付给{actual_dm.name if actual_dm else '实际带场的人'}，"
                                f"不要错打给{scheduled_dm.name if scheduled_dm else '原来排的人'}。",
                status='open'
            )
            anomalies.append(anomaly)
            db.session.add(anomaly)

        return anomalies

    def _detect_missing_authorization(self):
        anomalies = []

        sessions = GameSession.query.filter_by(status='completed').all()
        if self.session_id:
            sessions = [s for s in sessions if s.id == self.session_id]

        for session in sessions:
            auth = ScriptAuthorization.query.filter(
                ScriptAuthorization.script_id == session.script_id,
                ScriptAuthorization.valid_from <= session.session_date,
                (ScriptAuthorization.valid_to == None) | (ScriptAuthorization.valid_to >= session.session_date)
            ).first()

            if not auth:
                script = Script.query.get(session.script_id)
                anomaly = AnomalyRecord(
                    anomaly_type='missing_authorization',
                    severity='error',
                    session_id=session.id,
                    related_record_id=session.script_id,
                    related_record_type='script',
                    description=f"场次【{session.session_no}】使用剧本【{script.name if script else '未知'}】，"
                               f"但未找到{session.session_date}当天有效的授权记录",
                    plain_explanation=f"「{session.session_no}」这场开了剧本「{script.name if script else '这个剧本'}」，"
                                    f"但查不到{session.session_date.strftime('%Y年%m月%d日')}当天的授权合同。"
                                    f"这意味着这笔授权费可能要追回或补交，需要联系剧本发行方补签授权。",
                    status='open'
                )
                anomalies.append(anomaly)
                db.session.add(anomaly)

        return anomalies

    def _detect_unauthorized_fee(self):
        anomalies = []

        splits = SessionSplit.query.filter(SessionSplit.authorization_fee > 0).all()
        for split in splits:
            session = GameSession.query.get(split.session_id)
            if not session:
                continue

            auth = ScriptAuthorization.query.filter(
                ScriptAuthorization.script_id == session.script_id,
                ScriptAuthorization.authorized_dm_id == session.scheduled_dm_id
            ).first()

            if not auth:
                anomaly = AnomalyRecord(
                    anomaly_type='unauthorized_fee',
                    severity='error',
                    session_id=session.id,
                    related_record_id=split.id,
                    related_record_type='session_split',
                    description=f"场次【{session.session_no}】分账已扣除授权费{split.authorization_fee}元，"
                               f"但未找到对应授权记录，疑似多扣授权费",
                    plain_explanation=f"「{session.session_no}」这场的分账里扣了{split.authorization_fee}元授权费，"
                                    f"但查不到对应的授权合同。这{split.authorization_fee}元可能是扣错了，"
                                    f"应该加回门店收入里。请确认授权合同是否存在。",
                    status='open'
                )
                anomalies.append(anomaly)
                db.session.add(anomaly)

        return anomalies

    def _detect_amount_mismatch(self):
        anomalies = []

        splits = SessionSplit.query.all()
        for split in splits:
            calculated_total = split.store_share + split.dm_fee + split.authorization_fee
            if abs(calculated_total - split.total_revenue) > 0.01:
                anomaly = AnomalyRecord(
                    anomaly_type='amount_mismatch',
                    severity='error',
                    session_id=split.session_id,
                    related_record_id=split.id,
                    related_record_type='session_split',
                    description=f"场次分账【{split.id}】金额不匹配，"
                               f"总收入{split.total_revenue}，"
                               f"三方合计{calculated_total}，"
                               f"差额{abs(calculated_total - split.total_revenue)}",
                    plain_explanation=f"这笔分账的数字对不上：总收入是{split.total_revenue}元，"
                                    f"但门店+DM+授权方加起来是{calculated_total}元，"
                                    f"差了{abs(calculated_total - split.total_revenue)}元。"
                                    f"可能是分账公式算错了，请人工核对。",
                    status='open'
                )
                anomalies.append(anomaly)
                db.session.add(anomaly)

        return anomalies


def run_full_split_process(start_date=None, end_date=None):
    sessions = GameSession.query.filter_by(status='completed')

    if start_date:
        sessions = sessions.filter(GameSession.session_date >= start_date)
    if end_date:
        sessions = sessions.filter(GameSession.session_date <= end_date)

    sessions = sessions.all()

    results = []
    for session in sessions:
        try:
            calc = SplitCalculator(session.id)
            split = calc.calculate_split(force_recalculate=True)
            results.append({
                'session_no': session.session_no,
                'status': 'success',
                'split_id': split.id,
                'total_revenue': split.total_revenue
            })
        except Exception as e:
            results.append({
                'session_no': session.session_no,
                'status': 'failed',
                'error': str(e)
            })

    conflict_detector = ConflictDetector()
    conflicts = conflict_detector.detect_all_conflicts()

    anomaly_detector = AnomalyDetector()
    anomalies = anomaly_detector.detect_all_anomalies()

    return {
        'split_results': results,
        'conflict_count': len(conflicts),
        'anomaly_count': len(anomalies)
    }
