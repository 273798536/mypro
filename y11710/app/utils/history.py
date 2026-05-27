import os
import json
import uuid
import datetime
from config import HISTORY_FILE


def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_history(history):
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def add_record(student_id, data_source, results, corrections=None):
    history = load_history()
    
    record_id = str(uuid.uuid4())[:8]
    timestamp = datetime.datetime.now().isoformat()
    
    record = {
        'id': record_id,
        'timestamp': timestamp,
        'student_id': student_id,
        'data_source': data_source,
        'results': results,
        'corrections': corrections or [],
        'status': 'processed'
    }
    
    history.append(record)
    save_history(history)
    
    return record_id


def add_correction(record_id, correction_type, old_value, new_value, reason):
    history = load_history()
    
    for record in history:
        if record['id'] == record_id:
            correction = {
                'timestamp': datetime.datetime.now().isoformat(),
                'type': correction_type,
                'old_value': old_value,
                'new_value': new_value,
                'reason': reason
            }
            record['corrections'].append(correction)
            save_history(history)
            return True
    
    return False


def get_record(record_id):
    history = load_history()
    for record in history:
        if record['id'] == record_id:
            return record
    return None


def get_student_records(student_id):
    history = load_history()
    return [r for r in history if r['student_id'] == student_id]


def get_all_records():
    return load_history()
