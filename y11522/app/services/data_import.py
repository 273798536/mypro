import json
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
import pandas as pd

from app.models.raw_data import RawDataImport, RawDataRecord
from app.models.enums import DataSourceType, ReviewType
from app.schemas.raw_data import ImportResult, RawDataRecordCreate


class DataImportService:
    def __init__(self, db: Session):
        self.db = db

    def _parse_appointment(self, row: Dict[str, Any], row_num: int) -> RawDataRecordCreate:
        appointment_no = str(row.get("预约单号", row.get("appointment_no", f"unknown_{row_num}")))
        parsed = {
            "appointment_no": appointment_no,
            "order_no": str(row.get("订单号", row.get("order_no", ""))),
            "user_id": str(row.get("用户ID", row.get("user_id", ""))),
            "technician_id": str(row.get("师傅ID", row.get("technician_id", ""))),
            "region": str(row.get("区域", row.get("region", ""))),
            "is_rescheduled": 1 if str(row.get("是否改约", row.get("is_rescheduled", "否"))) in ["是", "1", "True", "true"] else 0,
            "is_second_visit": 1 if str(row.get("是否二次上门", row.get("is_second_visit", "否"))) in ["是", "1", "True", "true"] else 0,
        }

        appointment_time_str = row.get("预约时间", row.get("appointment_time"))
        appointment_time = None
        if appointment_time_str:
            try:
                appointment_time = pd.to_datetime(appointment_time_str).to_pydatetime()
            except Exception:
                pass

        return RawDataRecordCreate(
            import_id=0,
            source_type=DataSourceType.APPOINTMENT,
            source_file="",
            original_row_number=row_num,
            original_data={k: str(v) for k, v in row.items()},
            parsed_data=parsed,
            appointment_no=appointment_no,
            order_no=parsed["order_no"],
            user_id=parsed["user_id"],
            technician_id=parsed["technician_id"],
            region=parsed["region"],
            appointment_time=appointment_time,
            is_rescheduled=parsed["is_rescheduled"],
            is_second_visit=parsed["is_second_visit"],
        )

    def _parse_technician_location(self, row: Dict[str, Any], row_num: int) -> RawDataRecordCreate:
        appointment_no = str(row.get("预约单号", row.get("appointment_no", f"unknown_{row_num}")))
        parsed = {
            "appointment_no": appointment_no,
            "technician_id": str(row.get("师傅ID", row.get("technician_id", ""))),
            "region": str(row.get("区域", row.get("region", ""))),
            "location": str(row.get("定位地点", row.get("location", ""))),
        }

        return RawDataRecordCreate(
            import_id=0,
            source_type=DataSourceType.TECHNICIAN_LOCATION,
            source_file="",
            original_row_number=row_num,
            original_data={k: str(v) for k, v in row.items()},
            parsed_data=parsed,
            appointment_no=appointment_no,
            technician_id=parsed["technician_id"],
            region=parsed["region"],
        )

    def _parse_user_review(self, row: Dict[str, Any], row_num: int) -> RawDataRecordCreate:
        appointment_no = str(row.get("预约单号", row.get("appointment_no", f"unknown_{row_num}")))
        review_type_str = str(row.get("评价类型", row.get("review_type", "neutral")))
        if review_type_str in ["好评", "positive", "1"]:
            review_type = ReviewType.POSITIVE
        elif review_type_str in ["差评", "negative", "-1"]:
            review_type = ReviewType.NEGATIVE
        else:
            review_type = ReviewType.NEUTRAL

        parsed = {
            "appointment_no": appointment_no,
            "order_no": str(row.get("订单号", row.get("order_no", ""))),
            "user_id": str(row.get("用户ID", row.get("user_id", ""))),
            "review_type": review_type,
            "review_reason": str(row.get("差评原因", row.get("review_reason", ""))),
        }

        return RawDataRecordCreate(
            import_id=0,
            source_type=DataSourceType.USER_REVIEW,
            source_file="",
            original_row_number=row_num,
            original_data={k: str(v) for k, v in row.items()},
            parsed_data=parsed,
            appointment_no=appointment_no,
            order_no=parsed["order_no"],
            user_id=parsed["user_id"],
            review_type=review_type,
            review_content=str(row.get("评价内容", row.get("review_content", ""))),
        )

    def _parse_refund_flow(self, row: Dict[str, Any], row_num: int) -> RawDataRecordCreate:
        order_no = str(row.get("订单号", row.get("order_no", f"unknown_{row_num}")))
        refund_amount = row.get("退款金额", row.get("refund_amount", 0))
        try:
            refund_amount = int(float(refund_amount))
        except Exception:
            refund_amount = 0

        parsed = {
            "order_no": order_no,
            "appointment_no": str(row.get("预约单号", row.get("appointment_no", ""))),
            "user_id": str(row.get("用户ID", row.get("user_id", ""))),
            "refund_amount": refund_amount,
            "refund_reason": str(row.get("退款原因", row.get("refund_reason", ""))),
        }

        return RawDataRecordCreate(
            import_id=0,
            source_type=DataSourceType.REFUND_FLOW,
            source_file="",
            original_row_number=row_num,
            original_data={k: str(v) for k, v in row.items()},
            parsed_data=parsed,
            appointment_no=parsed["appointment_no"],
            order_no=order_no,
            user_id=parsed["user_id"],
            refund_amount=refund_amount,
        )

    def _parse_row(self, row: Dict[str, Any], row_num: int, source_type: DataSourceType) -> RawDataRecordCreate:
        parsers = {
            DataSourceType.APPOINTMENT: self._parse_appointment,
            DataSourceType.TECHNICIAN_LOCATION: self._parse_technician_location,
            DataSourceType.USER_REVIEW: self._parse_user_review,
            DataSourceType.REFUND_FLOW: self._parse_refund_flow,
        }
        return parsers[source_type](row, row_num)

    def import_from_file(
        self,
        file_path: str,
        source_type: DataSourceType,
        imported_by: Optional[str] = None,
    ) -> ImportResult:
        if file_path.endswith(".xlsx") or file_path.endswith(".xls"):
            df = pd.read_excel(file_path)
        elif file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        else:
            raise ValueError(f"不支持的文件格式: {file_path}")

        df = df.where(pd.notnull(df), None)
        rows = df.to_dict("records")

        import_record = RawDataImport(
            source_file=file_path,
            source_type=source_type,
            total_rows=len(rows),
            imported_by=imported_by,
        )
        self.db.add(import_record)
        self.db.flush()

        success_count = 0
        errors = []

        for idx, row in enumerate(rows, start=1):
            try:
                record_data = self._parse_row(row, idx, source_type)
                record_data.import_id = import_record.id
                record_data.source_file = file_path

                db_record = RawDataRecord(**record_data.model_dump())
                self.db.add(db_record)
                success_count += 1
            except Exception as e:
                errors.append(f"第{idx}行解析失败: {str(e)}")

        import_record.total_rows = success_count + len(errors)
        self.db.commit()

        return ImportResult(
            import_id=import_record.id,
            source_file=file_path,
            source_type=source_type,
            total_rows=len(rows),
            success_rows=success_count,
            failed_rows=len(errors),
            errors=errors,
        )

    def import_from_data(
        self,
        data: List[Dict[str, Any]],
        source_type: DataSourceType,
        source_file: str,
        imported_by: Optional[str] = None,
    ) -> ImportResult:
        import_record = RawDataImport(
            source_file=source_file,
            source_type=source_type,
            total_rows=len(data),
            imported_by=imported_by,
        )
        self.db.add(import_record)
        self.db.flush()

        success_count = 0
        errors = []

        for idx, row in enumerate(data, start=1):
            try:
                record_data = self._parse_row(row, idx, source_type)
                record_data.import_id = import_record.id
                record_data.source_file = source_file

                db_record = RawDataRecord(**record_data.model_dump())
                self.db.add(db_record)
                success_count += 1
            except Exception as e:
                errors.append(f"第{idx}行解析失败: {str(e)}")

        import_record.total_rows = success_count + len(errors)
        self.db.commit()

        return ImportResult(
            import_id=import_record.id,
            source_file=source_file,
            source_type=source_type,
            total_rows=len(data),
            success_rows=success_count,
            failed_rows=len(errors),
            errors=errors,
        )
