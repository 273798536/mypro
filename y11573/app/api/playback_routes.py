from flask import request, jsonify, g
from app.api import app, require_auth
from app.services.playback_service import PlaybackService
from app.models import PlaybackException, AsyncTask


@app.route('/api/v1/playback/<int:ticket_id>', methods=['POST'])
@require_auth(['admin', 'operator'])
def playback_ticket(ticket_id):
    service = PlaybackService()
    
    try:
        result = service.playback_ticket(ticket_id)
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/playback/batch', methods=['POST'])
@require_auth(['admin', 'operator'])
def batch_playback():
    data = request.get_json()
    ticket_ids = data.get('ticket_ids', [])
    
    if not ticket_ids:
        return jsonify({'error': 'ticket_ids is required'}), 400
    
    service = PlaybackService()
    result = service.batch_playback(ticket_ids, operator=g.api_key[:8])
    
    return jsonify(result)

@app.route('/api/v1/exceptions', methods=['GET'])
@require_auth()
def get_exceptions():
    status = request.args.get('status', 'open')
    ticket_id = request.args.get('ticket_id')
    
    service = PlaybackService()
    
    if ticket_id:
        exceptions = service.get_playback_exceptions(ticket_id=int(ticket_id))
    else:
        exceptions = PlaybackException.query(
            "resolution_status = ?",
            (status,),
            order_by="detected_at DESC",
            limit=100
        )
        exceptions = [e.to_dict() for e in exceptions]
    
    return jsonify(exceptions)

@app.route('/api/v1/exceptions/<int:exception_id>/resolve', methods=['POST'])
@require_auth(['admin', 'operator'])
def resolve_exception(exception_id):
    exception = PlaybackException.get_by_id(exception_id)
    if not exception:
        return jsonify({'error': 'Exception not found'}), 404
    
    data = request.get_json()
    note = data.get('note', 'Resolved manually')
    
    exception.resolve(note, resolved_by=g.api_key[:8])
    
    return jsonify({'message': 'Exception resolved successfully'})

@app.route('/api/v1/exceptions/<int:exception_id>/assign', methods=['POST'])
@require_auth(['admin'])
def assign_exception(exception_id):
    exception = PlaybackException.get_by_id(exception_id)
    if not exception:
        return jsonify({'error': 'Exception not found'}), 404
    
    data = request.get_json()
    assignee = data.get('assignee')
    
    if not assignee:
        return jsonify({'error': 'assignee is required'}), 400
    
    exception.assign(assignee)
    
    return jsonify({'message': 'Exception assigned successfully'})
