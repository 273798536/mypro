from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import and_, or_, func
import json
import pandas as pd
import os

from .models import (
    db, Channel, Contract, GameFlow, Prepayment, Deduction, 
    AnomalyRecord, OperationHistory, FlowCorrection,
    AnomalyType, DeductionType, SettlementStatus
)
from .calculation_engine import CalculationEngine
from config import Config

class FinanceService:
    def __init__(self):
        self.engine = CalculationEngine()
    
    def get_channel_summary(self, channel_id=None):
        query = Channel.query
        if channel_id:
            query = query.filter_by(id=channel_id)
        
        channels = query.all()
        result = []
        
        for channel in channels:
            contracts = Contract.query.filter_by(channel_id=channel.id).all()
            total_guarantee = sum(c.guarantee_amount for c in contracts)
            
            prepayments = Prepayment.query.filter_by(channel_id=channel.id).all()
            total_prepayment = sum(p.amount for p in prepayments)
            total_prepayment_used = sum(p.used_amount for p in prepayments)
            
            flows = GameFlow.query.filter_by(channel_id=channel.id).all()
            total_flow = sum(f.total_flow for f in flows)
            total_net_flow = sum(f.net_flow for f in flows)
            
            result.append({
                'channel_id': channel.id,
                'channel_code': channel.code,
                'channel_name': channel.name,
                'channel_type': channel.channel_type,
                'contract_count': len(contracts),
                'total_guarantee': float(total_guarantee),
                'total_prepayment': float(total_prepayment),
                'total_prepayment_used': float(total_prepayment_used),
                'total_flow': float(total_flow),
                'total_net_flow': float(total_net_flow)
            })
        
        return result
    
    def get_monthly_flow_summary(self, settlement_month=None):
        query = db.session.query(
            GameFlow.settlement_month,
            GameFlow.channel_id,
            Channel.name.label('channel_name'),
            func.sum(GameFlow.total_flow).label('total_flow'),
            func.sum(GameFlow.channel_fee).label('total_channel_fee'),
            func.sum(GameFlow.tax_amount).label('total_tax'),
            func.sum(GameFlow.net_flow).label('total_net_flow'),
            func.count(GameFlow.id).label('flow_count')
        ).join(Channel).group_by(
            GameFlow.settlement_month,
            GameFlow.channel_id,
            Channel.name
        )
        
        if settlement_month:
            query = query.filter_by(settlement_month=settlement_month)
        
        results = query.all()
        
        summary = []
        for r in results:
            summary.append({
                'settlement_month': r.settlement_month,
                'channel_id': r.channel_id,
                'channel_name': r.channel_name,
                'total_flow': float(r.total_flow),
                'total_channel_fee': float(r.total_channel_fee),
                'total_tax': float(r.total_tax),
                'total_net_flow': float(r.total_net_flow),
                'flow_count': r.flow_count
            })
        
        return summary
    
    def get_anomalies(self, anomaly_type=None, is_resolved=None):
        query = AnomalyRecord.query
        
        if anomaly_type:
            query = query.filter_by(anomaly_type=anomaly_type)
        
        if is_resolved is not None:
            query = query.filter_by(is_resolved=is_resolved)
        
        anomalies = query.order_by(AnomalyRecord.created_at.desc()).all()
        
        return [{
            'id': a.id,
            'anomaly_type': a.anomaly_type,
            'related_type': a.related_type,
            'related_id': a.related_id,
            'title': a.title,
            'description': a.description,
            'evidence_data': json.loads(a.evidence_data) if a.evidence_data else None,
            'is_resolved': a.is_resolved,
            'resolved_by': a.resolved_by,
            'resolved_at': a.resolved_at.isoformat() if a.resolved_at else None,
            'resolution_note': a.resolution_note,
            'created_at': a.created_at.isoformat()
        } for a in anomalies]
    
    def get_operation_history(self, related_type=None, related_id=None, operation_type=None, limit=50):
        query = OperationHistory.query
        
        if related_type:
            query = query.filter_by(related_type=related_type)
        
        if related_id:
            query = query.filter_by(related_id=related_id)
        
        if operation_type:
            query = query.filter_by(operation_type=operation_type)
        
        history = query.order_by(OperationHistory.created_at.desc()).limit(limit).all()
        
        return [{
            'id': h.id,
            'operation_type': h.operation_type,
            'related_type': h.related_type,
            'related_id': h.related_id,
            'operator': h.operator,
            'before_data': json.loads(h.before_data) if h.before_data else None,
            'after_data': json.loads(h.after_data) if h.after_data else None,
            'change_summary': h.change_summary,
            'impact_result': h.impact_result,
            'created_at': h.created_at.isoformat()
        } for h in history]
    
    def create_flow_correction(self, flow_id, corrected_by, correction_reason, 
                               new_total_flow=None, new_channel_fee=None, 
                               new_tax_amount=None, new_status=None):
        original_flow = GameFlow.query.get(flow_id)
        if not original_flow:
            raise ValueError('流水记录不存在')
        
        correction = FlowCorrection(
            original_flow_id=flow_id,
            corrected_by=corrected_by,
            correction_reason=correction_reason,
            original_total_flow=original_flow.total_flow,
            original_channel_fee=original_flow.channel_fee,
            original_tax_amount=original_flow.tax_amount,
            original_net_flow=original_flow.net_flow,
            original_status=original_flow.status,
            new_total_flow=new_total_flow if new_total_flow is not None else original_flow.total_flow,
            new_channel_fee=new_channel_fee if new_channel_fee is not None else original_flow.channel_fee,
            new_tax_amount=new_tax_amount if new_tax_amount is not None else original_flow.tax_amount,
            new_net_flow=(new_total_flow if new_total_flow is not None else original_flow.total_flow) - 
                        (new_channel_fee if new_channel_fee is not None else original_flow.channel_fee) - 
                        (new_tax_amount if new_tax_amount is not None else original_flow.tax_amount),
            new_status=new_status if new_status else original_flow.status
        )
        
        db.session.add(correction)
        db.session.commit()
        
        self.engine._record_operation_history(
            operation_type='CORRECTION_CREATE',
            related_type='flow_correction',
            related_id=correction.id,
            operator=corrected_by,
            before_data=json.dumps({
                'flow_id': flow_id,
                'total_flow': float(original_flow.total_flow),
                'channel_fee': float(original_flow.channel_fee),
                'tax_amount': float(original_flow.tax_amount),
                'net_flow': float(original_flow.net_flow),
                'status': original_flow.status
            }, ensure_ascii=False),
            after_data=json.dumps({
                'correction_id': correction.id,
                'new_total_flow': float(correction.new_total_flow),
                'new_channel_fee': float(correction.new_channel_fee),
                'new_tax_amount': float(correction.new_tax_amount),
                'new_net_flow': float(correction.new_net_flow),
                'new_status': correction.new_status
            }, ensure_ascii=False),
            change_summary=f'创建流水修正申请',
            impact_result=f'待审批'
        )
        
        return correction
    
    def apply_flow_correction(self, correction_id, operator):
        correction = FlowCorrection.query.get(correction_id)
        if not correction:
            raise ValueError('修正记录不存在')
        
        if correction.is_applied:
            raise ValueError('修正已应用')
        
        original_flow = GameFlow.query.get(correction.original_flow_id)
        
        before_data = {
            'total_flow': float(original_flow.total_flow),
            'channel_fee': float(original_flow.channel_fee),
            'tax_amount': float(original_flow.tax_amount),
            'net_flow': float(original_flow.net_flow),
            'status': original_flow.status
        }
        
        original_flow.total_flow = correction.new_total_flow
        original_flow.channel_fee = correction.new_channel_fee
        original_flow.tax_amount = correction.new_tax_amount
        original_flow.net_flow = correction.new_net_flow
        original_flow.status = correction.new_status
        
        correction.is_applied = True
        correction.applied_at = datetime.utcnow()
        
        db.session.commit()
        
        self.engine._record_operation_history(
            operation_type='CORRECTION_APPLY',
            related_type='flow_correction',
            related_id=correction_id,
            operator=operator,
            before_data=json.dumps(before_data, ensure_ascii=False),
            after_data=json.dumps({
                'total_flow': float(original_flow.total_flow),
                'channel_fee': float(original_flow.channel_fee),
                'tax_amount': float(original_flow.tax_amount),
                'net_flow': float(original_flow.net_flow),
                'status': original_flow.status
            }, ensure_ascii=False),
            change_summary=f'应用流水修正',
            impact_result=f'流水已更新'
        )
        
        self.engine._create_anomaly_record(
            anomaly_type=AnomalyType.MANUAL_CORRECTION.value,
            related_type='game_flow',
            related_id=correction.original_flow_id,
            title='流水手动修正',
            description=f'流水{correction.original_flow_id}已被手动修正',
            evidence_data=json.dumps({
                'correction_id': correction_id,
                'corrected_by': correction.corrected_by,
                'correction_reason': correction.correction_reason,
                'before': before_data,
                'after': {
                    'total_flow': float(original_flow.total_flow),
                    'channel_fee': float(original_flow.channel_fee),
                    'tax_amount': float(original_flow.tax_amount),
                    'net_flow': float(original_flow.net_flow)
                }
            }, ensure_ascii=False),
            operator=operator
        )
        
        return correction
    
    def get_flow_with_corrections(self, flow_id):
        flow = GameFlow.query.get(flow_id)
        if not flow:
            return None
        
        corrections = FlowCorrection.query.filter_by(original_flow_id=flow_id).order_by(
            FlowCorrection.created_at.desc()
        ).all()
        
        return {
            'original': {
                'id': flow.id,
                'channel_id': flow.channel_id,
                'game_name': flow.game_name,
                'flow_date': flow.flow_date.isoformat(),
                'total_flow': float(flow.total_flow),
                'channel_fee': float(flow.channel_fee),
                'tax_amount': float(flow.tax_amount),
                'net_flow': float(flow.net_flow),
                'status': flow.status,
                'settlement_month': flow.settlement_month
            },
            'corrections': [{
                'id': c.id,
                'corrected_by': c.corrected_by,
                'correction_reason': c.correction_reason,
                'original_total_flow': float(c.original_total_flow),
                'original_channel_fee': float(c.original_channel_fee),
                'original_tax_amount': float(c.original_tax_amount),
                'original_net_flow': float(c.original_net_flow),
                'new_total_flow': float(c.new_total_flow),
                'new_channel_fee': float(c.new_channel_fee),
                'new_tax_amount': float(c.new_tax_amount),
                'new_net_flow': float(c.new_net_flow),
                'is_applied': c.is_applied,
                'applied_at': c.applied_at.isoformat() if c.applied_at else None,
                'created_at': c.created_at.isoformat()
            } for c in corrections]
        }
    
    def export_monthly_report(self, settlement_month, file_format='xlsx'):
        flows = GameFlow.query.filter_by(settlement_month=settlement_month).all()
        anomalies = self.get_anomalies(is_resolved=False)
        
        data = []
        for f in flows:
            data.append({
                '渠道ID': f.channel_id,
                '渠道名称': f.channel.name if f.channel else '',
                '游戏名称': f.game_name,
                '流水日期': f.flow_date.isoformat(),
                '总流水': float(f.total_flow),
                '渠道费': float(f.channel_fee),
                '税费': float(f.tax_amount),
                '净流水': float(f.net_flow),
                '结算月份': f.settlement_month,
                '状态': f.status,
                '备注': f.remark or ''
            })
        
        df_flows = pd.DataFrame(data)
        
        df_anomalies = pd.DataFrame([{
            '异常类型': a['anomaly_type'],
            '标题': a['title'],
            '描述': a['description'],
            '创建时间': a['created_at'],
            '是否解决': '是' if a['is_resolved'] else '否'
        } for a in anomalies])
        
        filename = f'月度报表_{settlement_month}_{datetime.now().strftime("%Y%m%d%H%M%S")}.xlsx'
        filepath = os.path.join(Config.EXPORT_FOLDER, filename)
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            df_flows.to_excel(writer, sheet_name='流水明细', index=False)
            df_anomalies.to_excel(writer, sheet_name='异常记录', index=False)
        
        return filepath
    
    def get_dispute_details(self, anomaly_id):
        anomaly = AnomalyRecord.query.get(anomaly_id)
        if not anomaly:
            return None
        
        related_history = OperationHistory.query.filter_by(
            related_type=anomaly.related_type,
            related_id=anomaly.related_id
        ).order_by(OperationHistory.created_at.desc()).all()
        
        return {
            'anomaly': {
                'id': anomaly.id,
                'type': anomaly.anomaly_type,
                'title': anomaly.title,
                'description': anomaly.description,
                'evidence': json.loads(anomaly.evidence_data) if anomaly.evidence_data else None,
                'is_resolved': anomaly.is_resolved,
                'resolved_by': anomaly.resolved_by,
                'resolution_note': anomaly.resolution_note,
                'created_at': anomaly.created_at.isoformat()
            },
            'related_history': [{
                'operation_type': h.operation_type,
                'operator': h.operator,
                'change_summary': h.change_summary,
                'impact_result': h.impact_result,
                'created_at': h.created_at.isoformat()
            } for h in related_history]
        }
