from typing import List, Dict, Optional
from datetime import datetime
import json
from app import db
from app.models.models import (
    Sample,
    ManualCorrection,
    DiagnosisResult,
    SAMPLE_STATUS,
    DIAGNOSIS_STATUS,
    DIAGNOSIS_TYPE,
)
from app.services.version_service import VersionService
from app.services.diagnosis_service import DiagnosisService


class CorrectionService:

    @staticmethod
    def create_correction(sample_id: int, correction_type: str,
                          old_value: Optional[Dict], new_value: Optional[Dict],
                          correction_reason: str, corrected_by: str,
                          diagnosis_result_id: Optional[int] = None,
                          auto_create_version: bool = True) -> ManualCorrection:

        sample = Sample.query.get_or_404(sample_id)

        version_number = None
        if auto_create_version and correction_type == 'content' and new_value:
            version = VersionService.create_version(
                sample_id=sample_id,
                new_content=new_value,
                change_reason=correction_reason,
                changed_by=corrected_by,
            )
            version_number = version.version_number

        correction = ManualCorrection(
            sample_id=sample_id,
            diagnosis_result_id=diagnosis_result_id,
            correction_type=correction_type,
            old_value=json.dumps(old_value, ensure_ascii=False) if old_value else None,
            new_value=json.dumps(new_value, ensure_ascii=False) if new_value else None,
            correction_reason=correction_reason,
            corrected_by=corrected_by,
            version_number=version_number,
        )
        db.session.add(correction)

        if correction_type == 'status' and new_value:
            new_status = new_value.get('status')
            if new_status and hasattr(SAMPLE_STATUS, new_status):
                sample.status = getattr(SAMPLE_STATUS, new_status)

        if correction_type == 'override_diagnosis' and new_value:
            new_diagnosis_status = new_value.get('status')
            if new_diagnosis_status and hasattr(DIAGNOSIS_STATUS, new_diagnosis_status):
                diagnosis = DiagnosisService.get_latest_diagnosis(sample_id=sample_id)
                if diagnosis:
                    DiagnosisService._save_diagnosis_result(
                        target_type='sample',
                        target_id=sample_id,
                        diagnosis_type=diagnosis.diagnosis_type,
                        status=getattr(DIAGNOSIS_STATUS, new_diagnosis_status),
                        summary=f"人工修正: {new_value.get('reason', correction_reason)}",
                        details={
                            'manual_override': True,
                            'original_status': diagnosis.status.name,
                            'new_status': new_diagnosis_status,
                            'correction_reason': correction_reason,
                        },
                        severity=diagnosis.severity,
                        matched_rules=diagnosis.matched_rules.split(',') if diagnosis.matched_rules else [],
                        missing_rules=diagnosis.missing_rules.split(',') if diagnosis.missing_rules else [],
                        confidence=diagnosis.confidence,
                        diagnosed_by=f'manual:{corrected_by}',
                    )
                    sample.status = SAMPLE_STATUS.CORRECTED

        db.session.flush()
        return correction

    @staticmethod
    def get_correction(correction_id: int) -> Optional[ManualCorrection]:
        return ManualCorrection.query.get(correction_id)

    @staticmethod
    def list_corrections(sample_id: Optional[int] = None,
                         correction_type: Optional[str] = None,
                         corrected_by: Optional[str] = None,
                         limit: int = 100) -> List[ManualCorrection]:
        query = ManualCorrection.query
        if sample_id:
            query = query.filter_by(sample_id=sample_id)
        if correction_type:
            query = query.filter_by(correction_type=correction_type)
        if corrected_by:
            query = query.filter_by(corrected_by=corrected_by)
        return query.order_by(ManualCorrection.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_correction_stats(sample_id: Optional[int] = None,
                             batch_id: Optional[str] = None) -> Dict:
        query = ManualCorrection.query
        if sample_id:
            query = query.filter_by(sample_id=sample_id)
        if batch_id:
            query = query.join(Sample).filter(Sample.batch_id == batch_id)

        corrections = query.all()
        type_counts = {}
        by_user = {}

        for corr in corrections:
            ctype = corr.correction_type or 'unknown'
            type_counts[ctype] = type_counts.get(ctype, 0) + 1
            user = corr.corrected_by or 'unknown'
            by_user[user] = by_user.get(user, 0) + 1

        return {
            'total_corrections': len(corrections),
            'type_counts': type_counts,
            'by_user': by_user,
            'corrected_samples': len({c.sample_id for c in corrections}),
        }

    @staticmethod
    def override_diagnosis(sample_id: int, new_status: str,
                           reason: str, overridden_by: str) -> ManualCorrection:
        diagnosis = DiagnosisService.get_latest_diagnosis(sample_id=sample_id)
        if not diagnosis:
            raise ValueError(f"样本 {sample_id} 没有诊断结果，无法覆盖")

        old_status = diagnosis.status.name

        return CorrectionService.create_correction(
            sample_id=sample_id,
            correction_type='override_diagnosis',
            old_value={'status': old_status},
            new_value={'status': new_status, 'reason': reason},
            correction_reason=reason,
            corrected_by=overridden_by,
            diagnosis_result_id=diagnosis.id,
            auto_create_version=False,
        )

    @staticmethod
    def correct_content(sample_id: int, new_content: Dict,
                        reason: str, corrected_by: str) -> ManualCorrection:
        sample = Sample.query.get_or_404(sample_id)
        old_content = json.loads(sample.content)

        correction = CorrectionService.create_correction(
            sample_id=sample_id,
            correction_type='content',
            old_value=old_content,
            new_value=new_content,
            correction_reason=reason,
            corrected_by=corrected_by,
            auto_create_version=True,
        )

        return correction
