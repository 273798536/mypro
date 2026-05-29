from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from datetime import date, datetime
import io

from data_store import DataStore
from verifier import AttendanceVerifier
from version_compare import VersionComparator
from exporter import DataExporter
from models import VerificationStatus, DisputeType, AttendanceRecord, AcceptanceRecord, Staff, RateSnapshot

app = Flask(__name__)

data_store = DataStore()
verifier = AttendanceVerifier(data_store)
comparator = VersionComparator(data_store)
exporter = DataExporter(data_store)


@app.route('/')
def index():
    latest_result = data_store.get_latest_result()
    version_history = comparator.get_version_history(10)
    
    stats = {}
    if latest_result:
        stats = {
            'total_days': latest_result.total_days,
            'total_amount': latest_result.total_amount,
            'duplicate_days': latest_result.duplicate_days,
            'duplicate_amount': latest_result.duplicate_amount,
            'dispute_count': len(latest_result.disputes),
            'error_count': sum(1 for d in latest_result.disputes if d.status == VerificationStatus.ERROR),
            'warning_count': sum(1 for d in latest_result.disputes if d.status == VerificationStatus.WARNING),
            'pending_count': sum(1 for d in latest_result.disputes if d.status == VerificationStatus.PENDING)
        }
    
    return render_template('index.html', 
                         latest_result=latest_result,
                         version_history=version_history,
                         stats=stats,
                         DisputeType=DisputeType,
                         VerificationStatus=VerificationStatus)


@app.route('/verify', methods=['POST'])
def run_verification():
    data = request.get_json()
    start_date = date.fromisoformat(data.get('start_date'))
    end_date = date.fromisoformat(data.get('end_date'))
    operator = data.get('operator', 'system')
    
    result = verifier.verify_period(start_date, end_date, operator)
    data_store.add_verification_result(result)
    
    return jsonify({
        'success': True,
        'result_id': result.result_id,
        'version': result.version
    })


@app.route('/result/<result_id>')
def view_result(result_id):
    result = data_store.verification_results.get(result_id)
    if not result:
        return "结果不存在", 404
    
    prev_result = data_store.get_previous_result(result_id)
    diff = None
    if prev_result:
        diff = comparator.compare_results(prev_result, result)
    
    attendance_details = []
    for aid in result.attendance_ids:
        record = data_store.attendance.get(aid)
        if record:
            staff = data_store.staff.get(record.staff_id)
            attendance_details.append({
                'record': record,
                'staff_name': staff.name if staff else record.staff_id
            })
    
    return render_template('result.html',
                         result=result,
                         prev_result=prev_result,
                         diff=diff,
                         attendance_details=attendance_details,
                         DisputeType=DisputeType,
                         VerificationStatus=VerificationStatus)


@app.route('/compare/<old_id>/<new_id>')
def compare_results(old_id, new_id):
    old_result = data_store.verification_results.get(old_id)
    new_result = data_store.verification_results.get(new_id)
    
    if not old_result or not new_result:
        return "结果不存在", 404
    
    diff = comparator.compare_results(old_result, new_result)
    summary = comparator.generate_change_summary(diff)
    
    return render_template('compare.html',
                         diff=diff,
                         summary=summary,
                         old_result=old_result,
                         new_result=new_result,
                         DisputeType=DisputeType,
                         VerificationStatus=VerificationStatus)


@app.route('/export/excel/<result_id>')
def export_excel(result_id):
    result = data_store.verification_results.get(result_id)
    if not result:
        return "结果不存在", 404
    
    excel_data = exporter.export_to_excel(result)
    
    return send_file(
        io.BytesIO(excel_data),
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'verification_v{result.version}.xlsx'
    )


@app.route('/export/diff/<old_id>/<new_id>')
def export_diff(old_id, new_id):
    old_result = data_store.verification_results.get(old_id)
    new_result = data_store.verification_results.get(new_id)
    
    if not old_result or not new_result:
        return "结果不存在", 404
    
    diff = comparator.compare_results(old_result, new_result)
    excel_data = exporter.export_version_diff(diff)
    
    return send_file(
        io.BytesIO(excel_data),
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'diff_v{old_result.version}_v{new_result.version}.xlsx'
    )


@app.route('/api/attendance', methods=['POST'])
def add_attendance():
    data = request.get_json()
    
    record = AttendanceRecord(
        attendance_id=data.get('attendance_id', ''),
        staff_id=data['staff_id'],
        work_date=date.fromisoformat(data['work_date']),
        hours=float(data.get('hours', 8.0)),
        project_code=data.get('project_code', ''),
        project_name=data.get('project_name', ''),
        remark=data.get('remark', ''),
        is_approved=data.get('is_approved', False),
        source=data.get('source', '')
    )
    
    record_id = data_store.add_attendance(record)
    return jsonify({'success': True, 'attendance_id': record_id})


@app.route('/api/attendance/<attendance_id>', methods=['PUT'])
def update_attendance(attendance_id):
    data = request.get_json()
    record = data_store.attendance.get(attendance_id)
    
    if not record:
        return jsonify({'success': False, 'error': '记录不存在'}), 404
    
    if 'hours' in data:
        record.hours = float(data['hours'])
    if 'project_code' in data:
        record.project_code = data['project_code']
    if 'remark' in data:
        record.remark = data['remark']
    if 'is_approved' in data:
        record.is_approved = data['is_approved']
    
    record.updated_at = datetime.now()
    data_store.save_all()
    
    return jsonify({'success': True})


@app.route('/api/acceptance', methods=['POST'])
def add_acceptance():
    data = request.get_json()
    
    record = AcceptanceRecord(
        acceptance_id=data.get('acceptance_id', ''),
        staff_id=data['staff_id'],
        work_date=date.fromisoformat(data['work_date']),
        accepted_days=float(data.get('accepted_days', 1.0)),
        project_code=data.get('project_code', ''),
        acceptance_note=data.get('acceptance_note', ''),
        accepted_by=data.get('accepted_by', ''),
        accepted_at=datetime.now() if data.get('is_accepted') else None
    )
    
    record_id = data_store.add_acceptance(record)
    return jsonify({'success': True, 'acceptance_id': record_id})


@app.route('/api/staff', methods=['GET', 'POST'])
def manage_staff():
    if request.method == 'POST':
        data = request.get_json()
        staff = Staff(
            staff_id=data.get('staff_id', ''),
            name=data['name'],
            role=data.get('role', ''),
            department=data.get('department', ''),
            remark=data.get('remark', '')
        )
        staff_id = data_store.add_staff(staff)
        return jsonify({'success': True, 'staff_id': staff_id})
    
    return jsonify([{
        'staff_id': s.staff_id,
        'name': s.name,
        'role': s.role,
        'department': s.department
    } for s in data_store.staff.values()])


@app.route('/api/rate', methods=['POST'])
def add_rate():
    data = request.get_json()
    
    rate = RateSnapshot(
        rate_id=data.get('rate_id', ''),
        staff_id=data['staff_id'],
        daily_rate=float(data['daily_rate']),
        effective_date=date.fromisoformat(data['effective_date']),
        end_date=date.fromisoformat(data['end_date']) if data.get('end_date') else None,
        version=int(data.get('version', 1))
    )
    
    rate_id = data_store.add_rate(rate)
    return jsonify({'success': True, 'rate_id': rate_id})


@app.route('/api/dispute/<dispute_id>/resolve', methods=['POST'])
def resolve_dispute(dispute_id):
    data = request.get_json()
    
    for result in data_store.verification_results.values():
        for dispute in result.disputes:
            if dispute.dispute_id == dispute_id:
                dispute.resolved = True
                dispute.resolved_at = datetime.now()
                dispute.resolved_by = data.get('resolved_by', 'system')
                dispute.status = VerificationStatus.PASS
                data_store.save_all()
                return jsonify({'success': True})
    
    return jsonify({'success': False, 'error': '争议不存在'}), 404


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
