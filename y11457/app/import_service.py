import os
import zipfile
import tarfile
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from io import BytesIO, StringIO

from app.models import (
    DataSource, User, ImportBatch,
    LeaderRefund, WarehouseReview, UserRemark, ManualPriceAdjust,
    IssueType
)
from app.services import QueueService, FailedRecordService, OperationLogService
from app.config import settings


class ImportService:
    @staticmethod
    def _detect_file_type(file_path: str) -> str:
        if file_path.endswith('.zip'):
            return 'zip'
        if file_path.endswith(('.tar.gz', '.tgz', '.tar')):
            return 'tar'
        if file_path.endswith('.xlsx'):
            return 'xlsx'
        if file_path.endswith('.csv'):
            return 'csv'
        return 'unknown'

    @staticmethod
    def _extract_archive(file_path: str, extract_dir: str) -> List[str]:
        extracted_files = []
        file_type = ImportService._detect_file_type(file_path)

        if file_type == 'zip':
            with zipfile.ZipFile(file_path, 'r') as zf:
                zf.extractall(extract_dir)
                extracted_files = [os.path.join(extract_dir, f) for f in zf.namelist() if not f.endswith('/')]
        elif file_type == 'tar':
            mode = 'r:gz' if file_path.endswith('.tar.gz') or file_path.endswith('.tgz') else 'r'
            with tarfile.open(file_path, mode) as tf:
                tf.extractall(extract_dir)
                extracted_files = [os.path.join(extract_dir, m.name) for m in tf.getmembers() if m.isfile()]

        return extracted_files

    @staticmethod
    def _read_data_file(file_path: str) -> Optional[pd.DataFrame]:
        try:
            if file_path.endswith('.xlsx'):
                return pd.read_excel(file_path)
            elif file_path.endswith('.csv'):
                return pd.read_csv(file_path)
            return None
        except Exception as e:
            return None

    @staticmethod
    def _validate_leader_refund_row(row: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        required_fields = ['refund_no', 'order_no', 'leader_id', 'leader_name', 'city', 'refund_amount', 'issue_type', 'submitted_at']
        for field in required_fields:
            if field not in row or pd.isna(row.get(field)):
                return False, f"缺少必填字段: {field}"
        
        if not isinstance(row.get('refund_amount'), (int, float)) or row.get('refund_amount', 0) < 0:
            return False, "退款金额必须为非负数"
        
        return True, None

    @staticmethod
    def _validate_warehouse_review_row(row: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        required_fields = ['review_no', 'order_no', 'sku_code', 'sku_name', 'city', 'unit_price', 'issue_type', 'reviewer_id', 'reviewed_at']
        for field in required_fields:
            if field not in row or pd.isna(row.get(field)):
                return False, f"缺少必填字段: {field}"
        
        if row.get('shortage_qty', 0) == 0 and row.get('damaged_qty', 0) == 0:
            return False, "少发数量和坏品数量不能同时为0"
        
        return True, None

    @staticmethod
    def _validate_user_remark_row(row: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        required_fields = ['remark_no', 'order_no', 'user_id', 'user_name', 'city', 'content', 'issue_type', 'submitted_at']
        for field in required_fields:
            if field not in row or pd.isna(row.get(field)):
                return False, f"缺少必填字段: {field}"
        
        return True, None

    @staticmethod
    def _validate_manual_price_adjust_row(row: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        required_fields = ['adjust_no', 'order_no', 'city', 'original_price', 'adjusted_price', 'price_diff', 'reason', 'operator_id', 'operated_at']
        for field in required_fields:
            if field not in row or pd.isna(row.get(field)):
                return False, f"缺少必填字段: {field}"
        
        return True, None

    @staticmethod
    def _parse_issue_type(issue_str: str) -> IssueType:
        issue_map = {
            '少发': IssueType.SHORTAGE,
            'shortage': IssueType.SHORTAGE,
            '坏品': IssueType.DAMAGED,
            'damaged': IssueType.DAMAGED,
            'price': IssueType.WRONG_PRICE,
            '改价': IssueType.WRONG_PRICE,
            '价格': IssueType.WRONG_PRICE,
            '其他': IssueType.OTHER,
            'other': IssueType.OTHER
        }
        return issue_map.get(issue_str.lower(), IssueType.OTHER)

    @staticmethod
    def _parse_datetime(date_str: Any) -> datetime:
        if isinstance(date_str, datetime):
            return date_str
        if pd.isna(date_str):
            return datetime.now()
        try:
            return pd.to_datetime(date_str).to_pydatetime()
        except:
            return datetime.now()

    @staticmethod
    def import_leader_refunds(
        db: Session,
        df: pd.DataFrame,
        batch_no: str,
        operator: User,
        is_historical: bool = False
    ) -> Tuple[int, int]:
        success_count = 0
        failed_count = 0
        source_type = DataSource.HISTORICAL_IMPORT if is_historical else DataSource.LEADER_REFUND

        for _, row in df.iterrows():
            row_dict = row.to_dict()
            
            is_valid, error_msg = ImportService._validate_leader_refund_row(row_dict)
            if not is_valid:
                FailedRecordService.create(
                    db=db,
                    source_type=source_type,
                    source_table="leader_refunds",
                    source_data=row_dict,
                    batch_no=batch_no,
                    error_type="validation_error",
                    error_message=error_msg,
                    city=row_dict.get('city')
                )
                failed_count += 1
                continue

            try:
                existing = db.query(LeaderRefund).filter(
                    LeaderRefund.refund_no == str(row_dict['refund_no'])
                ).first()

                if existing:
                    FailedRecordService.create(
                        db=db,
                        source_type=source_type,
                        source_table="leader_refunds",
                        source_data=row_dict,
                        batch_no=batch_no,
                        error_type="duplicate_error",
                        error_message=f"退款单号已存在: {row_dict['refund_no']}",
                        city=row_dict.get('city')
                    )
                    failed_count += 1
                    continue

                issue_type = ImportService._parse_issue_type(str(row_dict.get('issue_type', '其他')))
                
                refund = LeaderRefund(
                    refund_no=str(row_dict['refund_no']),
                    order_no=str(row_dict['order_no']),
                    leader_id=str(row_dict['leader_id']),
                    leader_name=str(row_dict['leader_name']),
                    city=str(row_dict['city']),
                    refund_amount=float(row_dict['refund_amount']),
                    compensation_amount=float(row_dict.get('compensation_amount', row_dict.get('refund_amount', 0))),
                    issue_type=issue_type,
                    remark=str(row_dict.get('remark', '')) if not pd.isna(row_dict.get('remark')) else None,
                    submitted_at=ImportService._parse_datetime(row_dict['submitted_at']),
                    is_verified=bool(row_dict.get('is_verified', False)),
                    source=source_type,
                    batch_no=batch_no
                )
                db.add(refund)
                db.flush()

                if refund.is_verified:
                    QueueService.create_from_source(
                        db=db,
                        source_type=DataSource.LEADER_REFUND,
                        source_id=refund.id,
                        source_table="leader_refunds",
                        order_no=refund.order_no,
                        city=refund.city,
                        issue_type=refund.issue_type,
                        compensation_amount=refund.compensation_amount,
                        operator=operator,
                        batch_no=batch_no
                    )

                success_count += 1
            except Exception as e:
                FailedRecordService.create(
                    db=db,
                    source_type=source_type,
                    source_table="leader_refunds",
                    source_data=row_dict,
                    batch_no=batch_no,
                    error_type="import_error",
                    error_message=str(e),
                    city=row_dict.get('city')
                )
                failed_count += 1

        return success_count, failed_count

    @staticmethod
    def import_warehouse_reviews(
        db: Session,
        df: pd.DataFrame,
        batch_no: str,
        operator: User,
        is_historical: bool = False
    ) -> Tuple[int, int]:
        success_count = 0
        failed_count = 0
        source_type = DataSource.HISTORICAL_IMPORT if is_historical else DataSource.WAREHOUSE_REVIEW

        for _, row in df.iterrows():
            row_dict = row.to_dict()
            
            is_valid, error_msg = ImportService._validate_warehouse_review_row(row_dict)
            if not is_valid:
                FailedRecordService.create(
                    db=db,
                    source_type=source_type,
                    source_table="warehouse_reviews",
                    source_data=row_dict,
                    batch_no=batch_no,
                    error_type="validation_error",
                    error_message=error_msg,
                    city=row_dict.get('city')
                )
                failed_count += 1
                continue

            try:
                existing = db.query(WarehouseReview).filter(
                    WarehouseReview.review_no == str(row_dict['review_no'])
                ).first()

                if existing:
                    FailedRecordService.create(
                        db=db,
                        source_type=source_type,
                        source_table="warehouse_reviews",
                        source_data=row_dict,
                        batch_no=batch_no,
                        error_type="duplicate_error",
                        error_message=f"复核单号已存在: {row_dict['review_no']}",
                        city=row_dict.get('city')
                    )
                    failed_count += 1
                    continue

                issue_type = ImportService._parse_issue_type(str(row_dict.get('issue_type', '其他')))
                shortage_qty = int(row_dict.get('shortage_qty', 0))
                damaged_qty = int(row_dict.get('damaged_qty', 0))
                unit_price = float(row_dict['unit_price'])
                compensation_amount = (shortage_qty + damaged_qty) * unit_price

                review = WarehouseReview(
                    review_no=str(row_dict['review_no']),
                    order_no=str(row_dict['order_no']),
                    sku_code=str(row_dict['sku_code']),
                    sku_name=str(row_dict['sku_name']),
                    city=str(row_dict['city']),
                    shortage_qty=shortage_qty,
                    damaged_qty=damaged_qty,
                    unit_price=unit_price,
                    compensation_amount=float(row_dict.get('compensation_amount', compensation_amount)),
                    issue_type=issue_type,
                    reviewer_id=str(row_dict['reviewer_id']),
                    reviewed_at=ImportService._parse_datetime(row_dict['reviewed_at']),
                    is_verified=bool(row_dict.get('is_verified', False)),
                    source=source_type,
                    batch_no=batch_no
                )
                db.add(review)
                db.flush()

                if review.is_verified:
                    QueueService.create_from_source(
                        db=db,
                        source_type=DataSource.WAREHOUSE_REVIEW,
                        source_id=review.id,
                        source_table="warehouse_reviews",
                        order_no=review.order_no,
                        city=review.city,
                        issue_type=review.issue_type,
                        compensation_amount=review.compensation_amount,
                        operator=operator,
                        batch_no=batch_no
                    )

                success_count += 1
            except Exception as e:
                FailedRecordService.create(
                    db=db,
                    source_type=source_type,
                    source_table="warehouse_reviews",
                    source_data=row_dict,
                    batch_no=batch_no,
                    error_type="import_error",
                    error_message=str(e),
                    city=row_dict.get('city')
                )
                failed_count += 1

        return success_count, failed_count

    @staticmethod
    def import_user_remarks(
        db: Session,
        df: pd.DataFrame,
        batch_no: str,
        operator: User,
        is_historical: bool = False
    ) -> Tuple[int, int]:
        success_count = 0
        failed_count = 0
        source_type = DataSource.HISTORICAL_IMPORT if is_historical else DataSource.USER_REMARK

        for _, row in df.iterrows():
            row_dict = row.to_dict()
            
            is_valid, error_msg = ImportService._validate_user_remark_row(row_dict)
            if not is_valid:
                FailedRecordService.create(
                    db=db,
                    source_type=source_type,
                    source_table="user_remarks",
                    source_data=row_dict,
                    batch_no=batch_no,
                    error_type="validation_error",
                    error_message=error_msg,
                    city=row_dict.get('city')
                )
                failed_count += 1
                continue

            try:
                existing = db.query(UserRemark).filter(
                    UserRemark.remark_no == str(row_dict['remark_no'])
                ).first()

                if existing:
                    FailedRecordService.create(
                        db=db,
                        source_type=source_type,
                        source_table="user_remarks",
                        source_data=row_dict,
                        batch_no=batch_no,
                        error_type="duplicate_error",
                        error_message=f"备注单号已存在: {row_dict['remark_no']}",
                        city=row_dict.get('city')
                    )
                    failed_count += 1
                    continue

                issue_type = ImportService._parse_issue_type(str(row_dict.get('issue_type', '其他')))

                remark = UserRemark(
                    remark_no=str(row_dict['remark_no']),
                    order_no=str(row_dict['order_no']),
                    user_id=str(row_dict['user_id']),
                    user_name=str(row_dict['user_name']),
                    city=str(row_dict['city']),
                    content=str(row_dict['content']),
                    issue_type=issue_type,
                    compensation_amount=float(row_dict.get('compensation_amount', 0)),
                    submitted_at=ImportService._parse_datetime(row_dict['submitted_at']),
                    is_verified=bool(row_dict.get('is_verified', False)),
                    source=source_type,
                    batch_no=batch_no
                )
                db.add(remark)
                db.flush()

                if remark.is_verified:
                    QueueService.create_from_source(
                        db=db,
                        source_type=DataSource.USER_REMARK,
                        source_id=remark.id,
                        source_table="user_remarks",
                        order_no=remark.order_no,
                        city=remark.city,
                        issue_type=remark.issue_type,
                        compensation_amount=remark.compensation_amount,
                        operator=operator,
                        batch_no=batch_no
                    )

                success_count += 1
            except Exception as e:
                FailedRecordService.create(
                    db=db,
                    source_type=source_type,
                    source_table="user_remarks",
                    source_data=row_dict,
                    batch_no=batch_no,
                    error_type="import_error",
                    error_message=str(e),
                    city=row_dict.get('city')
                )
                failed_count += 1

        return success_count, failed_count

    @staticmethod
    def import_manual_price_adjusts(
        db: Session,
        df: pd.DataFrame,
        batch_no: str,
        operator: User,
        is_historical: bool = False
    ) -> Tuple[int, int]:
        success_count = 0
        failed_count = 0
        source_type = DataSource.HISTORICAL_IMPORT if is_historical else DataSource.MANUAL_PRICE_ADJUST

        for _, row in df.iterrows():
            row_dict = row.to_dict()
            
            is_valid, error_msg = ImportService._validate_manual_price_adjust_row(row_dict)
            if not is_valid:
                FailedRecordService.create(
                    db=db,
                    source_type=source_type,
                    source_table="manual_price_adjusts",
                    source_data=row_dict,
                    batch_no=batch_no,
                    error_type="validation_error",
                    error_message=error_msg,
                    city=row_dict.get('city')
                )
                failed_count += 1
                continue

            try:
                existing = db.query(ManualPriceAdjust).filter(
                    ManualPriceAdjust.adjust_no == str(row_dict['adjust_no'])
                ).first()

                if existing:
                    FailedRecordService.create(
                        db=db,
                        source_type=source_type,
                        source_table="manual_price_adjusts",
                        source_data=row_dict,
                        batch_no=batch_no,
                        error_type="duplicate_error",
                        error_message=f"改价单号已存在: {row_dict['adjust_no']}",
                        city=row_dict.get('city')
                    )
                    failed_count += 1
                    continue

                adjust = ManualPriceAdjust(
                    adjust_no=str(row_dict['adjust_no']),
                    order_no=str(row_dict['order_no']),
                    city=str(row_dict['city']),
                    original_price=float(row_dict['original_price']),
                    adjusted_price=float(row_dict['adjusted_price']),
                    price_diff=float(row_dict['price_diff']),
                    compensation_amount=float(row_dict.get('compensation_amount', abs(row_dict.get('price_diff', 0)))),
                    reason=str(row_dict['reason']),
                    operator_id=str(row_dict['operator_id']),
                    operated_at=ImportService._parse_datetime(row_dict['operated_at']),
                    is_verified=bool(row_dict.get('is_verified', False)),
                    source=source_type,
                    batch_no=batch_no
                )
                db.add(adjust)
                db.flush()

                if adjust.is_verified:
                    QueueService.create_from_source(
                        db=db,
                        source_type=DataSource.MANUAL_PRICE_ADJUST,
                        source_id=adjust.id,
                        source_table="manual_price_adjusts",
                        order_no=adjust.order_no,
                        city=adjust.city,
                        issue_type=IssueType.WRONG_PRICE,
                        compensation_amount=adjust.compensation_amount,
                        operator=operator,
                        batch_no=batch_no
                    )

                success_count += 1
            except Exception as e:
                FailedRecordService.create(
                    db=db,
                    source_type=source_type,
                    source_table="manual_price_adjusts",
                    source_data=row_dict,
                    batch_no=batch_no,
                    error_type="import_error",
                    error_message=str(e),
                    city=row_dict.get('city')
                )
                failed_count += 1

        return success_count, failed_count

    @staticmethod
    def import_file(
        db: Session,
        file_path: str,
        file_type: str,
        operator: User,
        is_historical: bool = False,
        city: Optional[str] = None
    ) -> Dict[str, Any]:
        batch_no = QueueService.generate_batch_no()
        extract_dir = os.path.join(settings.UPLOAD_DIR, 'extracted', batch_no)
        os.makedirs(extract_dir, exist_ok=True)

        total_success = 0
        total_failed = 0
        file_type_map = {
            'leader_refund': ImportService.import_leader_refunds,
            'warehouse_review': ImportService.import_warehouse_reviews,
            'user_remark': ImportService.import_user_remarks,
            'manual_price_adjust': ImportService.import_manual_price_adjusts
        }

        import_func = file_type_map.get(file_type)
        if not import_func:
            raise ValueError(f"不支持的文件类型: {file_type}")

        archive_type = ImportService._detect_file_type(file_path)
        
        if archive_type in ['zip', 'tar']:
            extracted_files = ImportService._extract_archive(file_path, extract_dir)
            
            for data_file in extracted_files:
                df = ImportService._read_data_file(data_file)
                if df is not None:
                    success, failed = import_func(db, df, batch_no, operator, is_historical)
                    total_success += success
                    total_failed += failed
        else:
            df = ImportService._read_data_file(file_path)
            if df is None:
                raise ValueError("无法读取数据文件")
            
            total_success, total_failed = import_func(db, df, batch_no, operator, is_historical)

        source_type_map = {
            'leader_refund': DataSource.HISTORICAL_IMPORT if is_historical else DataSource.LEADER_REFUND,
            'warehouse_review': DataSource.HISTORICAL_IMPORT if is_historical else DataSource.WAREHOUSE_REVIEW,
            'user_remark': DataSource.HISTORICAL_IMPORT if is_historical else DataSource.USER_REMARK,
            'manual_price_adjust': DataSource.HISTORICAL_IMPORT if is_historical else DataSource.MANUAL_PRICE_ADJUST
        }

        batch = ImportBatch(
            batch_no=batch_no,
            file_name=os.path.basename(file_path),
            source_type=source_type_map.get(file_type, DataSource.HISTORICAL_IMPORT),
            total_count=total_success + total_failed,
            success_count=total_success,
            failed_count=total_failed,
            imported_by=operator.id,
            city=city or operator.city,
            is_historical=is_historical
        )
        db.add(batch)
        db.commit()

        OperationLogService.log(
            db=db,
            user=operator,
            action="import_data",
            diff_data={
                "batch_no": batch_no,
                "file_type": file_type,
                "is_historical": is_historical,
                "success_count": total_success,
                "failed_count": total_failed
            }
        )

        return {
            "batch_no": batch_no,
            "total_count": total_success + total_failed,
            "success_count": total_success,
            "failed_count": total_failed
        }
