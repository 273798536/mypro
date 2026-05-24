from flask import request, jsonify, g
from datetime import datetime
from app.api import app, require_auth
from app.models import SlaRule


@app.route('/api/v1/sla-rules', methods=['GET'])
@require_auth()
def get_sla_rules():
    active_only = request.args.get('active_only', 'true').lower() == 'true'
    
    if active_only:
        rules = SlaRule.get_active_rules()
    else:
        rules = SlaRule.get_all()
    
    return jsonify([r.to_dict() for r in rules])

@app.route('/api/v1/sla-rules', methods=['POST'])
@require_auth(['admin'])
def create_sla_rule():
    data = request.get_json()
    
    required_fields = ['rule_code', 'rule_name', 'ticket_type', 'priority_level', 
                       'first_response_timeout', 'resolution_timeout']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    existing = SlaRule.get_by_code(data['rule_code'])
    if existing:
        return jsonify({'error': 'Rule code already exists'}), 409
    
    rule = SlaRule.create(
        rule_code=data['rule_code'],
        rule_name=data['rule_name'],
        ticket_type=data['ticket_type'],
        priority_level=data['priority_level'],
        first_response_timeout=int(data['first_response_timeout']),
        resolution_timeout=int(data['resolution_timeout']),
        escalation_timeout=data.get('escalation_timeout'),
        compensation_coefficient=float(data.get('compensation_coefficient', 1.0)),
        is_active=data.get('is_active', 1),
        created_by=g.api_key[:8],
        remark=data.get('remark')
    )
    
    return jsonify(rule.to_dict()), 201

@app.route('/api/v1/sla-rules/<int:rule_id>', methods=['GET'])
@require_auth()
def get_sla_rule(rule_id):
    rule = SlaRule.get_by_id(rule_id)
    if not rule:
        return jsonify({'error': 'SLA rule not found'}), 404
    
    return jsonify(rule.to_dict())

@app.route('/api/v1/sla-rules/<int:rule_id>', methods=['PUT'])
@require_auth(['admin'])
def update_sla_rule(rule_id):
    rule = SlaRule.get_by_id(rule_id)
    if not rule:
        return jsonify({'error': 'SLA rule not found'}), 404
    
    data = request.get_json()
    
    update_data = {}
    allowed_fields = ['rule_name', 'first_response_timeout', 'resolution_timeout',
                      'escalation_timeout', 'compensation_coefficient', 'is_active', 'remark']
    
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]
    
    update_data['updated_at'] = datetime.now().isoformat()
    
    SlaRule.update(rule_id, **update_data)
    
    return jsonify(SlaRule.get_by_id(rule_id).to_dict())

@app.route('/api/v1/sla-rules/match', methods=['POST'])
@require_auth()
def match_sla_rule():
    data = request.get_json()
    
    ticket_type = data.get('ticket_type')
    priority_level = data.get('priority_level', 'normal')
    
    if not ticket_type:
        return jsonify({'error': 'ticket_type is required'}), 400
    
    rule = SlaRule.match_rule(ticket_type, priority_level)
    
    if not rule:
        return jsonify({'error': 'No matching SLA rule found'}), 404
    
    return jsonify(rule.to_dict())
