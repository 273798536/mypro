from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import and_, or_
from .models import (
    db, Prepayment, Deduction, GameFlow, Contract, AnomalyRecord, 
    OperationHistory, AnomalyType, DeductionType
)
import json

class CalculationEngine:
    def __init__(self):
        pass
    
    def calculate_prepayment_usage(self, prepayment_id, operator='system'):
        prepayment = Prepayment.query.get(prepayment_id)
        if not prepayment:
            return None
        return {
            'prepayment_id': prepayment.id,
            'prepayment_no': prepayment.prepayment_no,
            'total_amount': float(prepayment.amount),
            'used_amount': float(prepayment.used_amount),
            'remaining_amount': float(prepayment.remaining_amount),
            'usage_rate': round(float(prepayment.used_amount / prepayment.amount * 100), 2) if prepayment.amount > 0 else 0,
            'is_exhausted': prepayment.is_exhausted
        }
    
    def check_guarantee_exhaustion(self, contract_id, operator='system'):
        contract = Contract.query.get(contract_id)
        if not contract:
            return None
        
        prepayments = Prepayment.query.filter(
            Prepayment.contract_id == contract_id,
            Prepayment.prepayment_type == 'GUARANTEE'
        ).all()
        
        total_guarantee = sum(p.amount for p in prepayments)
        total_used = sum(p.used_amount for p in prepayments)
        exhaustion_rate = float(total_used / total_guarantee * 100) if total_guarantee > 0 else 0
        
        is_exhausted = total_used >= total_guarantee
        
        result = {
            'contract_id': contract_id,
            'contract_no': contract.contract_no,
            'game_name': contract.game_name,
            'total_guarantee': float(total_guarantee),
            'total_used': float(total_used),
            'exhaustion_rate': round(exhaustion_rate, 2),
            'is_exhausted': is_exhausted,
            'prepayments': []
        }
        
        for p in prepayments:
            result['prepayments'].append({
                'id': p.id,
                'prepayment_no': p.prepayment_no,
                'amount': float(p.amount),
                'used_amount': float(p.used_amount),
                'remaining_amount': float(p.remaining_amount),
                'is_exhausted': p.is_exhausted
            })
        
        if is_exhausted:
            self._create_anomaly_record(
                anomaly_type=AnomalyType.GUARANTEE_EXHAUSTED.value,
                related_type='contract',
                related_id=contract_id,
                title=f'保底用尽预警',
                description=f'合同{contract.contract_no}保底已用尽',
                evidence_data=json.dumps(result, ensure_ascii=False),
                operator=operator
            )
        
        return result
    
    def detect_duplicate_deductions(self, game_flow_id=None, date_range=None, operator='system'):
        query = Deduction.query
        
        if game_flow_id:
            query = query.filter_by(game_flow_id=game_flow_id)
        
        if date_range and len(date_range) == 2:
            query = query.filter(
                and_(
                    Deduction.deduction_date >= date_range[0],
                    Deduction.deduction_date <= date_range[1]
                )
            )
        
        deductions = query.all()
        
        grouped = {}
        for d in deductions:
            key = (d.game_flow_id, d.deduction_type, d.amount, d.deduction_date)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(d)
        
        duplicates = []
        for key, ded_list in grouped.items():
            if len(ded_list) > 1:
                duplicates.extend(ded_list)
                for d in ded_list:
                    d.is_duplicate = True
                    if not d.related_deduction_id:
                        others = [x for x in ded_list if x.id != d.id]
                        if others:
                            d.related_deduction_id = others[0].id
        
        db.session.commit()
        
        if duplicates:
            for d in duplicates[:1]:
                self._create_anomaly_record(
                    anomaly_type=AnomalyType.DUPLICATE_DEDUCTION.value,
                    related_type='deduction',
                    related_id=d.id,
                    title=f'抵扣重复检测',
                    description=f'检测到重复抵扣记录',
                    evidence_data=json.dumps({
                        'deduction_id': d.id,
                        'game_flow_id': d.game_flow_id,
                        'deduction_type': d.deduction_type,
                        'amount': float(d.amount),
                        'deduction_date': str(d.deduction_date),
                        'related_deduction_id': d.related_deduction_id
                    }, ensure_ascii=False),
                    operator=operator
                )
        
        return [
            {
                'id': d.id,
                'game_flow_id': d.game_flow_id,
                'deduction_type': d.deduction_type,
                'amount': float(d.amount),
                'deduction_date': str(d.deduction_date),
                'related_deduction_id': d.related_deduction_id
            } for d in duplicates
        ]
    
    def check_contract_flow_consistency(self, contract_id, operator='system'):
        contract = Contract.query.get(contract_id)
        if not contract:
            return None
        
        game_flows = GameFlow.query.filter_by(contract_id=contract_id).all()
        
        total_flow = sum(f.net_flow for f in game_flows)
        expected_share = total_flow * contract.revenue_share_ratio
        
        actual_deductions = Deduction.query.join(GameFlow).filter(
            GameFlow.contract_id == contract_id
        ).all()
        
        total_actual_deducted = sum(d.amount for d in actual_deductions)
        
        difference = float(expected_share - total_actual_deducted)
        is_consistent = abs(difference) < 0.01
        
        result = {
            'contract_id': contract_id,
            'contract_no': contract.contract_no,
            'total_flow': float(total_flow),
            'revenue_share_ratio': float(contract.revenue_share_ratio),
            'expected_share': float(expected_share),
            'actual_deducted': float(total_actual_deducted),
            'difference': difference,
            'is_consistent': is_consistent
        }
        
        if not is_consistent:
            self._create_anomaly_record(
                anomaly_type=AnomalyType.CONTRACT_FLOW_MISMATCH.value,
                related_type='contract',
                related_id=contract_id,
                title=f'合同流水不一致',
                description=f'合同{contract.contract_no}流水与抵扣不一致',
                evidence_data=json.dumps(result, ensure_ascii=False),
                operator=operator
            )
        
        return result
    
    def apply_deduction(self, prepayment_id, game_flow_id, deduction_type, amount, 
                       deduction_date, evidence=None, operator='system', remark=''):
        prepayment = Prepayment.query.get(prepayment_id)
        if not prepayment:
            raise ValueError('预付记录不存在')
        
        if prepayment.remaining_amount < amount:
            raise ValueError('预付余额不足')
        
        deduction = Deduction(
            game_flow_id=game_flow_id,
            prepayment_id=prepayment_id,
            deduction_type=deduction_type,
            amount=amount,
            deduction_date=deduction_date,
            evidence=evidence,
            operator=operator,
            remark=remark
        )
        
        db.session.add(deduction)
        
        prepayment.used_amount += amount
        prepayment.remaining_amount -= amount
        
        if prepayment.remaining_amount <= 0:
            prepayment.is_exhausted = True
        
        db.session.commit()
        
        self._record_operation_history(
            operation_type='DEDUCTION_APPLY',
            related_type='deduction',
            related_id=deduction.id,
            operator=operator,
            before_data=json.dumps({
                'prepayment_id': prepayment_id,
                'before_remaining': float(prepayment.remaining_amount + amount)
            }, ensure_ascii=False),
            after_data=json.dumps({
                'deduction_id': deduction.id,
                'after_remaining': float(prepayment.remaining_amount)
            }, ensure_ascii=False),
            change_summary=f'抵扣{str(amount)}',
            impact_result=f'预付余额剩余{float(prepayment.remaining_amount)}'
        )
        
        return deduction
    
    def reconcile_dispute_note(self, anomaly_id, resolved_by, resolution_note):
        anomaly = AnomalyRecord.query.get(anomaly_id)
        if not anomaly:
            raise ValueError('异常记录不存在')
        
        anomaly.is_resolved = True
        anomaly.resolved_by = resolved_by
        anomaly.resolved_at = datetime.utcnow()
        anomaly.resolution_note = resolution_note
        
        db.session.commit()
        
        return anomaly
    
    def _create_anomaly_record(self, anomaly_type, related_type, related_id, title, 
                               description, evidence_data, operator='system'):
        anomaly = AnomalyRecord(
            anomaly_type=anomaly_type,
            related_type=related_type,
            related_id=related_id,
            title=title,
            description=description,
            evidence_data=evidence_data
        )
        db.session.add(anomaly)
        db.session.commit()
        return anomaly
    
    def _record_operation_history(self, operation_type, related_type, related_id, operator,
                            before_data, after_data, change_summary, impact_result):
        history = OperationHistory(
            operation_type=operation_type,
            related_type=related_type,
            related_id=related_id,
            operator=operator,
            before_data=before_data,
            after_data=after_data,
            change_summary=change_summary,
            impact_result=impact_result
        )
        db.session.add(history)
        db.session.commit()
        return history
