import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple
import pandas as pd

from lease_audit.models.database import (
    get_session, ImportBatch, ImportRecord, ImportFailure,
    EquipmentLease, ReturnRecord, ReturnItem, ReturnPhoto,
    RepairEstimate, StoreHandover, OperationLog
)
from lease_audit.utils.common import (
    generate_batch_no, generate_file_hash, generate_hash,
    json_dumps, safe_str, safe_float, safe_int, parse_date, get_current_user
)


class ImportService:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.session = get_session(db_path)
    
    def import_file(
        self,
        source_type: str,
        file_path: str,
        sheet_name: str = None,
        dry_run: bool = False,
        skip_duplicate_check: bool = False
    ) -> Dict[str, Any]:
        file_path = str(Path(file_path).resolve())
        file_name = Path(file_path).name
        file_hash = generate_file_hash(file_path)
        
        if not skip_duplicate_check and self._is_file_imported(file_hash):
            raise ValueError(f"文件已导入过 (hash: {file_hash[:16]}...)")
        
        df = self._read_file(file_path, sheet_name)
        batch_no = generate_batch_no(source_type)
        
        batch = ImportBatch(
            batch_no=batch_no,
            source_type=source_type,
            file_name=file_name,
            file_hash=file_hash,
            imported_by=get_current_user(),
            total_records=len(df),
            status="processing"
        )
        
        if not dry_run:
            self.session.add(batch)
            self.session.flush()
        
        success_count = 0
        duplicate_count = 0
        failed_count = 0
        failures = []
        
        for idx, row in df.iterrows():
            row_no = idx + 2
            try:
                row_dict = row.to_dict()
                data_hash = generate_hash(json_dumps(row_dict))
                
                if not skip_duplicate_check and self._is_data_duplicate(source_type, data_hash):
                    duplicate_count += 1
                    continue
                
                if not dry_run:
                    record = ImportRecord(
                        batch_id=batch.id,
                        source_type=source_type,
                        original_row_no=row_no,
                        data_json=json_dumps(row_dict),
                        data_hash=data_hash,
                        is_valid=True,
                        is_duplicate=False
                    )
                    self.session.add(record)
                    self.session.flush()
                    
                    self._process_source_data(source_type, row_dict, record.id)
                    success_count += 1
                else:
                    success_count += 1
                    
            except Exception as e:
                failed_count += 1
                error_msg = str(e)
                
                if not dry_run:
                    failure = ImportFailure(
                        batch_id=batch.id,
                        original_row_no=row_no,
                        error_type=type(e).__name__,
                        error_message=error_msg,
                        original_data=json_dumps(row_dict) if "row_dict" in locals() else ""
                    )
                    self.session.add(failure)
                
                failures.append({
                    "row_no": row_no,
                    "error": error_msg,
                    "type": type(e).__name__
                })
        
        if not dry_run:
            batch.success_count = success_count
            batch.failed_count = failed_count
            batch.status = "completed" if failed_count == 0 else "completed_with_errors"
            
            self._log_operation(
                "import", "ImportBatch", batch.id,
                f"导入{source_type}: {file_name}, 成功{success_count}, 失败{failed_count}"
            )
            self.session.commit()
        
        return {
            "batch_no": batch_no,
            "total": len(df),
            "success": success_count,
            "duplicates": duplicate_count,
            "failed": failed_count,
            "failures": failures,
            "dry_run": dry_run
        }
    
    def _read_file(self, file_path: str, sheet_name: str = None) -> pd.DataFrame:
        ext = Path(file_path).suffix.lower()
        if ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path, sheet_name=sheet_name or 0)
        elif ext == '.csv':
            df = pd.read_csv(file_path)
        elif ext == '.json':
            df = pd.read_json(file_path)
        else:
            raise ValueError(f"不支持的文件格式: {ext}")
        
        df = df.astype(object).where(pd.notnull(df), None)
        return df
    
    def _is_file_imported(self, file_hash: str) -> bool:
        return self.session.query(ImportBatch).filter_by(file_hash=file_hash).first() is not None
    
    def _is_data_duplicate(self, source_type: str, data_hash: str) -> bool:
        return self.session.query(ImportRecord).filter_by(
            source_type=source_type,
            data_hash=data_hash
        ).first() is not None
    
    def _process_source_data(self, source_type: str, row: Dict[str, Any], record_id: int):
        processors = {
            "lease": self._process_lease,
            "return": self._process_return,
            "photo": self._process_photo,
            "repair": self._process_repair,
            "handover": self._process_handover
        }
        
        processor = processors.get(source_type)
        if not processor:
            raise ValueError(f"未知的数据源类型: {source_type}")
        
        processor(row, record_id)
    
    def _process_lease(self, row: Dict[str, Any], record_id: int):
        lease_no = self._get_value(row, ["租赁单号", "lease_no", "出库单号", "outbound_no"])
        if not lease_no:
            raise ValueError("缺少租赁单号")
        
        existing = self.session.query(EquipmentLease).filter_by(lease_no=lease_no).first()
        if existing:
            raise ValueError(f"租赁单号已存在: {lease_no}")
        
        lease = EquipmentLease(
            import_record_id=record_id,
            lease_no=lease_no,
            customer_name=self._get_value(row, ["客户名称", "customer_name", "客户"]),
            customer_phone=self._get_value(row, ["客户电话", "customer_phone", "联系电话"]),
            equipment_name=self._get_value(row, ["设备名称", "equipment_name", "设备"]),
            equipment_model=self._get_value(row, ["设备型号", "equipment_model", "型号"]),
            serial_no=self._get_value(row, ["序列号", "serial_no", "机身号"]),
            lease_start_date=parse_date(self._get_value(row, ["租赁开始日期", "lease_start_date", "出库日期"])),
            expected_return_date=parse_date(self._get_value(row, ["预计归还日期", "expected_return_date"])),
            deposit_amount=safe_float(self._get_value(row, ["押金金额", "deposit_amount", "押金"])),
            monthly_rent=safe_float(self._get_value(row, ["月租金", "monthly_rent", "租金"])),
            status="active"
        )
        self.session.add(lease)
    
    def _process_return(self, row: Dict[str, Any], record_id: int):
        return_no = self._get_value(row, ["归还单号", "return_no", "入库单号"])
        if not return_no:
            raise ValueError("缺少归还单号")
        
        existing = self.session.query(ReturnRecord).filter_by(return_no=return_no).first()
        if existing:
            raise ValueError(f"归还单号已存在: {return_no}")
        
        lease_no = self._get_value(row, ["租赁单号", "lease_no", "关联单号"])
        lease = self.session.query(EquipmentLease).filter_by(lease_no=lease_no).first() if lease_no else None
        
        return_record = ReturnRecord(
            import_record_id=record_id,
            lease_id=lease.id if lease else None,
            return_no=return_no,
            lease_no=lease_no,
            customer_name=self._get_value(row, ["客户名称", "customer_name", "客户"]),
            return_date=parse_date(self._get_value(row, ["归还日期", "return_date", "入库日期"])),
            returned_by=self._get_value(row, ["归还人", "returned_by", "经办人"]),
            received_by=self._get_value(row, ["接收人", "received_by", "库管"]),
            store_location=self._get_value(row, ["门店", "store_location", "存放位置"]),
            total_deposit_deduction=safe_float(self._get_value(row, ["扣减押金", "total_deposit_deduction", "扣款"])),
            actual_refund=safe_float(self._get_value(row, ["实际退款", "actual_refund", "退款"])),
            status="pending",
            remark=self._get_value(row, ["备注", "remark"])
        )
        self.session.add(return_record)
        self.session.flush()
        
        item_name = self._get_value(row, ["配件名称", "item_name", "物品名称"])
        if item_name:
            item = ReturnItem(
                return_record_id=return_record.id,
                item_name=item_name,
                item_type=self._get_value(row, ["配件类型", "item_type", "类型"]),
                serial_no=self._get_value(row, ["序列号", "serial_no"]),
                expected_quantity=safe_int(self._get_value(row, ["应还数量", "expected_quantity"]), 1),
                returned_quantity=safe_int(self._get_value(row, ["实还数量", "returned_quantity"]), 1),
                unit_price=safe_float(self._get_value(row, ["单价", "unit_price"])),
                deposit_deduction=safe_float(self._get_value(row, ["扣减金额", "deposit_deduction"])),
                deduction_reason=self._get_value(row, ["扣减原因", "deduction_reason", "原因"]),
                condition=self._get_value(row, ["状况", "condition", "成色"]),
                remark=self._get_value(row, ["配件备注", "item_remark"])
            )
            self.session.add(item)
    
    def _process_photo(self, row: Dict[str, Any], record_id: int):
        file_name = self._get_value(row, ["文件名", "file_name", "照片"])
        if not file_name:
            raise ValueError("缺少文件名")
        
        photo_no = self._get_value(row, ["照片编号", "photo_no"])
        if photo_no:
            existing = self.session.query(ReturnPhoto).filter_by(photo_no=photo_no).first()
            if existing:
                raise ValueError(f"照片编号已存在: {photo_no}")
        
        return_no = self._get_value(row, ["归还单号", "return_no", "关联单号"])
        return_record = self.session.query(ReturnRecord).filter_by(return_no=return_no).first() if return_no else None
        
        photo = ReturnPhoto(
            import_record_id=record_id,
            return_record_id=return_record.id if return_record else None,
            photo_no=photo_no,
            file_name=file_name,
            file_path=self._get_value(row, ["文件路径", "file_path"]),
            file_hash=self._get_value(row, ["文件哈希", "file_hash"]),
            photo_type=self._get_value(row, ["照片类型", "photo_type", "类型"]),
            taken_at=parse_date(self._get_value(row, ["拍摄时间", "taken_at", "拍摄日期"])),
            uploaded_by=self._get_value(row, ["上传人", "uploaded_by"]),
            description=self._get_value(row, ["描述", "description", "备注"])
        )
        self.session.add(photo)
    
    def _process_repair(self, row: Dict[str, Any], record_id: int):
        estimate_no = self._get_value(row, ["估价单号", "estimate_no", "维修单号"])
        if not estimate_no:
            raise ValueError("缺少估价单号")
        
        existing = self.session.query(RepairEstimate).filter_by(estimate_no=estimate_no).first()
        if existing:
            raise ValueError(f"估价单号已存在: {estimate_no}")
        
        lease_no = self._get_value(row, ["租赁单号", "lease_no", "关联单号"])
        lease = self.session.query(EquipmentLease).filter_by(lease_no=lease_no).first() if lease_no else None
        
        total_cost = safe_float(self._get_value(row, ["总费用", "total_cost", "总计"]))
        labor_cost = safe_float(self._get_value(row, ["人工费用", "labor_cost", "工时费"]))
        parts_cost = safe_float(self._get_value(row, ["配件费用", "parts_cost", "材料费"]))
        
        if total_cost == 0 and (labor_cost > 0 or parts_cost > 0):
            total_cost = labor_cost + parts_cost
        
        repair = RepairEstimate(
            import_record_id=record_id,
            lease_id=lease.id if lease else None,
            estimate_no=estimate_no,
            lease_no=lease_no,
            equipment_name=self._get_value(row, ["设备名称", "equipment_name", "设备"]),
            serial_no=self._get_value(row, ["序列号", "serial_no", "机身号"]),
            customer_name=self._get_value(row, ["客户名称", "customer_name", "客户"]),
            damage_description=self._get_value(row, ["损坏描述", "damage_description", "问题描述"]),
            estimated_cost=safe_float(self._get_value(row, ["预估费用", "estimated_cost"])),
            labor_cost=labor_cost,
            parts_cost=parts_cost,
            total_cost=total_cost,
            estimated_by=self._get_value(row, ["估价人", "estimated_by", "工程师"]),
            estimated_at=parse_date(self._get_value(row, ["估价日期", "estimated_at", "日期"])),
            status="pending",
            remark=self._get_value(row, ["备注", "remark"])
        )
        self.session.add(repair)
    
    def _process_handover(self, row: Dict[str, Any], record_id: int):
        handover_no = self._get_value(row, ["交接单号", "handover_no", "单据号"])
        if not handover_no:
            raise ValueError("缺少交接单号")
        
        existing = self.session.query(StoreHandover).filter_by(handover_no=handover_no).first()
        if existing:
            raise ValueError(f"交接单号已存在: {handover_no}")
        
        return_no = self._get_value(row, ["归还单号", "return_no", "入库单号"])
        return_record = self.session.query(ReturnRecord).filter_by(return_no=return_no).first() if return_no else None
        
        handover = StoreHandover(
            import_record_id=record_id,
            return_record_id=return_record.id if return_record else None,
            handover_no=handover_no,
            return_no=return_no,
            lease_no=self._get_value(row, ["租赁单号", "lease_no"]),
            customer_name=self._get_value(row, ["客户名称", "customer_name", "客户"]),
            handover_date=parse_date(self._get_value(row, ["交接日期", "handover_date", "日期"])),
            handed_over_by=self._get_value(row, ["移交人", "handed_over_by", "客户签字"]),
            received_by=self._get_value(row, ["接收人", "received_by", "店员签字"]),
            store_location=self._get_value(row, ["门店", "store_location", "门店名称"]),
            items_list=self._get_value(row, ["物品清单", "items_list", "物品"]),
            issues_found=self._get_value(row, ["发现问题", "issues_found", "问题备注"]),
            signature_customer=self._get_value(row, ["客户签名", "signature_customer"]),
            signature_store=self._get_value(row, ["门店签名", "signature_store"]),
            remark=self._get_value(row, ["备注", "remark"])
        )
        self.session.add(handover)
    
    def _get_value(self, row: Dict[str, Any], keys: List[str]) -> str:
        for key in keys:
            if key in row and row[key] is not None:
                return safe_str(row[key])
        return ""
    
    def _log_operation(self, op_type: str, entity_type: str, entity_id: int = None, remark: str = ""):
        log = OperationLog(
            operation_type=op_type,
            entity_type=entity_type,
            entity_id=entity_id,
            operated_by=get_current_user(),
            remark=remark
        )
        self.session.add(log)
