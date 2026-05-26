from flask import request, jsonify, g
from app.api import app, require_auth
from app.models import Ticket, TicketTransferLog, SessionSummary, CompensationApproval, TemporarySupplement
from datetime import datetime


@app.route('/api/v1/tickets', methods=['GET'])
@require_auth()
def get_tickets():
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 20))
    status = request.args.get('status')
    ticket_type = request.args.get('ticket_type')
    handler = request.args.get('handler')
    
    where_clause = []
    params = []
    
    if status:
        where_clause.append("status = ?")
        params.append(status)
    if ticket_type:
        where_clause.append("ticket_type = ?")
        params.append(ticket_type)
    if handler:
        where_clause.append("current_handler = ?")
        params.append(handler)
    
    where_str = " AND ".join(where_clause) if where_clause else ""
    offset = (page - 1) * page_size
    
    tickets = Ticket.query(where_str, tuple(params), order_by="created_at DESC", limit=page_size, offset=offset)
    total = Ticket.count(where_str, tuple(params))
    
    return jsonify({
        'data': [t.to_dict() for t in tickets],
        'total': total,
        'page': page,
        'page_size': page_size
    })

@app.route('/api/v1/tickets', methods=['POST'])
@require_auth(['admin', 'operator'])
def create_ticket():
    data = request.get_json()
    
    required_fields = ['ticket_no', 'title', 'ticket_type']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    existing = Ticket.get_by_ticket_no(data['ticket_no'])
    if existing:
        return jsonify({'error': 'Ticket already exists'}), 409
    
    ticket = Ticket.create(
        ticket_no=data['ticket_no'],
        title=data['title'],
        ticket_type=data['ticket_type'],
        priority_level=data.get('priority_level', 'normal'),
        customer_id=data.get('customer_id'),
        customer_name=data.get('customer_name'),
        current_handler=data.get('current_handler'),
        status=data.get('status', 'open')
    )
    
    return jsonify(ticket.to_dict()), 201

@app.route('/api/v1/tickets/<int:ticket_id>', methods=['GET'])
@require_auth()
def get_ticket(ticket_id):
    ticket = Ticket.get_by_id(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    return jsonify(ticket.to_dict())

@app.route('/api/v1/tickets/<int:ticket_id>', methods=['PUT'])
@require_auth(['admin', 'operator'])
def update_ticket(ticket_id):
    ticket = Ticket.get_by_id(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    data = request.get_json()
    
    update_data = {}
    allowed_fields = ['title', 'ticket_type', 'priority_level', 'status', 
                      'current_handler', 'resolved_at', 'closed_at', 'first_response_at']
    
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]
    
    update_data['updated_at'] = datetime.now().isoformat()
    
    Ticket.update(ticket_id, **update_data)
    
    return jsonify(Ticket.get_by_id(ticket_id).to_dict())

@app.route('/api/v1/tickets/<int:ticket_id>/transfers', methods=['GET'])
@require_auth()
def get_ticket_transfers(ticket_id):
    transfers = TicketTransferLog.get_by_ticket_id(ticket_id)
    return jsonify([t.to_dict() for t in transfers])

@app.route('/api/v1/tickets/<int:ticket_id>/transfers', methods=['POST'])
@require_auth(['admin', 'operator'])
def transfer_ticket(ticket_id):
    ticket = Ticket.get_by_id(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    data = request.get_json()
    from_handler = data.get('from_handler', ticket.current_handler)
    to_handler = data.get('to_handler')
    reason = data.get('reason')
    
    if not to_handler:
        return jsonify({'error': 'to_handler is required'}), 400
    
    TicketTransferLog.create(
        ticket_id=ticket_id,
        from_handler=from_handler,
        to_handler=to_handler,
        transfer_reason=reason,
        operator=g.api_key[:8]
    )
    
    Ticket.update(ticket_id, current_handler=to_handler)
    
    return jsonify({'message': 'Ticket transferred successfully'})

@app.route('/api/v1/tickets/<int:ticket_id>/summary', methods=['GET'])
@require_auth()
def get_session_summary(ticket_id):
    summaries = SessionSummary.get_by_ticket_id(ticket_id)
    return jsonify([s.to_dict() for s in summaries])

@app.route('/api/v1/tickets/<int:ticket_id>/summary', methods=['POST'])
@require_auth(['admin', 'operator'])
def add_session_summary(ticket_id):
    ticket = Ticket.get_by_id(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    data = request.get_json()
    content = data.get('content')
    summary_type = data.get('type', 'manual')
    
    if not content:
        return jsonify({'error': 'content is required'}), 400
    
    existing = SessionSummary.get_latest_by_ticket_id(ticket_id)
    version = existing.version + 1 if existing else 1
    
    summary = SessionSummary.create(
        ticket_id=ticket_id,
        summary_content=content,
        summary_type=summary_type,
        key_points=data.get('key_points'),
        customer_emotion=data.get('customer_emotion'),
        created_by=g.api_key[:8],
        version=version
    )
    
    return jsonify(summary.to_dict()), 201

@app.route('/api/v1/tickets/<int:ticket_id>/compensation', methods=['GET'])
@require_auth()
def get_compensation_approvals(ticket_id):
    approvals = CompensationApproval.get_by_ticket_id(ticket_id)
    return jsonify([a.to_dict() for a in approvals])

@app.route('/api/v1/tickets/<int:ticket_id>/compensation', methods=['POST'])
@require_auth(['admin', 'operator'])
def create_compensation(ticket_id):
    ticket = Ticket.get_by_id(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    data = request.get_json()
    
    required_fields = ['compensation_type', 'requested_amount']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    existing = CompensationApproval.get_latest_by_ticket_id(ticket_id)
    version = existing.version + 1 if existing else 1
    
    approval = CompensationApproval.create(
        ticket_id=ticket_id,
        compensation_type=data['compensation_type'],
        requested_amount=float(data['requested_amount']),
        approved_amount=float(data.get('approved_amount', 0)),
        approval_status=data.get('approval_status', 'pending'),
        sla_rule_id=data.get('sla_rule_id'),
        calculation_basis=data.get('calculation_basis'),
        applicant=g.api_key[:8],
        version=version
    )
    
    return jsonify(approval.to_dict()), 201

@app.route('/api/v1/tickets/<int:ticket_id>/compensation/<int:approval_id>/approve', methods=['POST'])
@require_auth(['admin'])
def approve_compensation(ticket_id, approval_id):
    approval = CompensationApproval.get_by_id(approval_id)
    if not approval or approval.ticket_id != ticket_id:
        return jsonify({'error': 'Approval not found'}), 404
    
    data = request.get_json()
    approved_amount = float(data.get('approved_amount', approval.requested_amount))
    note = data.get('note')
    create_new_version = data.get('create_version', True)
    
    if create_new_version:
        latest = CompensationApproval.get_latest_by_ticket_id(ticket_id)
        new_version = latest.version + 1 if latest else 1
        
        new_approval = CompensationApproval.create(
            ticket_id=ticket_id,
            compensation_type=approval.compensation_type,
            requested_amount=approval.requested_amount,
            approved_amount=approved_amount,
            approval_status='approved',
            sla_rule_id=approval.sla_rule_id,
            calculation_basis=approval.calculation_basis,
            applicant=approval.applicant,
            approver=g.api_key[:8],
            approved_at=datetime.now().isoformat(),
            approval_note=note,
            version=new_version,
            is_revised=1,
            original_approval_id=approval_id,
            revision_note=data.get('revision_note', note)
        )
        
        return jsonify({
            'new_version': new_approval.to_dict(),
            'original_version': approval.to_dict(),
            'version_diff': {
                'from_version': approval.version,
                'to_version': new_version,
                'approved_amount_changed': abs(approval.approved_amount - approved_amount) > 0.01,
                'original_approved': approval.approved_amount,
                'new_approved': approved_amount,
                'amount_diff': round(abs(approval.approved_amount - approved_amount), 2)
            }
        })
    else:
        CompensationApproval.update(
            approval_id,
            approval_status='approved',
            approved_amount=approved_amount,
            approver=g.api_key[:8],
            approved_at=datetime.now().isoformat(),
            approval_note=note
        )
        
        return jsonify(CompensationApproval.get_by_id(approval_id).to_dict())

@app.route('/api/v1/tickets/<int:ticket_id>/compensation/<int:approval_id>/revise', methods=['POST'])
@require_auth(['admin'])
def revise_compensation(ticket_id, approval_id):
    approval = CompensationApproval.get_by_id(approval_id)
    if not approval or approval.ticket_id != ticket_id:
        return jsonify({'error': 'Approval not found'}), 404
    
    data = request.get_json()
    
    if 'approved_amount' not in data:
        return jsonify({'error': 'approved_amount is required for revision'}), 400
    
    new_approved_amount = float(data['approved_amount'])
    revision_note = data.get('revision_note', '')
    calculation_basis = data.get('calculation_basis', approval.calculation_basis)
    
    latest = CompensationApproval.get_latest_by_ticket_id(ticket_id)
    new_version = latest.version + 1 if latest else 1
    
    new_approval = CompensationApproval.create(
        ticket_id=ticket_id,
        compensation_type=approval.compensation_type,
        requested_amount=approval.requested_amount,
        approved_amount=new_approved_amount,
        approval_status='revised',
        sla_rule_id=approval.sla_rule_id,
        calculation_basis=calculation_basis,
        applicant=approval.applicant,
        approver=g.api_key[:8],
        approved_at=datetime.now().isoformat(),
        approval_note=data.get('approval_note', ''),
        version=new_version,
        is_revised=1,
        original_approval_id=approval_id,
        revision_note=revision_note
    )
    
    return jsonify({
        'success': True,
        'message': 'Compensation revised, original evidence preserved',
        'new_version': new_approval.to_dict(),
        'original_version': approval.to_dict(),
        'revision_chain': {
            'from_id': approval_id,
            'to_id': new_approval.id,
            'from_version': approval.version,
            'to_version': new_version,
            'original_approved': approval.approved_amount,
            'revised_approved': new_approved_amount,
            'amount_change': round(new_approved_amount - approval.approved_amount, 2),
            'revision_note': revision_note
        }
    })

@app.route('/api/v1/tickets/<int:ticket_id>/supplements', methods=['GET'])
@require_auth()
def get_temporary_supplements(ticket_id):
    supplements = TemporarySupplement.get_by_ticket_id(ticket_id)
    return jsonify([s.to_dict() for s in supplements])

@app.route('/api/v1/tickets/<int:ticket_id>/supplements', methods=['POST'])
@require_auth(['admin', 'operator'])
def add_temporary_supplement(ticket_id):
    ticket = Ticket.get_by_id(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    
    data = request.get_json()
    
    required_fields = ['supplement_type', 'supplement_content']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    supplement = TemporarySupplement.create(
        ticket_id=ticket_id,
        supplement_type=data['supplement_type'],
        supplement_content=data['supplement_content'],
        supplement_reason=data.get('supplement_reason'),
        operator=g.api_key[:8],
        remark=data.get('remark')
    )
    
    return jsonify(supplement.to_dict()), 201
