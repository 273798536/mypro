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


def check_multi_source(store: DataStore, record: LoanRecord) -> Dict[str, Any]:
    all_records = store.get_all_records()
    related = []
    true_duplicates = []

    for other in all_records:
        if other.id == record.id:
            continue
        if (other.borrower_id == record.borrower_id and
            other.book_title == record.book_title and
            other.library_from == record.library_from and
                other.library_to == record.library_to):
            if other.source == record.source:
                true_duplicates.append({
                    'id': other.id,
                    'source': other.source.value,
                    'original_row': other.original_row,
                    'original_file': other.original_file
                })
            else:
                related.append({
                    'id': other.id,
                    'source': other.source.value,
                    'original_row': other.original_row,
                    'original_file': other.original_file
                })

    has_issues = len(true_duplicates) > 0
    message_parts = []
    if true_duplicates:
        message_parts.append(f'真正重复 {len(true_duplicates)} 条')
    if related:
        message_parts.append(f'多源补传 {len(related)} 条')
    
    return {
        'passed': not has_issues,
        'message': '; '.join(message_parts) if message_parts else '无相关记录',
        'details': {
            'true_duplicates': true_duplicates,
            'multi_source': related
        }
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

        ms_result = check_multi_source(store, record)
        ms_result['record_id'] = record.id
        ms_result['check_name'] = '多源检测'
        ms_result['book_title'] = record.book_title

        store.save_check_result(
            record_id=record.id,
            check_name='多源检测',
            passed=ms_result['passed'],
            message=ms_result['message'],
            details=ms_result['details']
        )

        if ms_result['details'].get('true_duplicates'):
            record.add_issue(f"真正重复: 发现 {len(ms_result['details']['true_duplicates'])} 条同来源重复记录")
        
        if ms_result['details'].get('multi_source'):
            record.add_issue(f"多源补传: 发现 {len(ms_result['details']['multi_source'])} 条其他来源记录，建议合并")

        results.append(ms_result)

        if fix_auto:
            calculated = record.express_fee + record.compensation_fee + \
                record.overdue_fee + record.damage_fee
            if abs(calculated - record.total_fee) > 0.01:
                record.total_fee = calculated
                # 自动修复后重新检查费用校验
                fee_check_result = check_fees(record)
                if fee_check_result['passed']:
                    record.issues = [i for i in record.issues if not i.startswith('费用校验:')]

        has_fatal_issues = any('真正重复' in issue or '必填字段' in issue or '日期逻辑' in issue or '费用校验' in issue for issue in record.issues)
        has_merge_issues = any('多源补传' in issue for issue in record.issues)
        
        if has_fatal_issues:
            record.status = RecordStatus.CHECK_FAILED
        elif has_merge_issues:
            record.status = RecordStatus.IMPORTED
        else:
            record.status = RecordStatus.CHECK_PASSED

        store.update_record(record, 'system', '自动校验更新状态')

    return results
