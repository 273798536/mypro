import argparse
import sys
import os
from datetime import datetime
from typing import List, Dict, Optional
from .models import Database
from .validator import Validator
from .importer import Importer, IMPORT_MODES, ENTITY_CONFIG
from .service import SubsidyService, BATCH_STATUS_FLOW, DISBURSEMENT_STATUS_FLOW
from .exporter import Exporter


class CLI:
    def __init__(self, db: Optional[Database] = None):
        self.db = db or Database()
        self.validator = Validator(self.db)
        self.importer = Importer(self.db)
        self.service = SubsidyService(self.db)
        self.exporter = Exporter(self.db)

    def build_parser(self) -> argparse.ArgumentParser:
        parser = argparse.ArgumentParser(prog='nongjibutie', description='农机补贴兑付服务')
        sub = parser.add_subparsers(dest='command', help='可用命令')
        sub.required = True

        p_import = sub.add_parser('import', help='导入数据')
        p_import.add_argument('entity', choices=list(ENTITY_CONFIG.keys()), help='实体类型')
        p_import.add_argument('file', help='CSV文件路径')
        p_import.add_argument('--mode', choices=IMPORT_MODES, default='ignore', help='重复处理: ignore=忽略 overwrite=覆盖 append=追加(默认: ignore)')

        p_create = sub.add_parser('create', help='创建兑付批次')
        p_create.add_argument('name', help='批次名称')
        p_create.add_argument('--date', help='批次日期(YYYY-MM-DD)')
        p_create.add_argument('--source', default='manual', help='来源标识')

        p_add = sub.add_parser('add', help='添加兑付记录')
        p_add.add_argument('batch_id', type=int, help='批次ID')
        p_add.add_argument('farmer_id', type=int, help='农户ID')
        p_add.add_argument('invoice_id', type=int, help='发票ID')
        p_add.add_argument('amount', type=float, help='补贴金额')
        p_add.add_argument('--remark', default='', help='备注')

        p_validate = sub.add_parser('validate', help='校验批次')
        p_validate.add_argument('batch_id', type=int, help='批次ID')

        p_list = sub.add_parser('list', help='列表查看')
        p_list.add_argument('what', choices=['batches', 'issues', 'records', 'farmers', 'invoices', 'photos', 'standards'], help='查看对象')
        p_list.add_argument('--batch-id', type=int, help='批次ID过滤')
        p_list.add_argument('--status', help='状态过滤')

        p_batch = sub.add_parser('batch', help='批次操作')
        p_batch.add_argument('batch_id', type=int, help='批次ID')
        p_batch.add_argument('action', choices=['approve', 'pay', 'cancel', 'reset'], help='操作类型')

        p_issue = sub.add_parser('issue', help='问题管理')
        p_issue.add_argument('--batch-id', type=int, help='批次ID')
        p_issue.add_argument('--resolve', type=int, help='标记问题ID为已解决')
        p_issue.add_argument('--list', action='store_true', help='列出问题')

        p_export = sub.add_parser('export', help='导出报告')
        p_export.add_argument('batch_id', type=int, help='批次ID')
        p_export.add_argument('--dir', default='./exports', help='输出目录')
        p_export.add_argument('--format', choices=['csv', 'json'], default='csv', help='输出格式')

        p_history = sub.add_parser('history', help='修正痕迹')
        p_history.add_argument('--table', help='表名过滤')
        p_history.add_argument('--record-id', type=int, help='记录ID过滤')

        return parser

    def run(self, args: Optional[List[str]] = None):
        parser = self.build_parser()
        parsed = parser.parse_args(args)

        if parsed.command == 'import':
            self._cmd_import(parsed)
        elif parsed.command == 'create':
            self._cmd_create(parsed)
        elif parsed.command == 'add':
            self._cmd_add(parsed)
        elif parsed.command == 'validate':
            self._cmd_validate(parsed)
        elif parsed.command == 'list':
            self._cmd_list(parsed)
        elif parsed.command == 'batch':
            self._cmd_batch(parsed)
        elif parsed.command == 'issue':
            self._cmd_issue(parsed)
        elif parsed.command == 'export':
            self._cmd_export(parsed)
        elif parsed.command == 'history':
            self._cmd_history(parsed)

    def _cmd_import(self, parsed):
        try:
            result = self.importer.import_csv(parsed.entity, parsed.file, parsed.mode)
            print(result.summary())
            if result.errors:
                for err in result.errors:
                    print(f'  ! {err}')
        except Exception as e:
            print(f'导入失败: {e}')
            sys.exit(1)

    def _cmd_create(self, parsed):
        try:
            batch_id = self.service.create_batch(parsed.name, parsed.date, parsed.source)
            print(f'批次已创建: ID={batch_id} 名称={parsed.name}')
        except Exception as e:
            print(f'创建失败: {e}')
            sys.exit(1)

    def _cmd_add(self, parsed):
        try:
            rid = self.service.add_record(parsed.batch_id, parsed.farmer_id, parsed.invoice_id, parsed.amount, remark=parsed.remark)
            print(f'记录已添加: ID={rid}')
        except Exception as e:
            print(f'添加失败: {e}')
            sys.exit(1)

    def _cmd_validate(self, parsed):
        try:
            result = self.service.validate_and_mark(parsed.batch_id)
            summary = result.summary()
            print(f'校验完成: 共 {summary["total_issues"]} 个问题')
            for itype, count in summary['by_type'].items():
                print(f'  - {itype}: {count}')
            if not result.passed:
                print('注意: 存在问题，问题记录已标记。运行 list issues 查看详情。')
            else:
                print('所有记录校验通过。')
        except Exception as e:
            print(f'校验失败: {e}')
            sys.exit(1)

    def _cmd_list(self, parsed):
        try:
            if parsed.what == 'batches':
                rows = self.service.list_batches(parsed.status)
                self._print_table(rows, ['id', 'batch_name', 'batch_date', 'status'])
            elif parsed.what == 'issues':
                rows = self.service.list_issues(parsed.batch_id, parsed.status or 'open')
                self._print_table(rows, ['id', 'issue_type', 'severity', 'farmer_name', 'invoice_number', 'issue_detail'])
            elif parsed.what == 'records':
                sql = 'SELECT dr.*, f.farmer_name, inv.invoice_number FROM disbursement_records dr LEFT JOIN farmer_profiles f ON dr.farmer_id = f.id LEFT JOIN purchase_invoices inv ON dr.invoice_id = inv.id WHERE 1=1'
                params = []
                if parsed.batch_id:
                    sql += ' AND dr.batch_id = ?'
                    params.append(parsed.batch_id)
                if parsed.status:
                    sql += ' AND dr.status = ?'
                    params.append(parsed.status)
                sql += ' ORDER BY dr.id'
                rows = [dict(r) for r in self.db.query(sql, tuple(params))]
                self._print_table(rows, ['id', 'batch_id', 'farmer_name', 'invoice_number', 'subsidy_amount', 'status', 'issue_flags'])
            elif parsed.what == 'farmers':
                rows = [dict(r) for r in self.db.query('SELECT * FROM farmer_profiles WHERE is_active = 1 ORDER BY id')]
                self._print_table(rows, ['id', 'farmer_name', 'id_card', 'qualification_type', 'qualification_end', 'village'])
            elif parsed.what == 'invoices':
                rows = [dict(r) for r in self.db.query('SELECT pi.*, f.farmer_name FROM purchase_invoices pi LEFT JOIN farmer_profiles f ON pi.farmer_id = f.id WHERE pi.is_active = 1 ORDER BY pi.id')]
                self._print_table(rows, ['id', 'invoice_number', 'invoice_date', 'machine_model', 'amount', 'farmer_name', 'dedup_status'])
            elif parsed.what == 'photos':
                rows = [dict(r) for r in self.db.query('SELECT ip.*, f.farmer_name FROM inspection_photos ip LEFT JOIN farmer_profiles f ON ip.farmer_id = f.id WHERE ip.is_active = 1 ORDER BY ip.id')]
                self._print_table(rows, ['id', 'photo_hash', 'farmer_name', 'machine_model', 'photo_date', 'match_status'])
            elif parsed.what == 'standards':
                rows = [dict(r) for r in self.db.query('SELECT * FROM subsidy_standards WHERE is_active = 1 ORDER BY machine_model')]
                self._print_table(rows, ['id', 'machine_model', 'standard_amount', 'effective_date', 'expire_date'])
        except Exception as e:
            print(f'查询失败: {e}')
            sys.exit(1)

    def _cmd_batch(self, parsed):
        action_map = {'approve': 'approved', 'pay': 'paid', 'cancel': 'cancelled', 'reset': 'draft'}
        new_status = action_map[parsed.action]
        try:
            self.service.update_batch_status(parsed.batch_id, new_status)
            batch = self.db.query_one('SELECT * FROM disbursement_batches WHERE id = ?', (parsed.batch_id,))
            print(f'批次状态已更新: {batch["batch_name"]} -> {new_status}')
        except Exception as e:
            print(f'操作失败: {e}')
            sys.exit(1)

    def _cmd_issue(self, parsed):
        if parsed.resolve:
            try:
                self.db.resolve_issue(parsed.resolve)
                print(f'问题#{parsed.resolve} 已标记为已解决')
            except Exception as e:
                print(f'操作失败: {e}')
                sys.exit(1)
        else:
            rows = self.service.list_issues(parsed.batch_id, parsed.status or 'open')
            self._print_table(rows, ['id', 'issue_type', 'severity', 'farmer_name', 'invoice_number', 'issue_detail', 'created_at'])

    def _cmd_export(self, parsed):
        try:
            files = self.exporter.export_batch(parsed.batch_id, parsed.dir, parsed.format)
            print('已导出:')
            for label, path in files.items():
                print(f'  {label}: {path}')
            report_path = self.exporter.export_validation_report(parsed.batch_id, parsed.dir)
            print(f'  report: {report_path}')
        except Exception as e:
            print(f'导出失败: {e}')
            sys.exit(1)

    def _cmd_history(self, parsed):
        rows = self.service.get_correction_history(parsed.table, parsed.record_id)
        if not rows:
            print('无修正记录')
            return
        self._print_table(rows, ['id', 'table_name', 'record_id', 'field_name', 'old_value', 'new_value', 'corrected_by', 'corrected_at', 'reason'])

    def _print_table(self, rows: List[Dict], fields: List[str]):
        if not rows:
            print('(无记录)')
            return
        for f in fields:
            print(f'{f:>20}', end='  ')
        print()
        print('-' * (22 * len(fields)))
        for row in rows:
            for f in fields:
                val = str(row.get(f, ''))
                if len(val) > 40:
                    val = val[:37] + '...'
                print(f'{val:>20}', end='  ')
            print()
        print(f'共 {len(rows)} 条记录')