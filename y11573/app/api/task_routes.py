from flask import request, jsonify, g
from app.api import app, require_auth
from app.models import AsyncTask


@app.route('/api/v1/tasks', methods=['GET'])
@require_auth()
def get_tasks():
    status = request.args.get('status')
    limit = int(request.args.get('limit', 50))
    
    if status:
        tasks = AsyncTask.query(
            "task_status = ?",
            (status,),
            order_by="created_at DESC",
            limit=limit
        )
    else:
        tasks = AsyncTask.get_all(limit=limit)
    
    return jsonify([t.to_dict() for t in tasks])

@app.route('/api/v1/tasks/<int:task_id>', methods=['GET'])
@require_auth()
def get_task(task_id):
    task = AsyncTask.get_by_id(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    return jsonify(task.to_dict())

@app.route('/api/v1/tasks/<int:task_id>/retry', methods=['POST'])
@require_auth(['admin'])
def retry_task(task_id):
    task = AsyncTask.get_by_id(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    if task.task_status not in ['waiting_retry', 'waiting_manual', 'failed_permanent']:
        return jsonify({'error': 'Task cannot be retried in current status'}), 400
    
    from app.models.task_models import TASK_STATUS_PENDING
    
    AsyncTask.update(
        task_id,
        task_status=TASK_STATUS_PENDING,
        retry_count=0,
        next_retry_at=None,
        last_error=None
    )
    
    return jsonify({'message': 'Task queued for retry'})

@app.route('/api/v1/tasks/<int:task_id>/manual', methods=['POST'])
@require_auth(['admin'])
def mark_task_manual(task_id):
    task = AsyncTask.get_by_id(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    data = request.get_json()
    assignee = data.get('assignee', g.api_key[:8])
    error_msg = data.get('reason', 'Marked for manual processing')
    
    task.mark_waiting_manual(error_msg, assignee=assignee)
    
    return jsonify({'message': 'Task marked for manual processing'})

@app.route('/api/v1/tasks/<int:task_id>/cancel', methods=['POST'])
@require_auth(['admin'])
def cancel_task(task_id):
    task = AsyncTask.get_by_id(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    task.mark_failed_permanent('Cancelled by admin')
    
    return jsonify({'message': 'Task cancelled'})

@app.route('/api/v1/tasks/stats', methods=['GET'])
@require_auth()
def get_task_stats():
    stats = {
        'pending': AsyncTask.count("task_status = 'pending'"),
        'running': AsyncTask.count("task_status = 'running'"),
        'waiting_retry': AsyncTask.count("task_status = 'waiting_retry'"),
        'waiting_manual': AsyncTask.count("task_status = 'waiting_manual'"),
        'success': AsyncTask.count("task_status = 'success'"),
        'failed_permanent': AsyncTask.count("task_status = 'failed_permanent'"),
    }
    
    return jsonify(stats)
