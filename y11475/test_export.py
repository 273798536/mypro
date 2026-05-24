from export_service import export_to_excel
from schemas import ExportSummary
from datetime import datetime

summary = ExportSummary(
    batch_id='TEST',
    batch_name='测试批次',
    export_time=datetime.now(),
    exported_by='测试员',
    state_before_freeze=None,
    state_after_freeze=None,
    total_records=1,
    approved_count=1,
    rejected_count=0,
    pending_count=0,
    manual_override_count=0,
    total_cost=100,
    recovered_cost=0,
    records=[{
        'record_id': 'R1',
        'state': 'approved',
        'source': 'calendar',
        'room_code': 'MR001',
        'room_name': '会议室1',
        'appointment_id': '',
        'appointment_subject': '',
        'appointment_date': '2025-01-01',
        'booker': '',
        'booker_dept': '',
        'has_access_record': True,
        'access_person': '',
        'has_cancel_message': False,
        'cancel_operator': '',
        'estimated_cost': 100,
        'actual_cost': 100,
        'cost_recovery_status': '',
        'manual_override': False,
        'override_reason': '',
        'override_by': '',
        'override_time': '',
        'final_result': '',
        'final_remark': '',
        'state_history': [],
        'original_evidences': []
    }]
)
result = export_to_excel(summary)
print(f'Size: {len(result)} bytes')
with open('test_export.xlsx', 'wb') as f:
    f.write(result)
print('Saved to test_export.xlsx')
