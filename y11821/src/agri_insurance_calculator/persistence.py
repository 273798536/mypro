import json
import csv
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import CalculationResult, VoucherStatus, DamageLevel


class ResultPersistence:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def save_all(self, result: CalculationResult, prefix: str = "") -> dict:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        prefix = prefix or result.batch_id

        paths = {}

        paths['json'] = self._save_machine_readable(result, f"{prefix}_{timestamp}.json")
        paths['report'] = self._save_human_report(result, f"{prefix}_{timestamp}_report.txt")
        paths['vouchers_csv'] = self._save_vouchers_csv(result, f"{prefix}_{timestamp}_vouchers.csv")
        paths['actions_csv'] = self._save_actions_csv(result, f"{prefix}_{timestamp}_actions.csv")
        paths['dedup_csv'] = self._save_dedup_csv(result, f"{prefix}_{timestamp}_dedup.csv")
        paths['level_changes_csv'] = self._save_level_changes_csv(result, f"{prefix}_{timestamp}_level_changes.csv")
        paths['manifest'] = self._save_manifest(result, paths, f"{prefix}_{timestamp}_manifest.json")

        return paths

    def _save_machine_readable(self, result: CalculationResult, filename: str) -> str:
        path = self.output_dir / filename
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(result.model_dump(), f, ensure_ascii=False, indent=2, default=str)
        return str(path)

    def _save_human_report(self, result: CalculationResult, filename: str) -> str:
        from .report import format_human_report
        path = self.output_dir / filename
        format_human_report(result, str(path))
        return str(path)

    def _save_vouchers_csv(self, result: CalculationResult, filename: str) -> str:
        path = self.output_dir / filename
        with open(path, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                '凭证号', '农户ID', '农户姓名', '村庄', '凭证状态',
                '赔付面积(亩)', '灾损等级', '赔付金额(元)', '问题提示',
                '创建时间', '更新时间'
            ])
            for v in result.vouchers:
                writer.writerow([
                    v.voucher_id, v.farmer_id, v.farmer_name, v.village,
                    v.status.value, v.area, v.damage_level.value,
                    v.compensation_amount, '|'.join(v.issues),
                    v.created_at.isoformat(), v.updated_at.isoformat()
                ])
        return str(path)

    def _save_actions_csv(self, result: CalculationResult, filename: str) -> str:
        path = self.output_dir / filename
        with open(path, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                '待办ID', '优先级', '类型', '问题描述', '责任方',
                '联系方式', '需修改文件', '需修改字段', '当前状态', '关联结论'
            ])
            for a in result.action_items:
                writer.writerow([
                    a.action_id, a.priority, a.type, a.description,
                    a.responsible_person, a.contact or '',
                    a.file_to_modify, a.field_to_fix, a.status,
                    a.related_conclusion
                ])
        return str(path)

    def _save_dedup_csv(self, result: CalculationResult, filename: str) -> str:
        path = self.output_dir / filename
        with open(path, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                '图斑ID', '农户姓名', '原始面积(亩)', '重叠面积(亩)',
                '去重后面积(亩)', '重叠图斑', '是否已应用', '结论'
            ])
            for d in result.dedup_results:
                writer.writerow([
                    d.original_parcel_id, d.farmer_name, d.original_area,
                    d.overlapping_area, d.deduplicated_area,
                    '|'.join(d.overlapping_with),
                    '是' if d.applied else '否',
                    d.trace.conclusion
                ])
        return str(path)

    def _save_level_changes_csv(self, result: CalculationResult, filename: str) -> str:
        path = self.output_dir / filename
        with open(path, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                '农户ID', '农户姓名', '原等级', '新等级', '变更原因',
                '责任方', '需修改文件', '需修改字段'
            ])
            for lc in result.level_changes:
                writer.writerow([
                    lc.farmer_id, lc.farmer_name,
                    lc.original_level.value, lc.new_level.value,
                    lc.reason, lc.action_item.responsible_person,
                    lc.action_item.file_to_modify, lc.action_item.field_to_fix
                ])
        return str(path)

    def _save_manifest(self, result: CalculationResult, paths: dict, filename: str) -> str:
        manifest = {
            'batch_id': result.batch_id,
            'calculated_at': result.calculated_at.isoformat(),
            'generated_files': {
                'machine_readable': paths.get('json', ''),
                'human_report': paths.get('report', ''),
                'vouchers_csv': paths.get('vouchers_csv', ''),
                'actions_csv': paths.get('actions_csv', ''),
                'dedup_csv': paths.get('dedup_csv', ''),
                'level_changes_csv': paths.get('level_changes_csv', '')
            },
            'summary': {
                'total_farmers': result.total_farmers,
                'total_original_area': result.total_original_area,
                'total_deduplicated_area': result.total_deduplicated_area,
                'total_compensation': result.total_compensation
            },
            'status_counts': {k.value: v for k, v in result.status_summary.items()},
            'has_dedup': len(result.dedup_results) > 0,
            'has_level_changes': len(result.level_changes) > 0,
            'has_missing_signatures': len(result.missing_signatures) > 0,
            'pending_actions_count': len(result.action_items)
        }
        path = self.output_dir / filename
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        return str(path)

    def load_result(self, json_path: str) -> CalculationResult:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        from .models import CalculationResult
        return CalculationResult.model_validate(data)
