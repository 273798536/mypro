from pathlib import Path
from typing import List
import pandas as pd

from .store import DataStore
from .models import LoanRecord, RecordStatus


def print_failed_records(records: List[LoanRecord], console) -> None:
    from rich.table import Table

    table = Table(title="失败记录清单")
    table.add_column("原始行号", justify="right", style="cyan")
    table.add_column("原始文件", style="blue")
    table.add_column("书名", style="green")
    table.add_column("借阅人")
    table.add_column("来源")
    table.add_column("问题原因", style="red")

    for record in records:
        table.add_row(
            str(record.original_row),
            record.original_file,
            record.book_title[:15],
            record.borrower_name,
            record.source.value,
            "; ".join(record.issues)[:50]
        )

    console.print(table)


def print_duplicates(duplicate_groups: List[List[LoanRecord]], console) -> None:
    from rich.table import Table

    for i, group in enumerate(duplicate_groups, 1):
        table = Table(title=f"重复记录组 #{i}")
        table.add_column("记录ID", style="cyan")
        table.add_column("原始行号", justify="right")
        table.add_column("原始文件", style="blue")
        table.add_column("来源")
        table.add_column("总费用", justify="right")

        for record in group:
            table.add_row(
                record.id[:8] + "...",
                str(record.original_row),
                record.original_file,
                record.source.value,
                f"¥{record.total_fee:.2f}"
            )

        console.print(table)


def export_data(store: DataStore, output_path: Path, fmt: str,
                include_failed: bool = False) -> int:
    output_path = Path(output_path)

    if include_failed:
        records = store.get_all_records()
    else:
        records = store.get_all_records(status=RecordStatus.CHECK_PASSED)
        fixed = store.get_all_records(status=RecordStatus.FIXED)
        recalculated = store.get_all_records(status=RecordStatus.RECALCULATED)
        merged = store.get_all_records(status=RecordStatus.MERGED)
        records = records + fixed + recalculated + merged

    record_count = len(records)

    data = []
    for record in records:
        data.append({
            '记录ID': record.id,
            '原始行号': record.original_row,
            '原始文件': record.original_file,
            '数据来源': record.source.value,
            '书名': record.book_title,
            '借阅人': record.borrower_name,
            '借阅人ID': record.borrower_id,
            '借出馆': record.library_from,
            '借入馆': record.library_to,
            '申请日期': record.apply_date.strftime('%Y-%m-%d') if record.apply_date else '',
            '收到日期': record.receive_date.strftime('%Y-%m-%d') if record.receive_date else '',
            '应还日期': record.due_date.strftime('%Y-%m-%d') if record.due_date else '',
            '归还日期': record.return_date.strftime('%Y-%m-%d') if record.return_date else '',
            '快递费': record.express_fee,
            '赔偿费': record.compensation_fee,
            '逾期费': record.overdue_fee,
            '污损费': record.damage_fee,
            '总费用': record.total_fee,
            '是否逾期': '是' if record.is_overdue else '否',
            '是否污损': '是' if record.is_damaged else '否',
            '续借次数': record.renew_count,
            '状态': record.status.value,
            '客服备注': record.customer_notes,
            '存在问题': '; '.join(record.issues),
        })

    df = pd.DataFrame(data)

    if fmt == 'xlsx':
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='有效数据', index=False)

            failed_records = store.get_all_records(status=RecordStatus.CHECK_FAILED)
            pending_records = store.get_all_records(status=RecordStatus.IMPORTED)
            all_issue_records = failed_records + pending_records
            
            if all_issue_records:
                failed_data = []
                for record in all_issue_records:
                    issue_type = '校验失败' if record.status == RecordStatus.CHECK_FAILED else '待合并'
                    failed_data.append({
                        '记录ID': record.id,
                        '原始行号': record.original_row,
                        '原始文件': record.original_file,
                        '数据来源': record.source.value,
                        '书名': record.book_title,
                        '借阅人': record.borrower_name,
                        '借阅人ID': record.borrower_id,
                        '当前状态': issue_type,
                        '问题原因': '; '.join(record.issues),
                        '客服备注': record.customer_notes,
                    })
                pd.DataFrame(failed_data).to_excel(writer, sheet_name='失败清单', index=False)

            summary = store.get_summary()
            summary_data = [
                {'项目': '总记录数', '数值': summary.total_records},
                {'项目': '有效记录', '数值': summary.valid_records},
                {'项目': '无效记录', '数值': summary.invalid_records},
                {'项目': '快递费总计', '数值': summary.total_express_fee},
                {'项目': '赔偿费总计', '数值': summary.total_compensation_fee},
                {'项目': '逾期费总计', '数值': summary.total_overdue_fee},
                {'项目': '污损费总计', '数值': summary.total_damage_fee},
                {'项目': '总费用', '数值': summary.total_fee},
            ]
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='汇总统计', index=False)
    else:
        df.to_csv(output_path, index=False, encoding='utf-8-sig')

    return record_count
