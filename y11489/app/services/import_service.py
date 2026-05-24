import os
import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple, Optional
from datetime import datetime
import pandas as pd
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException, status

from app.config import settings
from app.models.import_source import ImportSource
from app.models.inspection import InspectionRecord
from app.models.rework import ReworkOrder
from app.models.machine_shift import MachineShift
from app.models.price_adjustment import PriceAdjustment
from app.models.states import RecordStatus
from app.models.user import User
from app.schemas.import_source import ImportResult, ImportRowError
from app.services.audit import AuditService


class ImportService:
    IMPORT_TYPES = {
        "inspection": InspectionRecord,
        "rework": ReworkOrder,
        "shift": MachineShift,
        "price": PriceAdjustment,
    }

    @staticmethod
    def _save_uploaded_file(file: UploadFile, import_type: str) -> Tuple[str, str]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{import_type}_{timestamp}_{file.filename}"
        file_path = settings.UPLOAD_DIR / filename
        
        content = file.file.read()
        file_hash = hashlib.md5(content).hexdigest()
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        return str(file_path), file_hash

    @staticmethod
    def _read_excel_file(file_path: str) -> pd.DataFrame:
        try:
            df = pd.read_excel(file_path)
            return df
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read Excel file: {str(e)}"
            )

    @staticmethod
    def _parse_inspection_row(row: Dict[str, Any], row_num: int) -> Optional[InspectionRecord]:
        try:
            record = InspectionRecord(
                batch_no=str(row.get("批次号", row.get("batch_no", ""))),
                product_code=str(row.get("产品代码", row.get("product_code", ""))),
                product_name=str(row.get("产品名称", row.get("product_name", ""))),
                machine_id=str(row.get("机台号", row.get("machine_id", ""))),
                sample_size=int(row.get("抽检数量", row.get("sample_size", 0)) or 0),
                defect_count=int(row.get("不良数量", row.get("defect_count", 0)) or 0),
                pass_count=int(row.get("合格数量", row.get("pass_count", 0)) or 0),
                yield_rate=float(row.get("良率", row.get("yield_rate", 0)) or 0),
                defect_type=str(row.get("不良类型", row.get("defect_type", ""))),
                defect_description=str(row.get("不良描述", row.get("defect_description", ""))),
                judge_result=str(row.get("判定结果", row.get("judge_result", ""))),
                status=RecordStatus.DRAFT,
                version=1,
                original_yield_rate=float(row.get("良率", row.get("yield_rate", 0)) or 0),
                original_defect_count=int(row.get("不良数量", row.get("defect_count", 0)) or 0),
            )
            return record
        except Exception as e:
            raise ValueError(f"Row parse error: {str(e)}")

    @staticmethod
    def _parse_rework_row(row: Dict[str, Any], row_num: int) -> Optional[ReworkOrder]:
        try:
            record = ReworkOrder(
                rework_no=str(row.get("返工单号", row.get("rework_no", f"RW_{row_num}"))),
                batch_no=str(row.get("批次号", row.get("batch_no", ""))),
                product_code=str(row.get("产品代码", row.get("product_code", ""))),
                product_name=str(row.get("产品名称", row.get("product_name", ""))),
                rework_reason=str(row.get("返工原因", row.get("rework_reason", ""))),
                defect_type=str(row.get("不良类型", row.get("defect_type", ""))),
                rework_count=int(row.get("返工数量", row.get("rework_count", 0)) or 0),
                rework_pass_count=int(row.get("返工合格数", row.get("rework_pass_count", 0)) or 0),
                rework_fail_count=int(row.get("返工不合格数", row.get("rework_fail_count", 0)) or 0),
                rework_times=int(row.get("返工次数", row.get("rework_times", 1)) or 1),
                final_yield_rate=str(row.get("最终良率", row.get("final_yield_rate", ""))),
                status=RecordStatus.DRAFT,
                version=1,
            )
            return record
        except Exception as e:
            raise ValueError(f"Row parse error: {str(e)}")

    @staticmethod
    def _parse_shift_row(row: Dict[str, Any], row_num: int) -> Optional[MachineShift]:
        try:
            shift_date = row.get("班次日期", row.get("shift_date"))
            if isinstance(shift_date, str):
                shift_date = datetime.strptime(shift_date, "%Y-%m-%d").date()
            elif pd.isna(shift_date):
                shift_date = datetime.now().date()

            record = MachineShift(
                machine_id=str(row.get("机台号", row.get("machine_id", ""))),
                shift_name=str(row.get("班次名称", row.get("shift_name", ""))),
                shift_date=shift_date,
                total_output=int(row.get("总产量", row.get("total_output", 0)) or 0),
                defect_output=int(row.get("不良产量", row.get("defect_output", 0)) or 0),
                rework_count=int(row.get("返工数量", row.get("rework_count", 0)) or 0),
            )
            return record
        except Exception as e:
            raise ValueError(f"Row parse error: {str(e)}")

    @staticmethod
    def _parse_price_row(row: Dict[str, Any], row_num: int) -> Optional[PriceAdjustment]:
        try:
            record = PriceAdjustment(
                adjustment_no=str(row.get("改价单号", row.get("adjustment_no", f"ADJ_{row_num}"))),
                batch_no=str(row.get("批次号", row.get("batch_no", ""))),
                product_code=str(row.get("产品代码", row.get("product_code", ""))),
                product_name=str(row.get("产品名称", row.get("product_name", ""))),
                original_price=float(row.get("原价", row.get("original_price", 0)) or 0),
                adjusted_price=float(row.get("改后价", row.get("adjusted_price", 0)) or 0),
                price_difference=float(row.get("差价", row.get("price_difference", 0)) or 0),
                adjustment_reason=str(row.get("改价原因", row.get("adjustment_reason", ""))),
                adjustment_type=str(row.get("改价类型", row.get("adjustment_type", ""))),
                status=RecordStatus.DRAFT,
                version=1,
            )
            return record
        except Exception as e:
            raise ValueError(f"Row parse error: {str(e)}")

    @staticmethod
    def import_file(
        db: Session,
        file: UploadFile,
        import_type: str,
        user: User,
    ) -> ImportResult:
        if import_type not in ImportService.IMPORT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported import type: {import_type}"
            )

        file_path, file_hash = ImportService._save_uploaded_file(file, import_type)
        df = ImportService._read_excel_file(file_path)

        import_source = ImportSource(
            source_filename=file.filename,
            file_hash=file_hash,
            import_type=import_type,
            uploaded_by=user.id,
            total_rows=len(df),
            file_path=file_path,
        )
        db.add(import_source)
        db.commit()
        db.refresh(import_source)

        success_count = 0
        failed_count = 0
        errors: List[ImportRowError] = []
        warnings: List[str] = []

        parse_func = {
            "inspection": ImportService._parse_inspection_row,
            "rework": ImportService._parse_rework_row,
            "shift": ImportService._parse_shift_row,
            "price": ImportService._parse_price_row,
        }[import_type]

        for idx, row in df.iterrows():
            row_num = idx + 2
            row_dict = row.to_dict()
            
            try:
                record = parse_func(row_dict, row_num)
                record.import_source_id = import_source.id
                record.original_row_number = row_num
                record.raw_data = json.dumps(row_dict, ensure_ascii=False)
                record.created_by = user.id
                
                db.add(record)
                success_count += 1
                
            except Exception as e:
                failed_count += 1
                errors.append(ImportRowError(
                    row_number=row_num,
                    error=str(e),
                    data={k: str(v) for k, v in row_dict.items()},
                ))

        import_source.success_count = success_count
        import_source.failed_count = failed_count
        if errors:
            import_source.error_log = json.dumps([e.model_dump() for e in errors[:10]], ensure_ascii=False)

        db.commit()

        AuditService.log_action(
            db=db,
            action=f"import_{import_type}",
            entity_type="import_source",
            entity_id=import_source.id,
            user=user,
            new_values={
                "filename": file.filename,
                "total_rows": len(df),
                "success_count": success_count,
                "failed_count": failed_count,
            },
        )

        return ImportResult(
            import_source_id=import_source.id,
            total_rows=len(df),
            success_count=success_count,
            failed_count=failed_count,
            errors=errors,
            warnings=warnings,
        )
