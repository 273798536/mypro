from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from app.models import (
    PointsLedger, PointTransaction, ExpiryRule, 
    OrderRefund, Coupon, CouponRedemption
)
from app import db

class PointsExpiryService:
    @staticmethod
    def calculate_expiry(ledger_id, start_date, end_date):
        ledger = PointsLedger.query.get(ledger_id)
        if not ledger:
            return {'error': f'账本不存在: ID={ledger_id}'}
        
        transactions = PointTransaction.query.filter(
            PointTransaction.ledger_id == ledger_id,
            PointTransaction.transaction_type == 'earn',
            PointTransaction.expire_date >= start_date,
            PointTransaction.expire_date <= end_date,
            PointTransaction.points > 0
        ).order_by(PointTransaction.expire_date).all()
        
        expiry_details = []
        total_expired = 0
        cross_month_warnings = []
        
        for txn in transactions:
            if txn.expire_date:
                expire_month = txn.expire_date.strftime('%Y-%m')
                start_month = start_date.strftime('%Y-%m')
                end_month = end_date.strftime('%Y-%m')
                
                is_cross_month = expire_month != start_month and expire_month != end_month
                
                expiry_details.append({
                    'transaction_id': txn.id,
                    'member_id': txn.member_id,
                    'points': txn.points,
                    'expire_date': txn.expire_date.strftime('%Y-%m-%d'),
                    'expire_month': expire_month,
                    'is_cross_month': is_cross_month,
                    'source_line': txn.source_line,
                    'remark': txn.remark
                })
                
                total_expired += txn.points
                
                if is_cross_month:
                    cross_month_warnings.append({
                        'type': 'cross_month_expiry',
                        'message': f'会员 {txn.member_id} 的积分 {txn.points} 在预测期外跨月过期',
                        'source_reference': f'交易ID={txn.id}, 源行号={txn.source_line}',
                        'expire_date': txn.expire_date.strftime('%Y-%m-%d'),
                        'points': txn.points
                    })
        
        return {
            'ledger_id': ledger_id,
            'member_id': ledger.member_id,
            'total_expired_points': total_expired,
            'expiry_details': expiry_details,
            'cross_month_warnings': cross_month_warnings
        }

    @staticmethod
    def batch_calculate_expiry(start_date, end_date):
        ledgers = PointsLedger.query.filter(PointsLedger.available_points > 0).all()
        results = []
        all_warnings = []
        grand_total = 0
        
        for ledger in ledgers:
            result = PointsExpiryService.calculate_expiry(ledger.id, start_date, end_date)
            if 'error' not in result:
                results.append(result)
                grand_total += result['total_expired_points']
                all_warnings.extend(result['cross_month_warnings'])
        
        return {
            'total_expired_points': grand_total,
            'ledger_count': len(results),
            'results': results,
            'warnings': all_warnings
        }

class RefundService:
    @staticmethod
    def process_refund(refund_id):
        refund = OrderRefund.query.get(refund_id)
        if not refund:
            return {'error': f'退款记录不存在: ID={refund_id}'}
        
        if refund.points_returned:
            return {'error': f'该退款已处理过积分返还: 订单号={refund.order_no}'}
        
        ledger = PointsLedger.query.filter_by(member_id=refund.member_id).first()
        if not ledger:
            return {
                'error': f'会员账本不存在',
                'source_reference': f'退款ID={refund_id}, 源行号={refund.source_line}, 会员ID={refund.member_id}'
            }
        
        refund_month = refund.refund_time.strftime('%Y-%m')
        now_month = datetime.now().strftime('%Y-%m')
        is_cross_month = refund_month != now_month
        
        warnings = []
        if is_cross_month:
            warnings.append({
                'type': 'cross_month_refund',
                'message': f'退款发生在 {refund_month}, 当前处理月份 {now_month}, 跨月返积分需谨慎',
                'source_reference': f'退款ID={refund_id}, 源行号={refund.source_line}, 订单号={refund.order_no}',
                'refund_month': refund_month,
                'current_month': now_month
            })
        
        old_balance = ledger.available_points
        ledger.available_points += refund.return_points
        
        transaction = PointTransaction(
            ledger_id=ledger.id,
            member_id=refund.member_id,
            transaction_type='refund_return',
            points=refund.return_points,
            balance_after=ledger.available_points,
            order_no=refund.order_no,
            remark=f'订单退款返还积分, 原订单积分: {refund.original_points}',
            is_refund=True,
            refund_from_id=refund_id,
            source_id=refund.source_id,
            source_line=refund.source_line
        )
        
        refund.points_returned = True
        refund.return_status = 'completed'
        refund.is_cross_month = is_cross_month
        
        db.session.add(transaction)
        db.session.commit()
        
        return {
            'success': True,
            'refund_id': refund_id,
            'member_id': refund.member_id,
            'order_no': refund.order_no,
            'returned_points': refund.return_points,
            'old_balance': old_balance,
            'new_balance': ledger.available_points,
            'is_cross_month': is_cross_month,
            'warnings': warnings,
            'source_reference': f'源行号={refund.source_line}'
        }

    @staticmethod
    def get_pending_refunds():
        refunds = OrderRefund.query.filter_by(points_returned=False).all()
        return [{
            'id': r.id,
            'order_no': r.order_no,
            'member_id': r.member_id,
            'refund_time': r.refund_time.strftime('%Y-%m-%d %H:%M:%S'),
            'original_points': r.original_points,
            'return_points': r.return_points,
            'source_line': r.source_line
        } for r in refunds]

class CouponService:
    @staticmethod
    def redeem_coupon(coupon_code, member_id):
        coupon = Coupon.query.filter_by(coupon_code=coupon_code).first()
        if not coupon:
            return {
                'error': f'兑换券不存在',
                'source_reference': f'券码={coupon_code}'
            }
        
        if coupon.used_quantity >= coupon.total_quantity:
            return {
                'error': f'兑换券库存不足',
                'source_reference': f'券码={coupon_code}, 源行号={coupon.source_line}'
            }
        
        if coupon.expire_date < datetime.now():
            return {
                'error': f'兑换券已过期',
                'source_reference': f'券码={coupon_code}, 过期时间={coupon.expire_date}, 源行号={coupon.source_line}'
            }
        
        ledger = PointsLedger.query.filter_by(member_id=member_id).first()
        if not ledger:
            return {
                'error': f'会员账本不存在',
                'source_reference': f'会员ID={member_id}'
            }
        
        if ledger.available_points < coupon.points_cost:
            return {
                'error': f'会员积分不足',
                'source_reference': f'会员ID={member_id}, 当前积分={ledger.available_points}, 需要积分={coupon.points_cost}'
            }
        
        old_balance = ledger.available_points
        ledger.available_points -= coupon.points_cost
        coupon.used_quantity += 1
        
        redemption = CouponRedemption(
            coupon_code=coupon_code,
            member_id=member_id,
            points_used=coupon.points_cost,
            verify_status='pending',
            source_id=coupon.source_id
        )
        
        transaction = PointTransaction(
            ledger_id=ledger.id,
            member_id=member_id,
            transaction_type='redeem',
            points=-coupon.points_cost,
            balance_after=ledger.available_points,
            coupon_code=coupon_code,
            remark=f'兑换券: {coupon.coupon_name}',
            source_id=coupon.source_id
        )
        
        db.session.add_all([redemption, transaction])
        db.session.commit()
        
        return {
            'success': True,
            'redemption_id': redemption.id,
            'coupon_code': coupon_code,
            'coupon_name': coupon.coupon_name,
            'member_id': member_id,
            'points_used': coupon.points_cost,
            'old_balance': old_balance,
            'new_balance': ledger.available_points,
            'face_value': coupon.face_value,
            'verify_status': 'pending'
        }

    @staticmethod
    def verify_redemption(redemption_id, success=True, fail_reason=None):
        redemption = CouponRedemption.query.get(redemption_id)
        if not redemption:
            return {'error': f'兑换记录不存在: ID={redemption_id}'}
        
        if redemption.verify_status != 'pending':
            return {
                'error': f'兑换已处理过: 当前状态={redemption.verify_status}',
                'source_reference': f'兑换ID={redemption_id}'
            }
        
        warnings = []
        
        if not success:
            coupon = Coupon.query.filter_by(coupon_code=redemption.coupon_code).first()
            if coupon:
                coupon.verify_fail_count += 1
                coupon.last_verify_fail_time = datetime.now()
                coupon.verify_fail_reason = fail_reason
            
            ledger = PointsLedger.query.filter_by(member_id=redemption.member_id).first()
            if ledger:
                ledger.available_points += redemption.points_used
                
                rollback_txn = PointTransaction(
                    ledger_id=ledger.id,
                    member_id=redemption.member_id,
                    transaction_type='redeem_rollback',
                    points=redemption.points_used,
                    balance_after=ledger.available_points,
                    coupon_code=redemption.coupon_code,
                    remark=f'券核销失败回滚: {fail_reason}',
                    source_line=redemption.source_line
                )
                db.session.add(rollback_txn)
            
            redemption.verify_status = 'failed'
            redemption.verify_fail_reason = fail_reason
            redemption.is_rollback = True
            redemption.rollback_reason = fail_reason
            
            warnings.append({
                'type': 'coupon_verify_failed',
                'message': f'券 {redemption.coupon_code} 核销失败，积分已回滚: {fail_reason}',
                'source_reference': f'兑换ID={redemption_id}, 源行号={redemption.source_line}',
                'points_rolled_back': redemption.points_used
            })
        else:
            redemption.verify_status = 'verified'
            redemption.verify_time = datetime.now()
        
        db.session.commit()
        
        return {
            'success': True,
            'redemption_id': redemption_id,
            'verify_status': redemption.verify_status,
            'warnings': warnings
        }

    @staticmethod
    def get_pending_verifications():
        redemptions = CouponRedemption.query.filter_by(verify_status='pending').all()
        return [{
            'id': r.id,
            'coupon_code': r.coupon_code,
            'member_id': r.member_id,
            'points_used': r.points_used,
            'redeem_time': r.redeem_time.strftime('%Y-%m-%d %H:%M:%S'),
            'source_line': r.source_line
        } for r in redemptions]
