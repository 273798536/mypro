import pandas as pd
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from datetime import datetime
from .models import (
    ReagentBatch, Sample, SequencingResult, PedigreeMember,
    ValidationResult, ConflictRecord, ValidationStatus, ConflictType
)
from .database import db

class PedigreeValidator:
    def __init__(self, db_session=None):
        self.db = db_session or db.session
        self.validation_rules = [
            ('gender_consistency', '性别一致性校验', self._validate_gender_consistency),
            ('sample_sequencing_match', '样本-测序匹配校验', self._validate_sample_sequencing_match),
            ('pedigree_relationship', '家系关系校验', self._validate_pedigree_relationship),
            ('genotype_inheritance', '基因型遗传模式校验', self._validate_genotype_inheritance),
            ('data_completeness', '数据完整性校验', self._validate_data_completeness),
            ('batch_consistency', '批次一致性校验', self._validate_batch_consistency),
        ]

    def run_all_validations(self, batch_id: int) -> Dict:
        batch = ReagentBatch.query.get(batch_id)
        if not batch:
            return {'success': False, 'error': f'批次不存在: {batch_id}'}

        results = {
            'batch_id': batch_id,
            'batch_number': batch.batch_number,
            'validation_time': datetime.utcnow().isoformat(),
            'rules': [],
            'summary': {
                'total_rules': len(self.validation_rules),
                'passed': 0,
                'failed': 0,
                'review': 0,
                'total_conflicts': 0,
                'critical_conflicts': 0
            }
        }

        ValidationResult.query.filter_by(batch_id=batch_id).delete()

        for rule_id, rule_name, rule_func in self.validation_rules:
            try:
                rule_result = rule_func(batch)
                results['rules'].append(rule_result)
                
                if rule_result['status'] == ValidationStatus.PASS:
                    results['summary']['passed'] += 1
                elif rule_result['status'] == ValidationStatus.FAIL:
                    results['summary']['failed'] += 1
                elif rule_result['status'] == ValidationStatus.REVIEW:
                    results['summary']['review'] += 1

            except Exception as e:
                results['rules'].append({
                    'rule_id': rule_id,
                    'rule_name': rule_name,
                    'status': ValidationStatus.FAIL,
                    'error': str(e),
                    'items': []
                })
                results['summary']['failed'] += 1

        open_conflicts = ConflictRecord.query.filter_by(
            batch_id=batch_id, status='open'
        ).all()
        results['summary']['total_conflicts'] = len(open_conflicts)
        results['summary']['critical_conflicts'] = sum(
            1 for c in open_conflicts if c.is_critical
        )

        self.db.commit()
        return results

    def _validate_gender_consistency(self, batch: ReagentBatch) -> Dict:
        result = {
            'rule_id': 'gender_consistency',
            'rule_name': '性别一致性校验',
            'status': ValidationStatus.PASS,
            'items': [],
            'stats': {'mismatch': 0, 'consistent': 0, 'unknown': 0}
        }

        samples = Sample.query.filter_by(batch_id=batch.id).all()
        for sample in samples:
            if not sample.gender:
                result['stats']['unknown'] += 1
                continue

            pedigree_members = PedigreeMember.query.filter_by(sample_id=sample.id).all()
            for pm in pedigree_members:
                if pm.gender and pm.gender != sample.gender:
                    result['stats']['mismatch'] += 1
                    result['status'] = ValidationStatus.FAIL

                    vr = ValidationResult(
                        batch_id=batch.id,
                        sample_id=sample.id,
                        validation_type='gender_consistency',
                        status=ValidationStatus.FAIL,
                        severity='error',
                        message=f"样本 {sample.sample_id} 性别不一致",
                        expected_value=sample.gender,
                        actual_value=pm.gender,
                        source_records={
                            'sample_id': sample.sample_id,
                            'sample_gender': sample.gender,
                            'sample_source': f"{sample.source_file} 行{sample.original_row_number}",
                            'pedigree_gender': pm.gender,
                            'pedigree_source': f"{pm.source_file} 行{pm.original_row_number}"
                        }
                    )
                    self.db.add(vr)

                    self._create_conflict(
                        batch, ConflictType.GENDER_MISMATCH,
                        f"样本 {sample.sample_id} 性别不一致: 样本表={sample.gender}, 家系表={pm.gender}",
                        {'sample_id': sample.id, 'pedigree_member_id': pm.id},
                        severity='error', priority=3, sample_id=sample.id
                    )
                else:
                    result['stats']['consistent'] += 1

        return result

    def _validate_sample_sequencing_match(self, batch: ReagentBatch) -> Dict:
        result = {
            'rule_id': 'sample_sequencing_match',
            'rule_name': '样本-测序匹配校验',
            'status': ValidationStatus.PASS,
            'items': [],
            'stats': {
                'samples_with_sequencing': 0,
                'samples_without_sequencing': 0,
                'sequencing_without_sample': 0,
                'total_samples': 0,
                'total_sequencing': 0
            }
        }

        samples = Sample.query.filter_by(batch_id=batch.id).all()
        sequencing_results = SequencingResult.query.join(
            Sample, SequencingResult.sample_id == Sample.id
        ).filter(Sample.batch_id == batch.id).all()

        result['stats']['total_samples'] = len(samples)
        result['stats']['total_sequencing'] = len(sequencing_results)

        for sample in samples:
            seq_count = SequencingResult.query.filter_by(sample_id=sample.id).count()
            if seq_count == 0:
                result['stats']['samples_without_sequencing'] += 1
                result['status'] = ValidationStatus.REVIEW

                vr = ValidationResult(
                    batch_id=batch.id,
                    sample_id=sample.id,
                    validation_type='sample_sequencing_match',
                    status=ValidationStatus.REVIEW,
                    severity='warning',
                    message=f"样本 {sample.sample_id} 无测序结果",
                    source_records={
                        'sample_id': sample.sample_id,
                        'source': f"{sample.source_file} 行{sample.original_row_number}"
                    }
                )
                self.db.add(vr)
            else:
                result['stats']['samples_with_sequencing'] += 1

        return result

    def _validate_pedigree_relationship(self, batch: ReagentBatch) -> Dict:
        result = {
            'rule_id': 'pedigree_relationship',
            'rule_name': '家系关系校验',
            'status': ValidationStatus.PASS,
            'items': [],
            'stats': {
                'total_members': 0,
                'valid_relationships': 0,
                'invalid_relationships': 0,
                'missing_parents': 0,
                'gender_violations': 0
            }
        }

        members = PedigreeMember.query.filter_by().all()
        batch_member_ids = {s.id for s in Sample.query.filter_by(batch_id=batch.id).all()}
        
        family_members = defaultdict(list)
        for m in members:
            if m.sample_id in batch_member_ids:
                family_members[m.family_id or 'unknown'].append(m)

        result['stats']['total_members'] = len(members)

        for family_id, f_members in family_members.items():
            member_map = {m.individual_id: m for m in f_members}

            for member in f_members:
                if member.father_id:
                    father = member_map.get(member.father_id)
                    if father:
                        result['stats']['valid_relationships'] += 1
                        if father.gender and father.gender != 'Male':
                            result['stats']['gender_violations'] += 1
                            result['status'] = ValidationStatus.FAIL
                            self._add_validation_error(
                                batch, member, 'pedigree_relationship',
                                f"家系 {family_id} 中 {member.individual_id} 的父亲 {father.individual_id} 性别应为男性",
                                'Male', father.gender, 'error'
                            )
                    else:
                        result['stats']['missing_parents'] += 1

                if member.mother_id:
                    mother = member_map.get(member.mother_id)
                    if mother:
                        result['stats']['valid_relationships'] += 1
                        if mother.gender and mother.gender != 'Female':
                            result['stats']['gender_violations'] += 1
                            result['status'] = ValidationStatus.FAIL
                            self._add_validation_error(
                                batch, member, 'pedigree_relationship',
                                f"家系 {family_id} 中 {member.individual_id} 的母亲 {mother.individual_id} 性别应为女性",
                                'Female', mother.gender, 'error'
                            )
                    else:
                        result['stats']['missing_parents'] += 1

        return result

    def _validate_genotype_inheritance(self, batch: ReagentBatch) -> Dict:
        result = {
            'rule_id': 'genotype_inheritance',
            'rule_name': '基因型遗传模式校验',
            'status': ValidationStatus.PASS,
            'items': [],
            'stats': {
                'total_variants': 0,
                'consistent_inheritance': 0,
                'inconsistent_inheritance': 0,
                'cannot_verify': 0
            }
        }

        seq_results = SequencingResult.query.join(
            Sample, SequencingResult.sample_id == Sample.id
        ).filter(Sample.batch_id == batch.id).all()

        family_members = defaultdict(dict)
        for pm in PedigreeMember.query.all():
            if pm.sample_id:
                family_members[pm.family_id or 'unknown'][pm.sample_id] = pm

        for seq in seq_results:
            if not seq.genotype:
                continue

            result['stats']['total_variants'] += 1
            sample_id = seq.sample_id

            parent_genotypes = []
            for family_id, members in family_members.items():
                pm = members.get(sample_id)
                if pm:
                    for parent_id_field in ['father_id', 'mother_id']:
                        parent_ind_id = getattr(pm, parent_id_field)
                        if parent_ind_id:
                            for s_id, s_pm in members.items():
                                if s_pm.individual_id == parent_ind_id and s_pm.sample_id:
                                    parent_seq = SequencingResult.query.filter_by(
                                        sample_id=s_pm.sample_id,
                                        chromosome=seq.chromosome,
                                        position=seq.position,
                                        reference=seq.reference,
                                        alternate=seq.alternate
                                    ).first()
                                    if parent_seq and parent_seq.genotype:
                                        parent_genotypes.append(parent_seq.genotype)
                    break

            if parent_genotypes:
                if self._check_inheritance(seq.genotype, parent_genotypes):
                    result['stats']['consistent_inheritance'] += 1
                else:
                    result['stats']['inconsistent_inheritance'] += 1
                    result['status'] = ValidationStatus.FAIL
                    self._add_validation_error(
                        batch, Sample.query.get(sample_id), 'genotype_inheritance',
                        f"样本 {seq.sample_id} 在 {seq.chromosome}:{seq.position} 的基因型 {seq.genotype} 与父母基因型 {parent_genotypes} 遗传模式不一致",
                        str(parent_genotypes), seq.genotype, 'error'
                    )
            else:
                result['stats']['cannot_verify'] += 1

        return result

    def _check_inheritance(self, child_gt: str, parent_gts: List[str]) -> bool:
        if not child_gt or len(parent_gts) < 2:
            return True

        child_alleles = set(child_gt.replace('/', '|').split('/'))
        all_parent_alleles = set()
        for pg in parent_gts:
            all_parent_alleles.update(pg.replace('/', '|').split('/'))

        return child_alleles.issubset(all_parent_alleles)

    def _validate_data_completeness(self, batch: ReagentBatch) -> Dict:
        result = {
            'rule_id': 'data_completeness',
            'rule_name': '数据完整性校验',
            'status': ValidationStatus.PASS,
            'items': [],
            'stats': {
                'samples_missing_gender': 0,
                'samples_missing_name': 0,
                'sequencing_missing_variant': 0,
                'sequencing_low_quality': 0,
                'pedigree_missing_affection': 0
            }
        }

        samples = Sample.query.filter_by(batch_id=batch.id).all()
        for sample in samples:
            if not sample.gender:
                result['stats']['samples_missing_gender'] += 1
            if not sample.name:
                result['stats']['samples_missing_name'] += 1

        seq_results = SequencingResult.query.join(
            Sample, SequencingResult.sample_id == Sample.id
        ).filter(Sample.batch_id == batch.id).all()

        for seq in seq_results:
            if not seq.variant and not (seq.chromosome and seq.position):
                result['stats']['sequencing_missing_variant'] += 1
            if seq.quality_score and seq.quality_score < 30:
                result['stats']['sequencing_low_quality'] += 1

        pedigree_members = PedigreeMember.query.all()
        for pm in pedigree_members:
            if not pm.affection_status:
                result['stats']['pedigree_missing_affection'] += 1

        if any(v > 0 for v in result['stats'].values()):
            result['status'] = ValidationStatus.REVIEW

        return result

    def _validate_batch_consistency(self, batch: ReagentBatch) -> Dict:
        result = {
            'rule_id': 'batch_consistency',
            'rule_name': '批次一致性校验',
            'status': ValidationStatus.PASS,
            'items': [],
            'stats': {
                'total_samples': 0,
                'samples_in_multiple_batches': 0,
                'multiple_imports': 0
            }
        }

        samples = Sample.query.filter_by(batch_id=batch.id).all()
        result['stats']['total_samples'] = len(samples)

        sample_batch_counts = defaultdict(set)
        for s in Sample.query.all():
            sample_batch_counts[s.sample_id].add(s.batch_id)

        for sample in samples:
            if len(sample_batch_counts[sample.sample_id]) > 1:
                result['stats']['samples_in_multiple_batches'] += 1
                result['status'] = ValidationStatus.FAIL

                other_batches = [
                    ReagentBatch.query.get(b).batch_number
                    for b in sample_batch_counts[sample.sample_id]
                    if b != batch.id
                ]

                self._create_conflict(
                    batch, ConflictType.BATCH_CONFLICT,
                    f"样本 {sample.sample_id} 存在于多个批次: {batch.batch_number}, {', '.join(other_batches)}",
                    {'sample_id': sample.id, 'batches': list(sample_batch_counts[sample.sample_id])},
                    severity='warning', priority=2, sample_id=sample.id
                )

        return result

    def _add_validation_error(self, batch: ReagentBatch, sample: Sample,
                              validation_type: str, message: str,
                              expected: str, actual: str, severity: str):
        vr = ValidationResult(
            batch_id=batch.id,
            sample_id=sample.id if sample else None,
            validation_type=validation_type,
            status=ValidationStatus.FAIL,
            severity=severity,
            message=message,
            expected_value=expected,
            actual_value=actual,
            source_records={
                'sample_id': sample.sample_id if sample else None,
                'source': f"{sample.source_file} 行{sample.original_row_number}" if sample else None
            }
        )
        self.db.add(vr)

    def _create_conflict(self, batch: ReagentBatch, conflict_type: ConflictType,
                         message: str, source_records: Dict, severity: str = 'warning',
                         priority: int = 1, sample_id: int = None,
                         sequencing_result_id: int = None):
        conflict = ConflictRecord(
            batch_id=batch.id,
            sample_id=sample_id,
            sequencing_result_id=sequencing_result_id,
            conflict_type=conflict_type.value if hasattr(conflict_type, 'value') else conflict_type,
            severity=severity,
            status='open',
            message=message,
            source_records=source_records,
            priority=priority
        )
        self.db.add(conflict)

    def get_validation_results(self, batch_id: int = None) -> List[ValidationResult]:
        query = ValidationResult.query.order_by(
            ValidationResult.severity.desc(),
            ValidationResult.created_at.desc()
        )
        if batch_id:
            query = query.filter_by(batch_id=batch_id)
        return query.all()

    def get_conflicts(self, batch_id: int = None, status: str = None,
                      severity: str = None) -> List[ConflictRecord]:
        query = ConflictRecord.query.order_by(
            ConflictRecord.priority.desc(),
            ConflictRecord.created_at.desc()
        )
        if batch_id:
            query = query.filter_by(batch_id=batch_id)
        if status:
            query = query.filter_by(status=status)
        if severity:
            query = query.filter_by(severity=severity)
        return query.all()

    def resolve_conflict(self, conflict_id: int, resolution_notes: str,
                         resolved_by: str = None) -> bool:
        conflict = ConflictRecord.query.get(conflict_id)
        if not conflict:
            return False
        conflict.status = 'resolved'
        conflict.resolution_notes = resolution_notes
        conflict.resolved_by = resolved_by
        conflict.resolved_at = datetime.utcnow()
        self.db.commit()
        return True

    def diff_batches(self, batch_id_1: int, batch_id_2: int) -> Dict:
        batch1 = ReagentBatch.query.get(batch_id_1)
        batch2 = ReagentBatch.query.get(batch_id_2)
        if not batch1 or not batch2:
            return {'success': False, 'error': '批次不存在'}

        samples1 = {s.sample_id: s for s in Sample.query.filter_by(batch_id=batch_id_1).all()}
        samples2 = {s.sample_id: s for s in Sample.query.filter_by(batch_id=batch_id_2).all()}

        all_sample_ids = set(samples1.keys()) | set(samples2.keys())

        diff_result = {
            'batch1': batch1.batch_number,
            'batch2': batch2.batch_number,
            'comparison_time': datetime.utcnow().isoformat(),
            'only_in_batch1': [],
            'only_in_batch2': [],
            'in_both': [],
            'differences': []
        }

        for sid in all_sample_ids:
            s1 = samples1.get(sid)
            s2 = samples2.get(sid)

            if s1 and not s2:
                diff_result['only_in_batch1'].append({
                    'sample_id': sid,
                    'gender': s1.gender,
                    'source': f"{s1.source_file} 行{s1.original_row_number}"
                })
            elif s2 and not s1:
                diff_result['only_in_batch2'].append({
                    'sample_id': sid,
                    'gender': s2.gender,
                    'source': f"{s2.source_file} 行{s2.original_row_number}"
                })
            else:
                diff_result['in_both'].append(sid)
                sample_diffs = []

                for field in ['gender', 'name', 'sample_type', 'status']:
                    v1 = getattr(s1, field)
                    v2 = getattr(s2, field)
                    if v1 != v2:
                        sample_diffs.append({
                            'field': field,
                            'batch1_value': v1,
                            'batch2_value': v2,
                            'batch1_source': f"{s1.source_file} 行{s1.original_row_number}",
                            'batch2_source': f"{s2.source_file} 行{s2.original_row_number}"
                        })

                if sample_diffs:
                    diff_result['differences'].append({
                        'sample_id': sid,
                        'fields': sample_diffs
                    })

        return diff_result
