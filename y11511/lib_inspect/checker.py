from datetime import datetime
from typing import List, Dict, Any

from .store import DataStore
from .models import LoanRecord, RecordStatus, IssueType


def check_required_fields(record: LoanRecord) -> Dict[str, Any]:
    missing = []
    if not record.book_title or record.book_title == '未知书名':
        missing.append('书名')
    if not record.borrower_name or record.borrower_name == '未知':
        missing.append('借阅人')
    if not record.borrower_id:
        missing.append('借阅人ID')
    if record.library_from == '未知馆':
        missing.append('借出馆')
    if record.library_to == '未知馆':
        missing.append('借入馆')

    return {
        'passed': len(missing) == 0,
        'message': '必填字段完整' if not missing else f'缺少字段: {", ".join(missing)}',
        'details': {'missing': missing}
    }


def check_dates(record: LoanRecord) -> Dict[str, Any]:
    issues = []

    if record.apply_date and record.due_date:
        if record.due_date < record.apply_date:
            issues.append('应还日期早于申请日期')

    if record.receive_date and record.apply_date:
        if record.receive_date < record.apply_date:
            issues.append('收到日期早于申请日期')

    if record.return_date and record.receive_date:
        if record.return_date < record.receive_date:
            issues.append('归还日期早于收到日期')

    return {
        'passed': len(issues) == 0,
        'message': '日期逻辑正常' if not issues else '; '.join(issues),
        'details': {'issues': issues}
    }


def check_overdue(record: LoanRecord) -> Dict[str, Any]:
    if not record.due_date:
        return {
            'passed': True,
            'message': '无应还日期，跳过逾期检查',
            'details': {}
        }

    today = datetime.now()
    actual_return = record.return_date or today
    is_overdue = actual_return > record.due_date

    return {
        'passed': True,
        'message': f'{"已逾期" if is_overdue else "未逾期"}',
        'details': {
            'is_overdue': is_overdue,
            'due_date': record.due_date.isoformat(),
            'check_date': today.isoformat()
        }
    }


def check_fees(record: LoanRecord) -> Dict[str, Any]:
    issues = []

    if record.express_fee < 0:
        issues.append(f'快递费为负: {record.express_fee}')
    if record.compensation_fee < 0:
        issues.append(f'赔偿费为负: {record.compensation_fee}')
    if record.overdue_fee < 0:
        issues.append(f'逾期费为负: {record.overdue_fee}')
    if record.damage_fee < 0:
        issues.append(f'污损费为负: {record.damage_fee}')

    calculated_total = record.express_fee + record.compensation_fee + \
        record.overdue_fee + record.damage_fee

    if abs(calculated_total - record.total_fee) > 0.01:
        issues.append(f'总费用不匹配: 记录={record.total_fee:.2f}, 计算={calculated_total:.2f}')

    return {
        'passed': len(issues) == 0,
        'message': '费用校验通过' if not issues else '; '.join(issues),
        'details': {
            'calculated_total': calculated_total,
            'recorded_total': record.total_fee,
            'issues': issues
        }
    }


def check_duplicates(store: DataStore, record: LoanRecord) -> Dict[str, Any]:
    all_records = store.get_all_records()
    duplicates = []

    for other in all_records:
        if other.id == record.id:
            continue
        if (other.borrower_id == record.borrower_id and
            other.book_title == record.book_title and
            other.library_from == record.library_from and
                other.library_to == record.library_to):
            duplicates.append({
                'id': other.id,
                'source': other.source.value,
                'original_row': other.original_row,
                'original_file': other.original_file
            })

    return {
        'passed': len(duplicates) == 0,
        'message': '无重复记录' if not duplicates else f'发现 {len(duplicates)} 条重复记录',
        'details': {'duplicates': duplicates}
    }


CHECK_FUNCTIONS = [
    ('必填字段', check_required_fields),
    ('日期逻辑', check_dates),
    ('逾期检测', check_overdue),
    ('费用校验', check_fees),
]


def check_records(store: DataStore, records: List[LoanRecord],
                  fix_auto: bool = False) -> List[Dict[str, Any]]:
    results = []

    for record in records:
        record.status = RecordStatus.CHECKING
        record.clear_issues()

        for check_name, check_func in CHECK_FUNCTIONS:
            result = check_func(record)
            result['record_id'] = record.id
            result['check_name'] = check_name
            result['book_title'] = record.book_title

            store.save_check_result(
                record_id=record.id,
                check_name=check_name,
                passed=result['passed'],
                message=result['message'],
                details=result['details']
            )

            if not result['passed']:
                record.add_issue(f"{check_name}: {result['message']}")

            results.append(result)

        dup_result = check_duplicates(store, record)
        dup_result['record_id'] = record.id
        dup_result['check_name'] = '重复检测'
        dup_result['book_title'] = record.book_title

        store.save_check_result(
            record_id=record.id,
            check_name='重复检测',
            passed=dup_result['passed'],
            message=dup_result['message'],
            details=dup_result['details']
        )

        if not dup_result['passed']:
            record.add_issue(f"重复检测: {dup_result['message']}")

        results.append(dup_result)

        if fix_auto:
            calculated = record.express_fee + record.compensation_fee + \
                record.overdue_fee + record.damage_fee
            if abs(calculated - record.total_fee) > 0.01:
                record.total_fee = calculated

        if record.issues:
            record.status = RecordStatus.CHECK_FAILED
        else:
            record.status = RecordStatus.CHECK_PASSED

        store.update_record(record, 'system', '自动校验更新状态')

    return results
