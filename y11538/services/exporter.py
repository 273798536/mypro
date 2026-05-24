import os
import pandas as pd
from datetime import datetime
from config import EXPORT_DIR
from models.database import get_session
from models.tables import Registration, SignRecord, Homework, Refund, DirtyRecord

def export_to_excel(batch_id: str) -> str:
    session = get_session()
    try:
        registrations = session.query(Registration).filter_by(batch_id=batch_id).all()
        signs = session.query(SignRecord).filter_by(batch_id=batch_id).all()
        homeworks = session.query(Homework).filter_by(batch_id=batch_id).all()
        refunds = session.query(Refund).filter_by(batch_id=batch_id).all()
        dirty_records = session.query(DirtyRecord).filter_by(batch_id=batch_id).all()
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'training_recon_{batch_id}_{timestamp}.xlsx'
        filepath = os.path.join(EXPORT_DIR, filename)
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            reg_data = [{
                '员工ID': r.employee_id,
                '员工姓名': r.employee_name,
                '部门': r.department,
                '培训课程': r.training_course,
                '培训日期': r.training_date,
                '报名时间': r.registration_time.strftime('%Y-%m-%d %H:%M:%S') if r.registration_time else '',
                '金额': r.amount,
                '状态': r.status
            } for r in registrations]
            if reg_data:
                pd.DataFrame(reg_data).to_excel(writer, sheet_name='报名表', index=False)
            
            sign_data = [{
                '签到ID': s.sign_id,
                '员工ID': s.employee_id,
                '员工姓名': s.employee_name,
                '培训课程': s.training_course,
                '签到时间': s.sign_time.strftime('%Y-%m-%d %H:%M:%S') if s.sign_time else '',
                '签到类型': s.sign_type,
                '是否代签': '是' if s.is_proxy else '否',
                '是否补签': '是' if s.is_makeup else '否'
            } for s in signs]
            if sign_data:
                pd.DataFrame(sign_data).to_excel(writer, sheet_name='签到记录', index=False)
            
            hw_data = [{
                '作业ID': h.homework_id,
                '员工ID': h.employee_id,
                '员工姓名': h.employee_name,
                '培训课程': h.training_course,
                '提交时间': h.submit_time.strftime('%Y-%m-%d %H:%M:%S') if h.submit_time else '',
                '分数': h.score,
                '状态': h.status
            } for h in homeworks]
            if hw_data:
                pd.DataFrame(hw_data).to_excel(writer, sheet_name='课后作业', index=False)
            
            refund_data = [{
                '退款ID': r.refund_id,
                '员工ID': r.employee_id,
                '员工姓名': r.employee_name,
                '培训课程': r.training_course,
                '退款金额': r.refund_amount,
                '退款时间': r.refund_time.strftime('%Y-%m-%d %H:%M:%S') if r.refund_time else '',
                '退款原因': r.refund_reason
            } for r in refunds]
            if refund_data:
                pd.DataFrame(refund_data).to_excel(writer, sheet_name='退款流水', index=False)
            
            dirty_data = [{
                '数据类型': d.data_type,
                '脏数据类型': d.dirty_type,
                '错误信息': d.error_message,
                '原始数据': str(d.raw_data),
                '处理建议': d.suggestion,
                '是否已修复': '是' if d.is_fixed else '否'
            } for d in dirty_records]
            if dirty_data:
                pd.DataFrame(dirty_data).to_excel(writer, sheet_name='脏记录', index=False)
            
            recon_data = generate_reconciliation_sheet(registrations, signs, homeworks, refunds)
            if recon_data:
                pd.DataFrame(recon_data).to_excel(writer, sheet_name='对账汇总', index=False)
        
        return filename
    finally:
        session.close()

def generate_reconciliation_sheet(registrations, signs, homeworks, refunds):
    sign_map = {}
    for s in signs:
        if s.employee_id:
            if s.employee_id not in sign_map:
                sign_map[s.employee_id] = []
            sign_map[s.employee_id].append(s)
    
    hw_map = {h.employee_id: h for h in homeworks if h.employee_id}
    refund_map = {r.employee_id: r for r in refunds if r.employee_id}
    
    result = []
    for reg in registrations:
        emp_signs = sign_map.get(reg.employee_id, [])
        hw = hw_map.get(reg.employee_id)
        refund = refund_map.get(reg.employee_id)
        
        result.append({
            '员工ID': reg.employee_id,
            '员工姓名': reg.employee_name,
            '部门': reg.department,
            '培训课程': reg.training_course,
            '报名状态': '已报名',
            '签到状态': '已签到' if emp_signs else '未签到',
            '签到次数': len(emp_signs),
            '是否代签': '是' if any(s.is_proxy for s in emp_signs) else '否',
            '是否补签': '是' if any(s.is_makeup for s in emp_signs) else '否',
            '作业状态': '已提交' if hw and hw.status == 'submitted' else '未提交',
            '作业分数': hw.score if hw else '',
            '是否退款': '是' if refund else '否',
            '退款金额': refund.refund_amount if refund else 0
        })
    
    return result
