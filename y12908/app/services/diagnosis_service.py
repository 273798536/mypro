from typing import List, Dict, Optional, Tuple
from datetime import datetime
import json
import hashlib
from difflib import SequenceMatcher
from app import db
from app.models.models import (
    Sample,
    EvaluationBank,
    DiagnosisResult,
    SecurityRule,
    SAMPLE_STATUS,
    DIAGNOSIS_STATUS,
    DIAGNOSIS_TYPE,
    SEVERITY_LEVEL,
    generate_content_hash,
)
from app.services.error_handler import (
    LeakageDetectionError,
    SecurityRuleMissingError,
)


class DiagnosisService:

    REQUIRED_LEAKAGE_RULES = ['LEAKAGE_001', 'LEAKAGE_002', 'LEAKAGE_003']

    @staticmethod
    def _validate_security_rules() -> None:
        active_rules = SecurityRule.query.filter(
            SecurityRule.rule_code.in_(DiagnosisService.REQUIRED_LEAKAGE_RULES),
            SecurityRule.is_active == True
        ).all()
        active_codes = {r.rule_code for r in active_rules}
        missing = [r for r in DiagnosisService.REQUIRED_LEAKAGE_RULES if r not in active_codes]
        if missing:
            raise SecurityRuleMissingError(
                rule_codes=missing,
                context='训练验证泄漏检测需要这3条核心规则全部启用'
            )

    @staticmethod
    def _generate_result_key(target_type: str, target_id: int,
                             diagnosis_type: DIAGNOSIS_TYPE) -> str:
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
        key_str = f"{target_type}_{target_id}_{diagnosis_type.name}_{timestamp}"
        return hashlib.md5(key_str.encode('utf-8')).hexdigest()

    @staticmethod
    def _mark_old_results_as_not_latest(target_type: str, target_id: int,
                                        diagnosis_type: DIAGNOSIS_TYPE) -> None:
        query = DiagnosisResult.query.filter_by(
            diagnosis_type=diagnosis_type,
            is_latest=True
        )
        if target_type == 'sample':
            query = query.filter(DiagnosisResult.sample_id == target_id)
        else:
            query = query.filter(DiagnosisResult.evaluation_bank_id == target_id)

        for old_result in query.all():
            old_result.is_latest = False
        db.session.flush()

    @staticmethod
    def _convert_enums_to_strings(obj):
        if isinstance(obj, dict):
            return {k: DiagnosisService._convert_enums_to_strings(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [DiagnosisService._convert_enums_to_strings(item) for item in obj]
        elif hasattr(obj, 'name'):
            return obj.name
        return obj

    @staticmethod
    def _save_diagnosis_result(target_type: str, target_id: int,
                               diagnosis_type: DIAGNOSIS_TYPE,
                               status: DIAGNOSIS_STATUS,
                               summary: str,
                               details: Optional[Dict] = None,
                               severity: SEVERITY_LEVEL = None,
                               matched_rules: Optional[List[str]] = None,
                               missing_rules: Optional[List[str]] = None,
                               confidence: float = 0.0,
                               diagnosed_by: str = 'system') -> DiagnosisResult:

        DiagnosisService._mark_old_results_as_not_latest(target_type, target_id, diagnosis_type)

        result_key = DiagnosisService._generate_result_key(target_type, target_id, diagnosis_type)

        serializable_details = None
        if details:
            serializable_details = DiagnosisService._convert_enums_to_strings(details)

        existing = DiagnosisResult.query.filter_by(result_key=result_key, is_latest=True).first()
        if existing:
            existing.status = status
            existing.summary = summary
            existing.details = json.dumps(serializable_details, ensure_ascii=False) if serializable_details else None
            existing.severity = severity
            existing.matched_rules = ','.join(matched_rules) if matched_rules else None
            existing.missing_rules = ','.join(missing_rules) if missing_rules else None
            existing.confidence = confidence
            existing.diagnosed_by = diagnosed_by
            existing.updated_at = datetime.now()
            db.session.flush()
            return existing

        kwargs = {
            'result_key': result_key,
            'diagnosis_type': diagnosis_type,
            'status': status,
            'summary': summary,
            'severity': severity,
            'matched_rules': ','.join(matched_rules) if matched_rules else None,
            'missing_rules': ','.join(missing_rules) if missing_rules else None,
            'confidence': confidence,
            'diagnosed_by': diagnosed_by,
            'is_latest': True,
        }
        if serializable_details:
            kwargs['details'] = json.dumps(serializable_details, ensure_ascii=False)
        if target_type == 'sample':
            kwargs['sample_id'] = target_id
        else:
            kwargs['evaluation_bank_id'] = target_id

        result = DiagnosisResult(**kwargs)
        db.session.add(result)
        db.session.flush()
        return result

    @staticmethod
    def diagnose_sample(sample_id: int) -> DiagnosisResult:
        sample = Sample.query.get_or_404(sample_id)
        content = json.loads(sample.content)

        try:
            DiagnosisService._validate_security_rules()
        except SecurityRuleMissingError as e:
            return DiagnosisService._save_diagnosis_result(
                target_type='sample',
                target_id=sample_id,
                diagnosis_type=DIAGNOSIS_TYPE.LEAKAGE,
                status=DIAGNOSIS_STATUS.ERROR,
                summary=f'诊断失败: {e.message}',
                details={'error': e.to_dict()['error']},
                severity=SEVERITY_LEVEL.critical,
                missing_rules=e.rule_codes,
                confidence=0.0,
            )

        forget_result = DiagnosisService._check_forgetting(content, sample)
        leakage_result = DiagnosisService._check_leakage(content, sample)
        quality_result = DiagnosisService._check_quality(content, sample)

        all_results = [forget_result, leakage_result, quality_result]
        has_failure = any(r['status'] == DIAGNOSIS_STATUS.FAIL for r in all_results)
        has_error = any(r['status'] == DIAGNOSIS_STATUS.ERROR for r in all_results)

        if has_error:
            final_status = DIAGNOSIS_STATUS.ERROR
            sample.status = SAMPLE_STATUS.LEAKAGE
        elif has_failure:
            final_status = DIAGNOSIS_STATUS.FAIL
            sample.status = SAMPLE_STATUS.DIRTY
        else:
            final_status = DIAGNOSIS_STATUS.PASS
            sample.status = SAMPLE_STATUS.CLEAN

        db.session.commit()

        return DiagnosisService._save_diagnosis_result(
            target_type='sample',
            target_id=sample_id,
            diagnosis_type=DIAGNOSIS_TYPE.FORGET,
            status=final_status,
            summary=f"多轮遗忘诊断结果: {final_status.name}",
            details={
                'forget_check': forget_result,
                'leakage_check': leakage_result,
                'quality_check': quality_result,
            },
            severity=max((r.get('severity') for r in all_results if r.get('severity')),
                        key=lambda x: list(SEVERITY_LEVEL).index(x),
                        default=SEVERITY_LEVEL.low),
            matched_rules=list({r for res in all_results for r in res.get('matched_rules', [])}),
            missing_rules=list({r for res in all_results for r in res.get('missing_rules', [])}),
            confidence=min((r.get('confidence', 1.0) for r in all_results)),
        )

    @staticmethod
    def _check_forgetting(content: Dict, sample: Sample) -> Dict:
        turns = content.get('turns', [])
        if len(turns) < 3:
            return {
                'status': DIAGNOSIS_STATUS.PASS,
                'summary': '对话轮次不足，跳过遗忘检测',
                'confidence': 1.0,
            }

        topics = []
        for turn in turns:
            user_msg = turn.get('user', '')
            topic_keywords = set(user_msg.replace('，', ' ').replace('。', ' ').split())
            topics.append(topic_keywords)

        forget_ratio = 0.0
        if len(topics) > 1:
            first_topic = topics[0]
            last_topic = topics[-1]
            if first_topic and last_topic:
                overlap = len(first_topic & last_topic)
                forget_ratio = 1.0 - (overlap / max(len(first_topic), len(last_topic)))

        forget_threshold = 0.3
        if forget_ratio >= forget_threshold:
            return {
                'status': DIAGNOSIS_STATUS.FAIL,
                'summary': f'检测到多轮遗忘: 话题偏离度 {forget_ratio:.2%}',
                'details': {
                    'turn_count': len(turns),
                    'forget_ratio': forget_ratio,
                    'threshold': forget_threshold,
                    'first_topic_keywords': list(first_topic) if first_topic else [],
                    'last_topic_keywords': list(last_topic) if last_topic else [],
                },
                'severity': SEVERITY_LEVEL.medium,
                'matched_rules': ['QUALITY_001'],
                'confidence': forget_ratio,
            }

        return {
            'status': DIAGNOSIS_STATUS.PASS,
            'summary': f'多轮一致性检测通过，偏离度 {forget_ratio:.2%}',
            'details': {
                'turn_count': len(turns),
                'forget_ratio': forget_ratio,
                'threshold': forget_threshold,
            },
            'confidence': 1.0 - forget_ratio,
        }

    @staticmethod
    def _check_leakage(content: Dict, sample: Sample) -> Dict:
        content_text = json.dumps(content, sort_keys=True, ensure_ascii=False)

        if sample.split_type == 'train':
            eval_samples = EvaluationBank.query.all()
            for eval_sample in eval_samples:
                eval_content = json.loads(eval_sample.content)
                eval_text = json.dumps(eval_content, sort_keys=True, ensure_ascii=False)
                similarity = SequenceMatcher(None, content_text, eval_text).ratio()

                if similarity >= 0.95:
                    return {
                        'status': DIAGNOSIS_STATUS.FAIL,
                        'summary': f'检测到训练验证泄漏: 与评测题库 {eval_sample.bank_name} 相似度 {similarity:.2%}',
                        'details': {
                            'split_type': sample.split_type,
                            'leak_type': 'eval_bank_leakage',
                            'similarity': similarity,
                            'threshold': 0.95,
                            'matched_evaluation_id': eval_sample.id,
                            'matched_bank_name': eval_sample.bank_name,
                        },
                        'severity': SEVERITY_LEVEL.critical,
                        'matched_rules': ['LEAKAGE_001', 'LEAKAGE_003'],
                        'confidence': similarity,
                    }

        if sample.user_id:
            train_samples = Sample.query.filter(
                Sample.split_type == 'train',
                Sample.user_id == sample.user_id,
                Sample.id != sample.id
            ).all()

            if sample.split_type == 'val' and train_samples:
                return {
                    'status': DIAGNOSIS_STATUS.FAIL,
                    'summary': f'检测到用户级训练验证泄漏: 用户 {sample.user_id} 同时出现在训练集和验证集',
                    'details': {
                        'split_type': sample.split_type,
                        'leak_type': 'user_level_leakage',
                        'user_id': sample.user_id,
                        'train_sample_count': len(train_samples),
                    },
                    'severity': SEVERITY_LEVEL.high,
                    'matched_rules': ['LEAKAGE_002'],
                    'confidence': 0.9,
                }

        return {
            'status': DIAGNOSIS_STATUS.PASS,
            'summary': '训练验证泄漏检测通过',
            'details': {
                'split_type': sample.split_type,
                'user_id': sample.user_id,
            },
            'confidence': 1.0,
        }

    @staticmethod
    def _check_quality(content: Dict, sample: Sample) -> Dict:
        turns = content.get('turns', [])
        issues = []

        for i, turn in enumerate(turns):
            if 'user' not in turn or 'assistant' not in turn:
                issues.append(f'第 {i+1} 轮缺少 user 或 assistant 字段')
            if not turn.get('user', '').strip():
                issues.append(f'第 {i+1} 轮 user 内容为空')
            if not turn.get('assistant', '').strip():
                issues.append(f'第 {i+1} 轮 assistant 内容为空')

        if issues:
            return {
                'status': DIAGNOSIS_STATUS.FAIL,
                'summary': f'检测到 {len(issues)} 个质量问题',
                'details': {'issues': issues},
                'severity': SEVERITY_LEVEL.medium,
                'matched_rules': ['QUALITY_001'],
                'confidence': 1.0,
            }

        return {
            'status': DIAGNOSIS_STATUS.PASS,
            'summary': f'质量检测通过，共 {len(turns)} 轮对话',
            'details': {'turn_count': len(turns)},
            'confidence': 1.0,
        }

    @staticmethod
    def diagnose_batch(batch_id: str, diagnosis_type: Optional[DIAGNOSIS_TYPE] = None) -> Dict:
        samples = Sample.query.filter_by(batch_id=batch_id).all()
        total = len(samples)
        processed = 0
        passed = 0
        failed = 0
        errors = 0

        for sample in samples:
            try:
                result = DiagnosisService.diagnose_sample(sample.id)
                if result.status == DIAGNOSIS_STATUS.PASS:
                    passed += 1
                elif result.status == DIAGNOSIS_STATUS.FAIL:
                    failed += 1
                elif result.status == DIAGNOSIS_STATUS.ERROR:
                    errors += 1
                processed += 1
            except Exception as e:
                errors += 1
                db.session.rollback()

        return {
            'batch_id': batch_id,
            'total': total,
            'processed': processed,
            'passed': passed,
            'failed': failed,
            'errors': errors,
            'pass_rate': passed / total if total > 0 else 0,
        }

    @staticmethod
    def get_latest_diagnosis(sample_id: Optional[int] = None,
                             evaluation_bank_id: Optional[int] = None) -> Optional[DiagnosisResult]:
        query = DiagnosisResult.query.filter_by(is_latest=True)
        if sample_id:
            query = query.filter_by(sample_id=sample_id)
        if evaluation_bank_id:
            query = query.filter_by(evaluation_bank_id=evaluation_bank_id)
        return query.order_by(DiagnosisResult.updated_at.desc()).first()

    @staticmethod
    def get_diagnosis_history(target_type: str, target_id: int,
                              limit: int = 20) -> List[DiagnosisResult]:
        query = DiagnosisResult.query
        if target_type == 'sample':
            query = query.filter_by(sample_id=target_id)
        else:
            query = query.filter_by(evaluation_bank_id=target_id)
        return query.order_by(DiagnosisResult.created_at.desc()).limit(limit).all()
