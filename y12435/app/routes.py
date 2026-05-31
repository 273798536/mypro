from flask import Blueprint, jsonify, request, render_template, send_file
from datetime import datetime, date
import os
from decimal import Decimal

from .models import (
    db, Channel, Contract, GameFlow, Prepayment, Deduction, 
    AnomalyRecord, FlowCorrection
)
from .calculation_engine import CalculationEngine
from .services import FinanceService

bp = Blueprint('api', __name__)
engine = CalculationEngine()
service = FinanceService()

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/api/channels', methods=['GET'])
def get_channels():
    data = service.get_channel_summary()
    return jsonify({'success': True, 'data': data})

@bp.route('/api/channels/<int:channel_id>', methods=['GET'])
def get_channel(channel_id):
    data = service.get_channel_summary(channel_id)
    if data:
        return jsonify({'success': True, 'data': data[0]})
    return jsonify({'success': False, 'message': '渠道不存在'}), 404

@bp.route('/api/channels', methods=['POST'])
def create_channel():
    data = request.json
    channel = Channel(
        code=data['code'],
        name=data['name'],
        channel_type=data['channel_type'],
        contact_person=data.get('contact_person'),
        contact_email=data.get('contact_email')
    )
    db.session.add(channel)
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': channel.id}})

@bp.route('/api/contracts', methods=['GET'])
def get_contracts():
    contracts = Contract.query.all()
    data = []
    for c in contracts:
        data.append({
            'id': c.id,
            'channel_id': c.channel_id,
            'channel_name': c.channel.name if c.channel else '',
            'contract_no': c.contract_no,
            'game_name': c.game_name,
            'guarantee_amount': float(c.guarantee_amount),
            'revenue_share_ratio': float(c.revenue_share_ratio),
            'start_date': c.start_date.isoformat(),
            'end_date': c.end_date.isoformat() if c.end_date else None,
            'is_active': c.is_active
        })
    return jsonify({'success': True, 'data': data})

@bp.route('/api/contracts', methods=['POST'])
def create_contract():
    data = request.json
    contract = Contract(
        channel_id=data['channel_id'],
        contract_no=data['contract_no'],
        game_name=data['game_name'],
        guarantee_amount=Decimal(str(data['guarantee_amount'])),
        revenue_share_ratio=Decimal(str(data['revenue_share_ratio'])),
        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
        end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
        deduction_rules=data.get('deduction_rules')
    )
    db.session.add(contract)
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': contract.id}})

@bp.route('/api/game-flows', methods=['GET'])
def get_game_flows():
    settlement_month = request.args.get('settlement_month')
    channel_id = request.args.get('channel_id')
    
    query = GameFlow.query
    if settlement_month:
        query = query.filter_by(settlement_month=settlement_month)
    if channel_id:
        query = query.filter_by(channel_id=channel_id)
    
    flows = query.order_by(GameFlow.flow_date.desc()).all()
    data = []
    for f in flows:
        data.append({
            'id': f.id,
            'channel_id': f.channel_id,
            'channel_name': f.channel.name if f.channel else '',
            'contract_id': f.contract_id,
            'game_name': f.game_name,
            'flow_date': f.flow_date.isoformat(),
            'total_flow': float(f.total_flow),
            'channel_fee': float(f.channel_fee),
            'tax_amount': float(f.tax_amount),
            'net_flow': float(f.net_flow),
            'settlement_month': f.settlement_month,
            'status': f.status,
            'remark': f.remark,
            'has_corrections': len(f.corrections) > 0
        })
    return jsonify({'success': True, 'data': data})

@bp.route('/api/game-flows', methods=['POST'])
def create_game_flow():
    data = request.json
    total_flow = Decimal(str(data['total_flow']))
    channel_fee = Decimal(str(data.get('channel_fee', 0)))
    tax_amount = Decimal(str(data.get('tax_amount', 0)))
    net_flow = total_flow - channel_fee - tax_amount
    
    flow = GameFlow(
        channel_id=data['channel_id'],
        contract_id=data.get('contract_id'),
        game_name=data['game_name'],
        flow_date=datetime.strptime(data['flow_date'], '%Y-%m-%d').date(),
        total_flow=total_flow,
        channel_fee=channel_fee,
        tax_amount=tax_amount,
        net_flow=net_flow,
        settlement_month=data['settlement_month'],
        status=data.get('status', 'PENDING'),
        remark=data.get('remark')
    )
    db.session.add(flow)
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': flow.id}})

@bp.route('/api/game-flows/<int:flow_id>/corrections', methods=['GET'])
def get_flow_corrections(flow_id):
    data = service.get_flow_with_corrections(flow_id)
    if data:
        return jsonify({'success': True, 'data': data})
    return jsonify({'success': False, 'message': '流水不存在'}), 404

@bp.route('/api/game-flows/<int:flow_id>/corrections', methods=['POST'])
def create_flow_correction(flow_id):
    data = request.json
    try:
        correction = service.create_flow_correction(
            flow_id=flow_id,
            corrected_by=data['corrected_by'],
            correction_reason=data['correction_reason'],
            new_total_flow=Decimal(str(data['new_total_flow'])) if data.get('new_total_flow') else None,
            new_channel_fee=Decimal(str(data['new_channel_fee'])) if data.get('new_channel_fee') else None,
            new_tax_amount=Decimal(str(data['new_tax_amount'])) if data.get('new_tax_amount') else None,
            new_status=data.get('new_status')
        )
        return jsonify({'success': True, 'data': {'id': correction.id}})
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/api/corrections/<int:correction_id>/apply', methods=['POST'])
def apply_correction(correction_id):
    data = request.json
    try:
        correction = service.apply_flow_correction(
            correction_id=correction_id,
            operator=data['operator']
        )
        return jsonify({'success': True, 'data': {'applied': True}})
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/api/prepayments', methods=['GET'])
def get_prepayments():
    prepayments = Prepayment.query.all()
    data = []
    for p in prepayments:
        data.append({
            'id': p.id,
            'channel_id': p.channel_id,
            'channel_name': p.channel.name if p.channel else '',
            'prepayment_no': p.prepayment_no,
            'prepayment_type': p.prepayment_type,
            'amount': float(p.amount),
            'used_amount': float(p.used_amount),
            'remaining_amount': float(p.remaining_amount),
            'usage_rate': round(float(p.used_amount / p.amount * 100), 2) if p.amount > 0 else 0,
            'is_exhausted': p.is_exhausted,
            'effective_date': p.effective_date.isoformat(),
            'expiry_date': p.expiry_date.isoformat() if p.expiry_date else None
        })
    return jsonify({'success': True, 'data': data})

@bp.route('/api/prepayments', methods=['POST'])
def create_prepayment():
    data = request.json
    amount = Decimal(str(data['amount']))
    prepayment = Prepayment(
        channel_id=data['channel_id'],
        contract_id=data.get('contract_id'),
        prepayment_no=data['prepayment_no'],
        prepayment_type=data['prepayment_type'],
        amount=amount,
        used_amount=Decimal('0'),
        remaining_amount=amount,
        effective_date=datetime.strptime(data['effective_date'], '%Y-%m-%d').date(),
        expiry_date=datetime.strptime(data['expiry_date'], '%Y-%m-%d').date() if data.get('expiry_date') else None,
        remark=data.get('remark')
    )
    db.session.add(prepayment)
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': prepayment.id}})

@bp.route('/api/prepayments/<int:prepayment_id>/usage', methods=['GET'])
def get_prepayment_usage(prepayment_id):
    data = engine.calculate_prepayment_usage(prepayment_id)
    if data:
        return jsonify({'success': True, 'data': data})
    return jsonify({'success': False, 'message': '预付记录不存在'}), 404

@bp.route('/api/deductions', methods=['POST'])
def apply_deduction():
    data = request.json
    try:
        deduction = engine.apply_deduction(
            prepayment_id=data['prepayment_id'],
            game_flow_id=data['game_flow_id'],
            deduction_type=data['deduction_type'],
            amount=Decimal(str(data['amount'])),
            deduction_date=datetime.strptime(data['deduction_date'], '%Y-%m-%d').date(),
            evidence=data.get('evidence'),
            operator=data.get('operator', 'system'),
            remark=data.get('remark')
        )
        return jsonify({'success': True, 'data': {'id': deduction.id}})
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/api/anomalies', methods=['GET'])
def get_anomalies():
    anomaly_type = request.args.get('anomaly_type')
    is_resolved = request.args.get('is_resolved')
    is_resolved_bool = None
    if is_resolved is not None:
        is_resolved_bool = is_resolved.lower() == 'true'
    
    data = service.get_anomalies(anomaly_type, is_resolved_bool)
    return jsonify({'success': True, 'data': data})

@bp.route('/api/anomalies/<int:anomaly_id>', methods=['GET'])
def get_anomaly_detail(anomaly_id):
    data = service.get_dispute_details(anomaly_id)
    if data:
        return jsonify({'success': True, 'data': data})
    return jsonify({'success': False, 'message': '异常记录不存在'}), 404

@bp.route('/api/anomalies/<int:anomaly_id>/resolve', methods=['POST'])
def resolve_anomaly(anomaly_id):
    data = request.json
    try:
        anomaly = engine.reconcile_dispute_note(
            anomaly_id=anomaly_id,
            resolved_by=data['resolved_by'],
            resolution_note=data['resolution_note']
        )
        return jsonify({'success': True, 'data': {'resolved': True}})
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/api/operation-history', methods=['GET'])
def get_operation_history():
    related_type = request.args.get('related_type')
    related_id = request.args.get('related_id')
    operation_type = request.args.get('operation_type')
    limit = int(request.args.get('limit', 50))
    
    data = service.get_operation_history(related_type, related_id, operation_type, limit)
    return jsonify({'success': True, 'data': data})

@bp.route('/api/summary/monthly', methods=['GET'])
def get_monthly_summary():
    settlement_month = request.args.get('settlement_month')
    data = service.get_monthly_flow_summary(settlement_month)
    return jsonify({'success': True, 'data': data})

@bp.route('/api/check/guarantee/<int:contract_id>', methods=['GET'])
def check_guarantee(contract_id):
    data = engine.check_guarantee_exhaustion(contract_id)
    if data:
        return jsonify({'success': True, 'data': data})
    return jsonify({'success': False, 'message': '合同不存在'}), 404

@bp.route('/api/check/duplicate-deductions', methods=['GET'])
def check_duplicate_deductions():
    game_flow_id = request.args.get('game_flow_id', type=int)
    data = engine.detect_duplicate_deductions(game_flow_id)
    return jsonify({'success': True, 'data': data})

@bp.route('/api/check/contract-consistency/<int:contract_id>', methods=['GET'])
def check_contract_consistency(contract_id):
    data = engine.check_contract_flow_consistency(contract_id)
    if data:
        return jsonify({'success': True, 'data': data})
    return jsonify({'success': False, 'message': '合同不存在'}), 404

@bp.route('/api/export/monthly-report', methods=['GET'])
def export_monthly_report():
    settlement_month = request.args.get('settlement_month')
    if not settlement_month:
        return jsonify({'success': False, 'message': '请指定结算月份'}), 400
    
    filepath = service.export_monthly_report(settlement_month)
    return send_file(
        filepath,
        as_attachment=True,
        download_name=os.path.basename(filepath)
    )

@bp.route('/api/dashboard-data', methods=['GET'])
def get_dashboard_data():
    total_flow = db.session.query(db.func.sum(GameFlow.total_flow)).scalar() or 0
    total_net_flow = db.session.query(db.func.sum(GameFlow.net_flow)).scalar() or 0
    total_prepayment = db.session.query(db.func.sum(Prepayment.amount)).scalar() or 0
    total_prepayment_used = db.session.query(db.func.sum(Prepayment.used_amount)).scalar() or 0
    unresolved_anomalies = AnomalyRecord.query.filter_by(is_resolved=False).count()
    
    monthly_summary = service.get_monthly_summary()
    
    return jsonify({
        'success': True,
        'data': {
            'total_flow': float(total_flow),
            'total_net_flow': float(total_net_flow),
            'total_prepayment': float(total_prepayment),
            'total_prepayment_used': float(total_prepayment_used),
            'prepayment_usage_rate': round(float(total_prepayment_used / total_prepayment * 100), 2) if total_prepayment > 0 else 0,
            'unresolved_anomalies': unresolved_anomalies,
            'monthly_summary': monthly_summary
        }
    })
