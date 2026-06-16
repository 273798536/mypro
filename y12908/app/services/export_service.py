from typing import List, Dict, Optional, IO, Tuple
from datetime import datetime
import json
import csv
import io
from app import db
from app.models.models import (
    Sample,
    EvaluationBank,
    DiagnosisResult,
    ManualCorrection,
    SAMPLE_STATUS,
    DIAGNOSIS_STATUS,
    DIAGNOSIS_TYPE,
)
from app.services.diagnosis_service import DiagnosisService


class ExportService:

    STATUS_CN_MAP = {
        'PASS': '通过',
        'FAIL': '失败',
        'PENDING': '待诊断',
        'TO_BE_CONFIRMED': '待确认',
        'ERROR': '诊断错误',
    }

    SAMPLE_STATUS_CN_MAP = {
        'PENDING': '待处理',
        'CLEAN': '干净样本',
        'DIRTY': '脏样本',
        'LEAKAGE': '泄漏样本',
        'CORRECTED': '已修正',
    }

    @staticmethod
    def _get_diagnosis_summary(sample_id: int) -> Dict:
        diagnosis = DiagnosisService.get_latest_diagnosis(sample_id=sample_id)
        if not diagnosis:
            return {
                '诊断状态': '未诊断',
                '诊断摘要': '暂无诊断结果',
                '严重程度': '无',
                '置信度': 0.0,
                '匹配规则': '',
                '缺失规则': '',
            }

        details = {}
        if diagnosis.details:
            try:
                details = json.loads(diagnosis.details)
            except Exception:
                pass

        return {
            '诊断状态': ExportService.STATUS_CN_MAP.get(
                diagnosis.status.name, diagnosis.status.name
            ),
            '诊断摘要': diagnosis.summary or '',
            '严重程度': diagnosis.severity.name if diagnosis.severity else '无',
            '置信度': diagnosis.confidence,
            '匹配规则': diagnosis.matched_rules or '',
            '缺失规则': diagnosis.missing_rules or '',
            '遗忘比例': details.get('forget_check', {}).get('details', {}).get('forget_ratio', 0.0),
            '泄漏类型': details.get('leakage_check', {}).get('details', {}).get('leak_type', ''),
            '质量问题数': len(details.get('quality_check', {}).get('details', {}).get('issues', [])),
        }

    @staticmethod
    def _build_export_rows(samples: List[Sample],
                           include_content: bool = True) -> List[Dict]:
        rows = []
        for sample in samples:
            content = json.loads(sample.content) if sample.content else {}
            diagnosis_info = ExportService._get_diagnosis_summary(sample.id)

            row = {
                '样本ID': sample.id,
                '批次ID': sample.batch_id,
                '批次名称': sample.batch_name,
                '会话ID': sample.conversation_id or '',
                '用户ID': sample.user_id or '',
                '对话轮数': sample.turn_count,
                '数据集来源': sample.source_dataset or '',
                '划分类型': sample.split_type or '',
                '样本状态': ExportService.SAMPLE_STATUS_CN_MAP.get(
                    sample.status.name, sample.status.name
                ),
                **diagnosis_info,
                '创建时间': sample.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                '更新时间': sample.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
            }

            if include_content:
                if isinstance(content, dict) and 'turns' in content:
                    turns_text = []
                    for i, turn in enumerate(content['turns'], 1):
                        user = turn.get('user', '')
                        assistant = turn.get('assistant', '')
                        turns_text.append(f"第{i}轮 - 用户: {user}\n助理: {assistant}")
                    row['对话内容'] = '\n\n'.join(turns_text)
                else:
                    row['对话内容'] = json.dumps(content, ensure_ascii=False)

            rows.append(row)
        return rows

    @staticmethod
    def export_samples(batch_id: Optional[str] = None,
                       sample_ids: Optional[List[int]] = None,
                       status_filter: Optional[List[str]] = None,
                       format: str = 'csv',
                       include_content: bool = True) -> Tuple[str, IO, str]:
        query = Sample.query
        if batch_id:
            query = query.filter_by(batch_id=batch_id)
        if sample_ids:
            query = query.filter(Sample.id.in_(sample_ids))
        if status_filter:
            status_enums = [getattr(SAMPLE_STATUS, s) for s in status_filter if hasattr(SAMPLE_STATUS, s)]
            if status_enums:
                query = query.filter(Sample.status.in_(status_enums))

        samples = query.order_by(Sample.id).all()
        rows = ExportService._build_export_rows(samples, include_content)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        if batch_id:
            filename = f"样本诊断结果_{batch_id}_{timestamp}"
        else:
            filename = f"样本诊断结果_{timestamp}"

        if format == 'csv':
            output = io.StringIO()
            if rows:
                writer = csv.DictWriter(output, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
            output.seek(0)
            return filename + '.csv', output, 'text/csv; charset=utf-8-sig'

        elif format == 'json':
            output = io.StringIO()
            json.dump(rows, output, ensure_ascii=False, indent=2)
            output.seek(0)
            return filename + '.json', output, 'application/json'

        elif format == 'jsonl':
            output = io.StringIO()
            for row in rows:
                output.write(json.dumps(row, ensure_ascii=False) + '\n')
            output.seek(0)
            return filename + '.jsonl', output, 'application/jsonl'

        else:
            raise ValueError(f"不支持的导出格式: {format}")

    @staticmethod
    def export_diagnosis_report(batch_id: str,
                                format: str = 'csv') -> Tuple[str, IO, str]:
        failed_samples = Sample.query.filter_by(batch_id=batch_id) \
            .filter(Sample.status.in_([SAMPLE_STATUS.DIRTY, SAMPLE_STATUS.LEAKAGE])) \
            .all()

        rows = ExportService._build_export_rows(failed_samples, include_content=True)

        summary_row = {
            '样本ID': 'SUMMARY',
            '批次ID': batch_id,
            '批次名称': failed_samples[0].batch_name if failed_samples else batch_id,
            '会话ID': '',
            '用户ID': '',
            '对话轮数': len(failed_samples),
            '数据集来源': '',
            '划分类型': '',
            '样本状态': '问题样本汇总',
            '诊断状态': f'共{len(failed_samples)}个问题样本',
            '诊断摘要': f'样本诊断报告生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
            '严重程度': '',
            '置信度': '',
            '匹配规则': '',
            '缺失规则': '',
            '遗忘比例': '',
            '泄漏类型': '',
            '质量问题数': '',
            '创建时间': '',
            '更新时间': '',
            '对话内容': '',
        }

        rows.insert(0, summary_row)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"诊断报告_{batch_id}_{timestamp}"

        if format == 'csv':
            output = io.StringIO()
            if rows:
                writer = csv.DictWriter(output, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
            output.seek(0)
            return filename + '.csv', output, 'text/csv; charset=utf-8-sig'

        elif format == 'json':
            output = io.StringIO()
            json.dump(rows, output, ensure_ascii=False, indent=2)
            output.seek(0)
            return filename + '.json', output, 'application/json'

        else:
            raise ValueError(f"不支持的导出格式: {format}")

    @staticmethod
    def export_corrections(batch_id: Optional[str] = None,
                           format: str = 'csv') -> Tuple[str, IO, str]:
        query = ManualCorrection.query
        if batch_id:
            query = query.join(Sample).filter(Sample.batch_id == batch_id)

        corrections = query.order_by(ManualCorrection.created_at.desc()).all()
        rows = []

        for corr in corrections:
            sample = Sample.query.get(corr.sample_id)
            old_val = json.loads(corr.old_value) if corr.old_value else {}
            new_val = json.loads(corr.new_value) if corr.new_value else {}

            rows.append({
                '修正ID': corr.id,
                '样本ID': corr.sample_id,
                '批次ID': sample.batch_id if sample else '',
                '批次名称': sample.batch_name if sample else '',
                '诊断结果ID': corr.diagnosis_result_id or '',
                '修正类型': corr.correction_type or '',
                '旧值': json.dumps(old_val, ensure_ascii=False),
                '新值': json.dumps(new_val, ensure_ascii=False),
                '修正原因': corr.correction_reason or '',
                '修正人': corr.corrected_by or '',
                '版本号': corr.version_number or '',
                '修正时间': corr.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            })

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"人工修正记录_{timestamp}"

        if format == 'csv':
            output = io.StringIO()
            if rows:
                writer = csv.DictWriter(output, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
            output.seek(0)
            return filename + '.csv', output, 'text/csv; charset=utf-8-sig'

        elif format == 'json':
            output = io.StringIO()
            json.dump(rows, output, ensure_ascii=False, indent=2)
            output.seek(0)
            return filename + '.json', output, 'application/json'

        else:
            raise ValueError(f"不支持的导出格式: {format}")

    @staticmethod
    def get_diagnosis_summary_for_ui(batch_id: str) -> Dict:
        samples = Sample.query.filter_by(batch_id=batch_id).all()
        total = len(samples)

        diagnosis_results = DiagnosisResult.query \
            .join(Sample) \
            .filter(Sample.batch_id == batch_id, DiagnosisResult.is_latest == True) \
            .all()

        status_counts = {}
        for dr in diagnosis_results:
            status = ExportService.STATUS_CN_MAP.get(dr.status.name, dr.status.name)
            status_counts[status] = status_counts.get(status, 0) + 1

        return {
            'batch_id': batch_id,
            'batch_name': samples[0].batch_name if samples else '',
            'total_samples': total,
            'diagnosed_count': len(diagnosis_results),
            'status_counts': status_counts,
            'pass_rate': status_counts.get('通过', 0) / len(diagnosis_results) if diagnosis_results else 0,
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        }
