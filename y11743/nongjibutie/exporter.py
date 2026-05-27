import csv
import io
import json
import os
from datetime import datetime
from typing import List, Dict, Optional
from .models import Database
from .service import SubsidyService


class Exporter:
    def __init__(self, db: Database):
        self.db = db
        self.service = SubsidyService(db)

    def _to_csv(self, rows: List[Dict], fieldnames: List[str]) -> str:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
        return output.getvalue()

    def _to_json(self, data) -> str:
        return json.dumps(data, ensure_ascii=False, indent=2, default=str)

    def _write_file(self, content: str, file_path: str):
        os.makedirs(os.path.dirname(file_path) or '.', exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return file_path

    def export_batch(self, batch_id: int, output_dir: str = '.', fmt: str = 'csv') -> Dict[str, str]:
        summary = self.service.get_batch_summary(batch_id)
        records = self.db.query(
            'SELECT dr.*, f.farmer_name, f.id_card, f.village, inv.invoice_number, inv.invoice_date, inv.machine_model, inv.machine_name, inv.amount as invoice_amount FROM disbursement_records dr LEFT JOIN farmer_profiles f ON dr.farmer_id = f.id LEFT JOIN purchase_invoices inv ON dr.invoice_id = inv.id WHERE dr.batch_id = ? ORDER BY dr.id',
            (batch_id,)
        )
        record_rows = []
        for rec in records:
            r = dict(rec)
            r['issue_detail'] = self._get_issue_text(batch_id, rec['invoice_id'], rec['farmer_id'])
            record_rows.append(r)
        issues = self.service.list_issues(batch_id=batch_id, status='open')
        corrections = self.service.get_correction_history()

        batch_name = summary['batch_name']
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        files = {}

        overview = self._build_overview(summary)
        overview_fields = list(overview.keys())
        files['overview'] = self._export_item(f'{batch_name}_概览_{timestamp}', overview, [overview], output_dir, fmt, overview_fields)

        record_fields = ['id', 'farmer_name', 'id_card', 'village', 'invoice_number', 'invoice_date', 'machine_model', 'machine_name', 'invoice_amount', 'subsidy_amount', 'status', 'issue_flags', 'issue_detail', 'remark', 'source_file']
        files['records'] = self._export_item(f'{batch_name}_兑付明细_{timestamp}', record_rows, record_rows, output_dir, fmt, record_fields)

        issue_fields = ['id', 'issue_type', 'issue_detail', 'severity', 'farmer_name', 'invoice_number', 'created_at']
        files['issues'] = self._export_item(f'{batch_name}_问题清单_{timestamp}', issues, issues, output_dir, fmt, issue_fields)

        correction_fields = ['id', 'table_name', 'record_id', 'field_name', 'old_value', 'new_value', 'corrected_by', 'corrected_at', 'reason']
        files['corrections'] = self._export_item(f'{batch_name}_修正痕迹_{timestamp}', corrections, corrections, output_dir, fmt, correction_fields)

        return files

    def _build_overview(self, summary: Dict) -> Dict:
        return {
            '批次名称': summary['batch_name'],
            '批次日期': summary['batch_date'],
            '批次状态': summary['status'],
            '记录总数': summary['total_records'],
            '待审核': summary['records_by_status'].get('pending', 0),
            '已通过': summary['records_by_status'].get('approved', 0),
            '已兑付': summary['records_by_status'].get('paid', 0),
            '已驳回': summary['records_by_status'].get('rejected', 0),
            '合计金额': summary['total_amount'],
            '已付金额': summary['paid_amount'],
            '标记问题记录': summary['flagged_records'],
            '未解决问题': summary['open_issues']
        }

    def _get_issue_text(self, batch_id: int, invoice_id: int, farmer_id: int) -> str:
        issues = self.db.query(
            'SELECT issue_type, issue_detail, severity FROM issues WHERE batch_id = ? AND (invoice_id = ? OR farmer_id = ?) AND status = ?',
            (batch_id, invoice_id, farmer_id, 'open')
        )
        if not issues:
            return ''
        return '; '.join([f'[{i["severity"]}] {i["issue_type"]}: {i["issue_detail"]}' for i in issues])

    def _export_item(self, name: str, data, rows, output_dir: str, fmt: str, fields: List[str]) -> str:
        if fmt == 'json':
            content = self._to_json(data)
            ext = '.json'
        else:
            content = self._to_csv(rows, fields)
            ext = '.csv'
        file_path = os.path.join(output_dir, f'{name}{ext}')
        return self._write_file(content, file_path)

    def export_validation_report(self, batch_id: int, output_dir: str = '.') -> str:
        summary = self.service.get_batch_summary(batch_id)
        issues = self.service.list_issues(batch_id=batch_id, status='open')
        report = {
            'batch_id': batch_id,
            'batch_name': summary['batch_name'],
            'batch_date': summary['batch_date'],
            'generated_at': datetime.now().isoformat(),
            'total_issues': summary['open_issues'],
            'issues': issues,
            'summary': summary
        }
        file_path = os.path.join(output_dir, f'{summary["batch_name"]}_审核报告_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
        return self._write_file(self._to_json(report), file_path)