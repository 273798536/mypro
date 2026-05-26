from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from app import db
from app.models import (
    LiabilityForecast, ForecastWarning, ForecastCorrection, ForecastCurve,
    PointsLedger, PointTransaction, OrderRefund, Coupon, ActivityPlan
)
from app.services.points_service import PointsExpiryService

class ForecastEngine:
    @staticmethod
    def create_forecast(forecast_name, start_date, end_date, period='monthly', 
                      points_per_yuan=0.01, created_by=None, remark=None):
        forecast = LiabilityForecast(
            forecast_name=forecast_name,
            forecast_period=period,
            start_date=start_date,
            end_date=end_date,
            points_per_yuan=points_per_yuan,
            created_by=created_by,
            remark=remark,
            status='draft'
        )
        db.session.add(forecast)
        db.session.flush()
        
        result = ForecastEngine.calculate_forecast(forecast.id)
        return result

    @staticmethod
    def calculate_forecast(forecast_id):
        forecast = LiabilityForecast.query.get(forecast_id)
        if not forecast:
            return {'error': f'预测记录不存在: ID={forecast_id}'}
        
        ForecastWarning.query.filter_by(forecast_id=forecast_id).delete()
        ForecastCurve.query.filter_by(forecast_id=forecast_id).delete()
        
        warnings = []
        
        total_points_balance = db.session.query(db.func.sum(PointsLedger.available_points)).scalar() or 0
        forecast.total_points_balance = total_points_balance
        
        expiry_result = PointsExpiryService.batch_calculate_expiry(
            forecast.start_date, forecast.end_date
        )
        forecast.expected_expired_points = expiry_result['total_expired_points']
        warnings.extend(expiry_result['warnings'])
        
        pending_refunds = OrderRefund.query.filter(
            OrderRefund.points_returned == False,
            OrderRefund.refund_time >= forecast.start_date,
            OrderRefund.refund_time <= forecast.end_date
        ).all()
        
        expected_refund_points = sum(r.return_points for r in pending_refunds)
        forecast.expected_refund_points = expected_refund_points
        
        for refund in pending_refunds:
            refund_month = refund.refund_time.strftime('%Y-%m')
            forecast_start_month = forecast.start_date.strftime('%Y-%m')
            if refund_month != forecast_start_month:
                warnings.append({
                    'forecast_id': forecast_id,
                    'warning_type': 'pending_refund',
                    'warning_level': 'warning',
                    'message': f'待处理退款跨月: 订单 {refund.order_no} 退款时间 {refund.refund_time.strftime("%Y-%m-%d")}, 涉及积分 {refund.return_points}',
                    'source_reference': f'退款ID={refund.id}, 源行号={refund.source_line}'
                })
        
        active_coupons = Coupon.query.filter(
            Coupon.expire_date >= forecast.start_date,
            Coupon.expire_date <= forecast.end_date,
            Coupon.used_quantity < Coupon.total_quantity
        ).all()
        
        expected_redemption_points = sum(
            c.points_cost * (c.total_quantity - c.used_quantity) * 0.5
            for c in active_coupons
        )
        forecast.expected_redemption_points = int(expected_redemption_points)
        
        expected_coupon_cost = sum(
            c.face_value * (c.total_quantity - c.used_quantity) * 0.5
            for c in active_coupons
        )
        forecast.expected_coupon_cost = expected_coupon_cost
        
        activities = ActivityPlan.query.filter(
            ActivityPlan.start_date <= forecast.end_date,
            ActivityPlan.end_date >= forecast.start_date,
            ActivityPlan.status == 'planned'
        ).all()
        
        for activity in activities:
            forecast.expected_redemption_points += int(activity.expected_points_issued * activity.expected_redemption_rate)
            forecast.expected_coupon_cost += activity.expected_coupon_cost
        
        expired_liability = forecast.expected_expired_points * forecast.points_per_yuan
        refund_liability = forecast.expected_refund_points * forecast.points_per_yuan
        forecast.total_estimated_liability = expired_liability + refund_liability + forecast.expected_coupon_cost
        
        for w in warnings:
            warning = ForecastWarning(
                forecast_id=forecast_id,
                warning_type=w.get('type', w.get('warning_type', 'general')),
                warning_level=w.get('level', w.get('warning_level', 'warning')),
                message=w['message'],
                source_reference=w.get('source_reference')
            )
            db.session.add(warning)
        
        ForecastEngine._generate_curve(forecast)
        
        db.session.commit()
        
        return ForecastEngine._build_forecast_response(forecast)

    @staticmethod
    def _generate_curve(forecast):
        start = forecast.start_date
        end = forecast.end_date
        
        if forecast.forecast_period == 'daily':
            delta = timedelta(days=1)
        elif forecast.forecast_period == 'weekly':
            delta = timedelta(weeks=1)
        else:
            delta = relativedelta(months=1)
        
        current = start
        total_days = (end - start).days + 1
        
        cumulative_expired = 0
        cumulative_redeem = 0
        cumulative_refund = 0
        
        expiry_txns = PointTransaction.query.filter(
            PointTransaction.transaction_type == 'earn',
            PointTransaction.expire_date >= start,
            PointTransaction.expire_date <= end,
            PointTransaction.points > 0
        ).order_by(PointTransaction.expire_date).all()
        
        pending_refunds = OrderRefund.query.filter(
            OrderRefund.points_returned == False,
            OrderRefund.refund_time >= start,
            OrderRefund.refund_time <= end
        ).order_by(OrderRefund.refund_time).all()
        
        while current <= end:
            period_end = current + delta - timedelta(days=1)
            if period_end > end:
                period_end = end
            
            period_expiry = sum(
                t.points for t in expiry_txns 
                if t.expire_date >= current and t.expire_date <= period_end
            )
            cumulative_expired += period_expiry
            
            period_refund = sum(
                r.return_points for r in pending_refunds
                if r.refund_time >= current and r.refund_time <= period_end
            )
            cumulative_refund += period_refund
            
            days_passed = (period_end - start).days + 1
            progress = days_passed / total_days if total_days > 0 else 1
            period_redeem = int(forecast.expected_redemption_points * progress) - cumulative_redeem
            cumulative_redeem += period_redeem
            
            period_liability = (
                (cumulative_expired + cumulative_refund) * forecast.points_per_yuan +
                forecast.expected_coupon_cost * progress
            )
            
            curve = ForecastCurve(
                forecast_id=forecast.id,
                date_point=current,
                cumulative_liability=period_liability,
                expired_points=cumulative_expired,
                redemption_points=cumulative_redeem,
                refund_points=cumulative_refund
            )
            db.session.add(curve)
            
            current += delta

    @staticmethod
    def _build_forecast_response(forecast):
        curve_data = ForecastCurve.query.filter_by(forecast_id=forecast.id).order_by(ForecastCurve.date_point).all()
        warnings = ForecastWarning.query.filter_by(forecast_id=forecast.id).all()
        corrections = ForecastCorrection.query.filter_by(forecast_id=forecast.id).order_by(ForecastCorrection.created_at.desc()).all()
        
        return {
            'id': forecast.id,
            'forecast_name': forecast.forecast_name,
            'forecast_date': forecast.forecast_date.strftime('%Y-%m-%d %H:%M:%S'),
            'forecast_period': forecast.forecast_period,
            'start_date': forecast.start_date.strftime('%Y-%m-%d'),
            'end_date': forecast.end_date.strftime('%Y-%m-%d'),
            'total_points_balance': forecast.total_points_balance,
            'expected_expired_points': forecast.expected_expired_points,
            'expected_refund_points': forecast.expected_refund_points,
            'expected_redemption_points': forecast.expected_redemption_points,
            'expected_coupon_cost': forecast.expected_coupon_cost,
            'total_estimated_liability': forecast.total_estimated_liability,
            'points_per_yuan': forecast.points_per_yuan,
            'status': forecast.status,
            'status_updated_at': forecast.status_updated_at.strftime('%Y-%m-%d %H:%M:%S'),
            'created_by': forecast.created_by,
            'remark': forecast.remark,
            'created_at': forecast.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'warnings': [{
                'id': w.id,
                'type': w.warning_type,
                'level': w.warning_level,
                'message': w.message,
                'source_reference': w.source_reference,
                'created_at': w.created_at.strftime('%Y-%m-%d %H:%M:%S')
            } for w in warnings],
            'corrections': [{
                'id': c.id,
                'field_name': c.field_name,
                'old_value': c.old_value,
                'new_value': c.new_value,
                'correction_reason': c.correction_reason,
                'corrected_by': c.corrected_by,
                'source_reference': c.source_reference,
                'created_at': c.created_at.strftime('%Y-%m-%d %H:%M:%S')
            } for c in corrections],
            'curve': [{
                'date': c.date_point.strftime('%Y-%m-%d'),
                'cumulative_liability': c.cumulative_liability,
                'expired_points': c.expired_points,
                'redemption_points': c.redemption_points,
                'refund_points': c.refund_points
            } for c in curve_data],
            'summary': {
                'expired_liability': forecast.expected_expired_points * forecast.points_per_yuan,
                'refund_liability': forecast.expected_refund_points * forecast.points_per_yuan,
                'coupon_liability': forecast.expected_coupon_cost,
                'warning_count': len(warnings),
                'correction_count': len(corrections)
            }
        }

    @staticmethod
    def update_forecast_status(forecast_id, new_status, updated_by=None):
        forecast = LiabilityForecast.query.get(forecast_id)
        if forecast:
            old_status = forecast.status
            forecast.status = new_status
            forecast.status_updated_at = datetime.now()
            db.session.commit()
            return {
                'success': True,
                'forecast_id': forecast_id,
                'old_status': old_status,
                'new_status': new_status
            }
        return {'error': f'预测记录不存在: ID={forecast_id}'}

    @staticmethod
    def apply_correction(forecast_id, field_name, old_value, new_value, 
                        correction_reason, corrected_by=None, source_reference=None):
        forecast = LiabilityForecast.query.get(forecast_id)
        if not forecast:
            return {'error': f'预测记录不存在: ID={forecast_id}'}
        
        valid_fields = [
            'expected_expired_points', 'expected_refund_points',
            'expected_redemption_points', 'expected_coupon_cost',
            'points_per_yuan', 'remark'
        ]
        
        if field_name not in valid_fields:
            return {
                'error': f'不支持修正该字段',
                'valid_fields': valid_fields,
                'source_reference': f'预测ID={forecast_id}'
            }
        
        correction = ForecastCorrection(
            forecast_id=forecast_id,
            field_name=field_name,
            old_value=str(old_value),
            new_value=str(new_value),
            correction_reason=correction_reason,
            corrected_by=corrected_by,
            source_reference=source_reference
        )
        db.session.add(correction)
        
        current_value = getattr(forecast, field_name)
        if isinstance(current_value, int):
            setattr(forecast, field_name, int(new_value))
        elif isinstance(current_value, float):
            setattr(forecast, field_name, float(new_value))
        else:
            setattr(forecast, field_name, new_value)
        
        forecast.total_estimated_liability = (
            forecast.expected_expired_points + forecast.expected_refund_points) * forecast.points_per_yuan + forecast.expected_coupon_cost
        
        ForecastCurve.query.filter_by(forecast_id=forecast_id).delete()
        ForecastEngine._generate_curve(forecast)
        
        db.session.commit()
        
        return {
            'success': True,
            'correction_id': correction.id,
            'forecast_id': forecast_id,
            'field_name': field_name,
            'old_value': old_value,
            'new_value': new_value
        }

    @staticmethod
    def get_forecast(forecast_id):
        forecast = LiabilityForecast.query.get(forecast_id)
        if forecast:
            return ForecastEngine._build_forecast_response(forecast)
        return None

    @staticmethod
    def list_forecasts(page=1, per_page=20):
        query = LiabilityForecast.query.order_by(LiabilityForecast.created_at.desc())
        total = query.count()
        forecasts = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return {
            'total': total,
            'page': page,
            'per_page': per_page,
            'items': [ForecastEngine._build_forecast_response(f) for f in forecasts]
        }
