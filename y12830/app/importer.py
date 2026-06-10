import os
import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from .models import (
    ReagentBatch, Sample, SequencingResult, PedigreeMember,
    ImportRecord, ConflictRecord, ConflictType
)
from .utils import (
    calculate_file_hash, safe_str, safe_int, safe_float, parse_date,
    parse_gender, parse_affection, standardize_sample_id, is_excel_file,
    is_csv_file, clean_filename
)
from .database import db

class DataImporter:
    def __init__(self, db_session=None, upload_dir: str = None):
        self.db = db_session or db.session
        self.upload_dir = upload_dir
        self.column_mappings = {
            'sample': {
                'sample_id': ['样本编号', '样本ID', 'SampleID', 'Sample ID', 'sample_id', 'sample'],
                'name': ['姓名', '样本名称', 'Name', 'name'],
                'gender': ['性别', 'Gender', 'gender', 'Sex', 'sex'],
                'sample_type': ['样本类型', 'SampleType', 'sample_type', '类型'],
                'collection_date': ['采集日期', 'CollectionDate', 'collection_date', '采样日期'],
                'received_date': ['接收日期', 'ReceivedDate', 'received_date'],
                'status': ['状态', 'Status', 'status'],
                'notes': ['备注', 'Notes', 'notes', '说明'],
            },
            'sequencing': {
                'sample_id': ['样本编号', '样本ID', 'SampleID', 'Sample ID', 'sample_id', 'sample'],
                'sequencing_id': ['测序ID', 'SequencingID', 'sequencing_id', '测序编号'],
                'run_id': ['RunID', 'run_id', '批次号', '运行ID'],
                'panel': ['Panel', 'panel', '基因包', '捕获芯片'],
                'gene': ['基因', 'Gene', 'gene'],
                'variant': ['变异', 'Variant', 'variant', '突变'],
                'genotype': ['基因型', 'Genotype', 'genotype'],
                'chromosome': ['染色体', 'Chromosome', 'chr', 'Chr'],
                'position': ['位置', 'Position', 'position'],
                'reference': ['参考碱基', 'Reference', 'ref', 'Ref'],
                'alternate': ['变异碱基', 'Alternate', 'alt', 'Alt'],
                'quality_score': ['质量值', 'Quality', 'QUAL', 'quality'],
                'depth': ['深度', 'Depth', 'DP', 'depth'],
                'zygosity': ['杂合性', 'Zygosity', 'zygosity'],
                'interpretation': ['解读', 'Interpretation', 'interpretation'],
            },
            'pedigree': {
                'family_id': ['家系ID', 'FamilyID', 'family_id', '家系编号'],
                'individual_id': ['个体ID', 'IndividualID', 'individual_id', '样本ID', '样本编号'],
                'father_id': ['父亲ID', 'FatherID', 'father_id', '父亲编号'],
                'mother_id': ['母亲ID', 'MotherID', 'mother_id', '母亲编号'],
                'spouse_id': ['配偶ID', 'SpouseID', 'spouse_id'],
                'gender': ['性别', 'Gender', 'gender', 'Sex', 'sex'],
                'affection_status': ['患病状态', 'Affection', 'affection', '表型', 'Phenotype'],
                'relationship': ['关系', 'Relationship', 'relationship'],
                'generation': ['代次', 'Generation', 'generation'],
                'sample_id': ['关联样本ID', 'SampleID', 'sample_id'],
            }
        }

    def _detect_columns(self, df: pd.DataFrame, mapping_type: str) -> Dict[str, str]:
        mapping = self.column_mappings.get(mapping_type, {})
        detected = {}
        df_columns = {col.strip(): col for col in df.columns}
        for standard_name, possible_names in mapping.items():
            for name in possible_names:
                if name in df_columns:
                    detected[standard_name] = df_columns[name]
                    break
        return detected

    def _check_duplicate_import(self, file_hash: str, batch_number: str = None) -> Tuple[bool, Optional[ImportRecord]]:
        query = ImportRecord.query.filter_by(file_hash=file_hash)
        if batch_number:
            query = query.filter_by(batch_number=batch_number)
        existing = query.first()
        return existing is not None, existing

    def _read_file(self, filepath: str, sheet_name: Optional[str] = None) -> pd.DataFrame:
        if is_excel_file(filepath):
            if sheet_name:
                return pd.read_excel(filepath, sheet_name=sheet_name, dtype=str)
            else:
                return pd.read_excel(filepath, dtype=str)
        elif is_csv_file(filepath):
            return pd.read_csv(filepath, dtype=str, low_memory=False)
        else:
            raise ValueError(f"不支持的文件格式: {filepath}")

    def import_data(self, filepath: str, import_type: str, 
                    batch_number: str, sheet_name: Optional[str] = None,
                    user: str = None, source_notes: str = None,
                    skip_duplicate_check: bool = False) -> Dict:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"文件不存在: {filepath}")

        file_hash = calculate_file_hash(filepath)
        filename = os.path.basename(filepath)

        if not skip_duplicate_check:
            is_dup, existing = self._check_duplicate_import(file_hash, batch_number)
            if is_dup:
                conflict = ConflictRecord(
                    conflict_type=ConflictType.DUPLICATE_IMPORT,
                    severity='warning',
                    status='open',
                    message=f"文件已导入过: {filename} (导入时间: {existing.import_time})",
                    source_records={
                        'existing_import_id': existing.id,
                        'existing_import_time': existing.import_time.isoformat(),
                        'file_hash': file_hash,
                        'filename': filename
                    },
                    priority=2
                )
                self.db.add(conflict)
                return {
                    'success': False,
                    'duplicate': True,
                    'message': f'文件已在 {existing.import_time} 导入，导入ID: {existing.id}',
                    'existing_import': {
                        'id': existing.id,
                        'time': existing.import_time.isoformat(),
                        'imported_rows': existing.imported_rows
                    }
                }

        try:
            df = self._read_file(filepath, sheet_name)
        except Exception as e:
            return {
                'success': False,
                'error': f'读取文件失败: {str(e)}'
            }

        total_rows = len(df)
        imported_rows = 0
        skipped_rows = 0
        duplicate_rows = 0
        errors = []

        import_record = ImportRecord(
            file_name=filename,
            file_hash=file_hash,
            sheet_name=sheet_name,
            import_type=import_type,
            batch_number=batch_number,
            total_rows=total_rows,
            imported_rows=0,
            skipped_rows=0,
            duplicate_rows=0,
            user=user,
            source_notes=source_notes,
            status='in_progress'
        )
        self.db.add(import_record)
        self.db.flush()

        batch = ReagentBatch.query.filter_by(batch_number=batch_number).first()
        if not batch:
            batch = ReagentBatch(
                batch_number=batch_number,
                name=f"试剂批次 {batch_number}",
                source_file=filename,
                import_record_id=import_record.id,
                created_by=user
            )
            self.db.add(batch)
            self.db.flush()

        try:
            if import_type == 'sample':
                result = self._import_samples(df, batch, import_record, filename, sheet_name)
            elif import_type == 'sequencing':
                result = self._import_sequencing(df, batch, import_record, filename, sheet_name)
            elif import_type == 'pedigree':
                result = self._import_pedigree(df, batch, import_record, filename, sheet_name)
            else:
                raise ValueError(f"未知的导入类型: {import_type}")

            imported_rows = result.get('imported', 0)
            skipped_rows = result.get('skipped', 0)
            duplicate_rows = result.get('duplicates', 0)
            errors = result.get('errors', [])

            import_record.imported_rows = imported_rows
            import_record.skipped_rows = skipped_rows
            import_record.duplicate_rows = duplicate_rows
            import_record.status = 'completed'
            if errors:
                import_record.error_message = '; '.join(errors[:500])

            self.db.commit()

            return {
                'success': True,
                'duplicate': False,
                'import_record_id': import_record.id,
                'batch_id': batch.id,
                'batch_number': batch_number,
                'total_rows': total_rows,
                'imported_rows': imported_rows,
                'skipped_rows': skipped_rows,
                'duplicate_rows': duplicate_rows,
                'errors': errors,
                'summary': result.get('summary', {})
            }

        except Exception as e:
            self.db.rollback()
            import_record.status = 'failed'
            import_record.error_message = str(e)
            self.db.commit()
            return {
                'success': False,
                'error': f'导入失败: {str(e)}'
            }

    def _import_samples(self, df: pd.DataFrame, batch: ReagentBatch,
                        import_record: ImportRecord, filename: str,
                        sheet_name: Optional[str]) -> Dict:
        col_map = self._detect_columns(df, 'sample')
        if 'sample_id' not in col_map:
            return {'imported': 0, 'skipped': len(df), 'duplicates': 0, 
                    'errors': ['未找到样本ID列'], 'summary': {}}

        imported = 0
        skipped = 0
        duplicates = 0
        errors = []
        summary = {'by_gender': {}, 'by_type': {}}

        existing_sample_ids = {s.sample_id for s in 
                              Sample.query.filter_by(batch_id=batch.id).all()}

        for idx, row in df.iterrows():
            original_row = idx + 2
            raw_sample_id = row.get(col_map['sample_id'])
            sample_id = standardize_sample_id(raw_sample_id)

            if not sample_id:
                skipped += 1
                errors.append(f"行{original_row}: 样本ID为空")
                continue

            if sample_id in existing_sample_ids:
                duplicates += 1
                self._create_conflict(
                    batch, ConflictType.DUPLICATE_IMPORT,
                    f"样本ID重复: {sample_id}",
                    {'original_row': original_row, 'sample_id': sample_id,
                     'source_file': filename, 'source_sheet': sheet_name},
                    severity='warning', priority=2
                )
                continue

            try:
                gender = parse_gender(row.get(col_map.get('gender', ''))) if col_map.get('gender') else None
                sample = Sample(
                    sample_id=sample_id,
                    batch_id=batch.id,
                    original_row_number=original_row,
                    source_file=filename,
                    source_sheet=sheet_name,
                    import_record_id=import_record.id,
                    name=safe_str(row.get(col_map.get('name', ''))),
                    gender=gender,
                    sample_type=safe_str(row.get(col_map.get('sample_type', ''))),
                    collection_date=parse_date(row.get(col_map.get('collection_date', ''))),
                    received_date=parse_date(row.get(col_map.get('received_date', ''))),
                    status=safe_str(row.get(col_map.get('status', ''))),
                    notes=safe_str(row.get(col_map.get('notes', ''))),
                    raw_data=row.to_dict()
                )
                self.db.add(sample)
                imported += 1
                existing_sample_ids.add(sample_id)

                if gender:
                    summary['by_gender'][gender] = summary['by_gender'].get(gender, 0) + 1
                if sample.sample_type:
                    summary['by_type'][sample.sample_type] = summary['by_type'].get(sample.sample_type, 0) + 1

            except Exception as e:
                skipped += 1
                errors.append(f"行{original_row}: {str(e)}")

        self.db.flush()
        return {
            'imported': imported,
            'skipped': skipped,
            'duplicates': duplicates,
            'errors': errors,
            'summary': summary
        }

    def _import_sequencing(self, df: pd.DataFrame, batch: ReagentBatch,
                           import_record: ImportRecord, filename: str,
                           sheet_name: Optional[str]) -> Dict:
        col_map = self._detect_columns(df, 'sequencing')
        if 'sample_id' not in col_map:
            return {'imported': 0, 'skipped': len(df), 'duplicates': 0,
                    'errors': ['未找到样本ID列'], 'summary': {}}

        imported = 0
        skipped = 0
        duplicates = 0
        errors = []
        summary = {'by_gene': {}, 'by_chromosome': {}, 'sample_mismatch': []}

        sample_map = {s.sample_id: s.id for s in 
                      Sample.query.filter_by(batch_id=batch.id).all()}

        for idx, row in df.iterrows():
            original_row = idx + 2
            raw_sample_id = row.get(col_map['sample_id'])
            sample_id = standardize_sample_id(raw_sample_id)

            if not sample_id:
                skipped += 1
                errors.append(f"行{original_row}: 样本ID为空")
                continue

            if sample_id not in sample_map:
                skipped += 1
                summary['sample_mismatch'].append({'sample_id': sample_id, 'row': original_row})
                self._create_conflict(
                    batch, ConflictType.SAMPLE_MISMATCH,
                    f"测序结果中的样本ID在样本清单中不存在: {sample_id}",
                    {'original_row': original_row, 'sample_id': sample_id,
                     'sequencing_id': safe_str(row.get(col_map.get('sequencing_id', ''))),
                     'source_file': filename, 'source_sheet': sheet_name},
                    severity='error', priority=3
                )
                continue

            sample_db_id = sample_map[sample_id]

            try:
                seq_result = SequencingResult(
                    sample_id=sample_db_id,
                    original_row_number=original_row,
                    source_file=filename,
                    source_sheet=sheet_name,
                    import_record_id=import_record.id,
                    sequencing_id=safe_str(row.get(col_map.get('sequencing_id', ''))),
                    run_id=safe_str(row.get(col_map.get('run_id', ''))),
                    panel=safe_str(row.get(col_map.get('panel', ''))),
                    gene=safe_str(row.get(col_map.get('gene', ''))),
                    variant=safe_str(row.get(col_map.get('variant', ''))),
                    genotype=safe_str(row.get(col_map.get('genotype', ''))),
                    chromosome=safe_str(row.get(col_map.get('chromosome', ''))),
                    position=safe_int(row.get(col_map.get('position', ''))),
                    reference=safe_str(row.get(col_map.get('reference', ''))),
                    alternate=safe_str(row.get(col_map.get('alternate', ''))),
                    quality_score=safe_float(row.get(col_map.get('quality_score', ''))),
                    depth=safe_int(row.get(col_map.get('depth', ''))),
                    zygosity=safe_str(row.get(col_map.get('zygosity', ''))),
                    interpretation=safe_str(row.get(col_map.get('interpretation', ''))),
                    raw_data=row.to_dict()
                )
                self.db.add(seq_result)
                imported += 1

                gene = seq_result.gene or 'Unknown'
                chr_ = seq_result.chromosome or 'Unknown'
                summary['by_gene'][gene] = summary['by_gene'].get(gene, 0) + 1
                summary['by_chromosome'][chr_] = summary['by_chromosome'].get(chr_, 0) + 1

            except Exception as e:
                skipped += 1
                errors.append(f"行{original_row}: {str(e)}")

        self.db.flush()
        summary['mismatch_count'] = len(summary['sample_mismatch'])
        return {
            'imported': imported,
            'skipped': skipped,
            'duplicates': duplicates,
            'errors': errors,
            'summary': summary
        }

    def _import_pedigree(self, df: pd.DataFrame, batch: ReagentBatch,
                         import_record: ImportRecord, filename: str,
                         sheet_name: Optional[str]) -> Dict:
        col_map = self._detect_columns(df, 'pedigree')
        if 'individual_id' not in col_map:
            return {'imported': 0, 'skipped': len(df), 'duplicates': 0,
                    'errors': ['未找到个体ID列'], 'summary': {}}

        imported = 0
        skipped = 0
        duplicates = 0
        errors = []
        summary = {'by_gender': {}, 'by_affection': {}, 'by_relationship': {}}

        sample_map = {s.sample_id: s.id for s in
                      Sample.query.filter_by(batch_id=batch.id).all()}

        seen_individuals = set()

        for idx, row in df.iterrows():
            original_row = idx + 2
            individual_id = standardize_sample_id(row.get(col_map['individual_id']))
            family_id = safe_str(row.get(col_map.get('family_id', '')))

            if not individual_id:
                skipped += 1
                errors.append(f"行{original_row}: 个体ID为空")
                continue

            key = (family_id, individual_id)
            if key in seen_individuals:
                duplicates += 1
                self._create_conflict(
                    batch, ConflictType.DUPLICATE_IMPORT,
                    f"家系成员重复: {family_id}-{individual_id}",
                    {'original_row': original_row, 'family_id': family_id,
                     'individual_id': individual_id,
                     'source_file': filename, 'source_sheet': sheet_name},
                    severity='warning', priority=2
                )
                continue
            seen_individuals.add(key)

            raw_sample_id = row.get(col_map.get('sample_id', ''))
            sample_id = standardize_sample_id(raw_sample_id) if raw_sample_id else None
            sample_db_id = sample_map.get(sample_id) if sample_id else None

            if sample_id and not sample_db_id:
                self._create_conflict(
                    batch, ConflictType.SAMPLE_MISMATCH,
                    f"家系成员关联的样本ID不存在: {sample_id}",
                    {'original_row': original_row, 'individual_id': individual_id,
                     'sample_id': sample_id, 'family_id': family_id},
                    severity='warning', priority=2
                )

            try:
                gender = parse_gender(row.get(col_map.get('gender', ''))) if col_map.get('gender') else None
                affection = parse_affection(row.get(col_map.get('affection_status', ''))) if col_map.get('affection_status') else None

                member = PedigreeMember(
                    sample_id=sample_db_id,
                    family_id=family_id,
                    individual_id=individual_id,
                    father_id=standardize_sample_id(row.get(col_map.get('father_id', ''))),
                    mother_id=standardize_sample_id(row.get(col_map.get('mother_id', ''))),
                    spouse_id=standardize_sample_id(row.get(col_map.get('spouse_id', ''))),
                    gender=gender,
                    affection_status=affection,
                    relationship=safe_str(row.get(col_map.get('relationship', ''))),
                    generation=safe_int(row.get(col_map.get('generation', ''))),
                    original_row_number=original_row,
                    source_file=filename,
                    import_record_id=import_record.id,
                    raw_data=row.to_dict()
                )
                self.db.add(member)
                imported += 1

                if gender:
                    summary['by_gender'][gender] = summary['by_gender'].get(gender, 0) + 1
                if affection:
                    summary['by_affection'][affection] = summary['by_affection'].get(affection, 0) + 1
                if member.relationship:
                    summary['by_relationship'][member.relationship] = summary['by_relationship'].get(member.relationship, 0) + 1

            except Exception as e:
                skipped += 1
                errors.append(f"行{original_row}: {str(e)}")

        self.db.flush()
        return {
            'imported': imported,
            'skipped': skipped,
            'duplicates': duplicates,
            'errors': errors,
            'summary': summary
        }

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

    def get_import_history(self, batch_number: str = None) -> List[ImportRecord]:
        query = ImportRecord.query.order_by(ImportRecord.import_time.desc())
        if batch_number:
            query = query.filter_by(batch_number=batch_number)
        return query.all()

    def get_available_sheets(self, filepath: str) -> List[str]:
        if is_excel_file(filepath):
            xls = pd.ExcelFile(filepath)
            return xls.sheet_names
        return []
