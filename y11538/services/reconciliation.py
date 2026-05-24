from datetime import datetime
from collections import defaultdict
from models.database import get_session
from models.tables import (
    Registration, SignRecord, Homework, Refund,
    DirtyRecord, ReconciliationResult
)
from services.data_processor import detect_name_change, detect_cross_date

def run_reconciliation(batch_id: str) -> dict:
    session = get_session()
    try:
        registrations = session.query(Registration).filter_by(batch_id=batch_id).all()
        signs = session.query(SignRecord).filter_by(batch_id=batch_id).all()
        homeworks = session.query(Homework).filter_by(batch_id=batch_id).all()
        refunds = session.query(Refund).filter_by(batch_id=batch_id).all()
        dirty_records = session.query(DirtyRecord).filter_by(batch_id=batch_id).all()
        
        reg_map = {r.employee_id: r for r in registrations}
        sign_map = defaultdict(list)
        for s in signs:
            if s.employee_id:
                sign_map[s.employee_id].append(s)
        
        hw_map = {h.employee_id: h for h in homeworks if h.employee_id}
        refund_map = {r.employee_id: r for r in refunds if r.employee_id}
        
        signed_count = 0
        unsigned_count = 0
        proxy_sign_count = 0
        makeup_sign_count = 0
        homework_completed = 0
        details = []
        
        for emp_id, reg in reg_map.items():
            emp_signs = sign_map.get(emp_id, [])
            has_sign = len(emp_signs) > 0
            is_proxy = any(s.is_proxy for s in emp_signs)
            is_makeup = any(s.is_makeup for s in emp_signs)
            
            hw = hw_map.get(emp_id)
            has_hw = hw is not None and hw.status == 'submitted'
            
            refund = refund_map.get(emp_id)
            
            if has_sign:
                signed_count += 1
                if is_proxy:
                    proxy_sign_count += 1
                if is_makeup:
                    makeup_sign_count += 1
            else:
                unsigned_count += 1
            
            if has_hw:
                homework_completed += 1
            
            details.append({
                'employee_id': emp_id,
                'employee_name': reg.employee_name,
                'department': reg.department,
                'training_course': reg.training_course,
                'registered': True,
                'signed': has_sign,
                'sign_count': len(emp_signs),
                'is_proxy': is_proxy,
                'is_makeup': is_makeup,
                'homework_submitted': has_hw,
                'homework_score': hw.score if hw else None,
                'refunded': refund is not None,
                'refund_amount': refund.refund_amount if refund else 0,
                'sign_times': [s.sign_time.strftime('%Y-%m-%d %H:%M:%S') 
                              for s in emp_signs if s.sign_time]
            })
        
        unfixed_dirty = [d for d in dirty_records if not d.is_fixed]
        
        result = {
            'batch_id': batch_id,
            'total_registrations': len(registrations),
            'total_signs': len(signs),
            'total_homeworks': len(homeworks),
            'total_refunds': len(refunds),
            'signed_count': signed_count,
            'unsigned_count': unsigned_count,
            'proxy_sign_count': proxy_sign_count,
            'makeup_sign_count': makeup_sign_count,
            'homework_completed': homework_completed,
            'refund_count': len(refunds),
            'refund_amount': sum(r.refund_amount for r in refunds),
            'dirty_count': len(dirty_records),
            'unfixed_dirty_count': len(unfixed_dirty),
            'details': details,
            'report_generated_at': datetime.now().isoformat()
        }
        
        save_reconciliation_result(session, result)
        return result
    finally:
        session.close()

def save_reconciliation_result(session, result: dict):
    existing = session.query(ReconciliationResult).filter_by(
        batch_id=result['batch_id']
    ).first()
    
    if existing:
        existing.total_registrations = result['total_registrations']
        existing.total_signs = result['total_signs']
        existing.total_homeworks = result['total_homeworks']
        existing.total_refunds = result['total_refunds']
        existing.signed_count = result['signed_count']
        existing.unsigned_count = result['unsigned_count']
        existing.proxy_sign_count = result['proxy_sign_count']
        existing.makeup_sign_count = result['makeup_sign_count']
        existing.homework_completed = result['homework_completed']
        existing.refund_count = result['refund_count']
        existing.refund_amount = result['refund_amount']
        existing.dirty_count = result['dirty_count']
        existing.unfixed_dirty_count = result['unfixed_dirty_count']
        existing.details = result['details']
        existing.report_generated_at = datetime.now()
    else:
        recon = ReconciliationResult(
            batch_id=result['batch_id'],
            total_registrations=result['total_registrations'],
            total_signs=result['total_signs'],
            total_homeworks=result['total_homeworks'],
            total_refunds=result['total_refunds'],
            signed_count=result['signed_count'],
            unsigned_count=result['unsigned_count'],
            proxy_sign_count=result['proxy_sign_count'],
            makeup_sign_count=result['makeup_sign_count'],
            homework_completed=result['homework_completed'],
            refund_count=result['refund_count'],
            refund_amount=result['refund_amount'],
            dirty_count=result['dirty_count'],
            unfixed_dirty_count=result['unfixed_dirty_count'],
            details=result['details'],
            report_generated_at=datetime.now()
        )
        session.add(recon)
    
    session.commit()

def get_reconciliation_result(batch_id: str) -> dict:
    session = get_session()
    try:
        result = session.query(ReconciliationResult).filter_by(
            batch_id=batch_id
        ).first()
        if not result:
            return None
        return {
            'batch_id': result.batch_id,
            'total_registrations': result.total_registrations,
            'total_signs': result.total_signs,
            'total_homeworks': result.total_homeworks,
            'total_refunds': result.total_refunds,
            'signed_count': result.signed_count,
            'unsigned_count': result.unsigned_count,
            'proxy_sign_count': result.proxy_sign_count,
            'makeup_sign_count': result.makeup_sign_count,
            'homework_completed': result.homework_completed,
            'refund_count': result.refund_count,
            'refund_amount': result.refund_amount,
            'dirty_count': result.dirty_count,
            'unfixed_dirty_count': result.unfixed_dirty_count,
            'details': result.details,
            'report_generated_at': result.report_generated_at.isoformat() if result.report_generated_at else None
        }
    finally:
        session.close()

def analyze_anomalies(batch_id: str) -> dict:
    session = get_session()
    try:
        signs = session.query(SignRecord).filter_by(batch_id=batch_id).all()
        registrations = session.query(Registration).filter_by(batch_id=batch_id).all()
        reg_map = {r.employee_id: r for r in registrations}
        
        anomalies = []
        
        sign_count_by_emp = defaultdict(int)
        for s in signs:
            if s.employee_id:
                sign_count_by_emp[s.employee_id] += 1
        
        for emp_id, count in sign_count_by_emp.items():
            if count > 1:
                reg = reg_map.get(emp_id)
                anomalies.append({
                    'type': 'MULTIPLE_SIGNS',
                    'employee_id': emp_id,
                    'employee_name': reg.employee_name if reg else '未知',
                    'message': f'重复签到 {count} 次，可能存在代签到',
                    'severity': 'high'
                })
        
        for s in signs:
            if not s.employee_id:
                anomalies.append({
                    'type': 'NO_EMPLOYEE_ID',
                    'sign_id': s.sign_id,
                    'message': '签到记录缺少员工ID，无法匹配报名信息',
                    'severity': 'medium'
                })
            
            if s.employee_id and s.employee_id in reg_map:
                reg = reg_map[s.employee_id]
                if s.employee_name and reg.employee_name != s.employee_name:
                    anomalies.append({
                        'type': 'NAME_MISMATCH',
                        'employee_id': s.employee_id,
                        'registered_name': reg.employee_name,
                        'sign_name': s.employee_name,
                        'message': f'签到姓名与报名姓名不一致: {reg.employee_name} vs {s.employee_name}',
                        'severity': 'medium'
                    })
        
        for emp_id, reg in reg_map.items():
            if emp_id not in sign_count_by_emp:
                anomalies.append({
                    'type': 'NO_SIGN',
                    'employee_id': emp_id,
                    'employee_name': reg.employee_name,
                    'message': '已报名但未签到',
                    'severity': 'low'
                })
        
        return {
            'batch_id': batch_id,
            'anomaly_count': len(anomalies),
            'anomalies': anomalies
        }
    finally:
        session.close()
