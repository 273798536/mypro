from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import pandas as pd
import hashlib
import json
import os

from app.models.ledger import LedgerRecord, StatusHistory, ExportRecord
from app.models.user import User
from app.config import settings


class ExportService:
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
        self.export_dir = "./exports"
        os.makedirs(self.export_dir, exist_ok=True)

    def _mask_sensitive_data(self, data: Dict, use_column_names: bool = False) -> Dict:
        masked = data.copy()
        sensitive_keys = settings.SENSITIVE_FIELDS if use_column_names else [
            settings.EXPORT_COLUMN_TO_FIELD_MAP.get(col, col) for col in settings.SENSITIVE_FIELDS
        ]
        for key in sensitive_keys:
            if key in masked and masked[key]:
                value = str(masked[key])
                if len(value) > 4:
                    masked[key] = value[:2] + "*" * (len(value) - 4) + value[-2:]
                elif len(value) > 0:
                    masked[key] = "*" * len(value)
        return masked

    def _generate_file_hash(self, file_path: str) -> str:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def export_to_excel(
        self,
        ledger_ids: List[int],
        mask_sensitive: bool = True,
        include_history: bool = False
    ) -> Dict:
        ledgers = self.db.query(LedgerRecord).filter(
            LedgerRecord.id.in_(ledger_ids),
            LedgerRecord.is_deleted == False,
            LedgerRecord.status.in_(["audited", "exported"])
        ).all()

        if not ledgers:
            raise ValueError("没有可导出的记录")

        export_no = f"EXP{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        ledger_data = []
        for ledger in ledgers:
            row = {
                "台账编号": ledger.ledger_no,
                "波次编号": ledger.wave_no,
                "波次日期": ledger.wave_date.strftime("%Y-%m-%d") if ledger.wave_date else "",
                "拣货员": ledger.picker_name,
                "复核员": ledger.reviewer_name,
                "SKU编码": ledger.sku_code,
                "SKU名称": ledger.sku_name,
                "拣货数量": ledger.pick_qty,
                "实际拣货": ledger.actual_pick_qty,
                "复核数量": ledger.review_qty,
                "差异数量": ledger.diff_qty,
                "差异类型": ledger.diff_type,
                "差异原因": ledger.diff_reason,
                "状态": ledger.status,
                "是否脏数据": "是" if ledger.is_dirty else "否",
                "脏数据类型": ledger.dirty_type,
                "绩效影响": float(ledger.performance_impact) if ledger.performance_impact else 0,
                "库存影响": float(ledger.inventory_impact) if ledger.inventory_impact else 0,
                "处理意见": ledger.handle_opinion,
                "数据来源": json.dumps(ledger.data_sources) if ledger.data_sources else "",
                "版本号": ledger.version,
                "创建人": ledger.created_by,
                "创建时间": ledger.created_at.strftime("%Y-%m-%d %H:%M:%S")
            }
            
            if mask_sensitive:
                row = self._mask_sensitive_data(row, use_column_names=True)
            
            ledger_data.append(row)

        df = pd.DataFrame(ledger_data)
        file_name = f"{export_no}_ledger_export.xlsx"
        file_path = os.path.join(self.export_dir, file_name)
        
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='台账数据', index=False)
            
            if include_history:
                history_data = []
                for ledger in ledgers:
                    for history in ledger.status_histories:
                        history_data.append({
                            "台账编号": history.ledger_no,
                            "原状态": history.from_status,
                            "新状态": history.to_status,
                            "操作人": history.operator_name,
                            "操作时间": history.operate_time.strftime("%Y-%m-%d %H:%M:%S") if history.operate_time else "",
                            "变更原因": history.reason,
                            "变更说明": history.change_note
                        })
                if history_data:
                    df_history = pd.DataFrame(history_data)
                    df_history.to_excel(writer, sheet_name='状态变更历史', index=False)

        file_hash = self._generate_file_hash(file_path)

        export_record = ExportRecord(
            export_no=export_no,
            export_type="excel",
            ledger_nos=[l.ledger_no for l in ledgers],
            export_time=datetime.utcnow(),
            operator_id=self.user.id,
            operator_name=self.user.full_name,
            file_path=file_path,
            file_hash=file_hash,
            is_sensitive_masked=mask_sensitive,
            export_params={
                "include_history": include_history,
                "mask_sensitive": mask_sensitive
            },
            record_count=len(ledgers)
        )
        
        self.db.add(export_record)
        self.db.commit()

        for ledger in ledgers:
            if ledger.status == "audited":
                ledger.status = "exported"
                ledger.export_time = datetime.utcnow()
                self.db.add(StatusHistory(
                    ledger_id=ledger.id,
                    ledger_no=ledger.ledger_no,
                    from_status="audited",
                    to_status="exported",
                    operator_id=self.user.id,
                    operator_name=self.user.full_name,
                    operate_time=datetime.utcnow(),
                    reason="导出标记"
                ))
        self.db.commit()

        return {
            "export_no": export_no,
            "file_path": file_path,
            "file_hash": file_hash,
            "record_count": len(ledgers)
        }

    def _mark_exported(self, ledgers: List[LedgerRecord]):
        for ledger in ledgers:
            if ledger.status == "audited":
                ledger.status = "exported"
                ledger.export_time = datetime.utcnow()
                self.db.add(StatusHistory(
                    ledger_id=ledger.id,
                    ledger_no=ledger.ledger_no,
                    from_status="audited",
                    to_status="exported",
                    operator_id=self.user.id,
                    operator_name=self.user.full_name,
                    operate_time=datetime.utcnow(),
                    reason="导出标记"
                ))
        self.db.commit()

    def _build_export_data(self, ledgers: List[LedgerRecord], mask_sensitive: bool) -> List[Dict]:
        ledger_data = []
        for ledger in ledgers:
            row = {
                "ledger_no": ledger.ledger_no,
                "wave_no": ledger.wave_no,
                "wave_date": ledger.wave_date.strftime("%Y-%m-%d") if ledger.wave_date else "",
                "picker_name": ledger.picker_name,
                "reviewer_name": ledger.reviewer_name,
                "sku_code": ledger.sku_code,
                "sku_name": ledger.sku_name,
                "pick_qty": ledger.pick_qty,
                "actual_pick_qty": ledger.actual_pick_qty,
                "review_qty": ledger.review_qty,
                "diff_qty": ledger.diff_qty,
                "diff_type": ledger.diff_type,
                "diff_reason": ledger.diff_reason,
                "status": ledger.status,
                "is_dirty": ledger.is_dirty,
                "dirty_type": ledger.dirty_type,
                "performance_impact": float(ledger.performance_impact) if ledger.performance_impact else 0,
                "inventory_impact": float(ledger.inventory_impact) if ledger.inventory_impact else 0,
                "handle_opinion": ledger.handle_opinion,
                "data_sources": json.dumps(ledger.data_sources) if ledger.data_sources else "",
                "version": ledger.version,
                "created_by": ledger.created_by,
                "created_at": ledger.created_at.strftime("%Y-%m-%d %H:%M:%S")
            }
            if mask_sensitive:
                row = self._mask_sensitive_data(row, use_column_names=False)
            ledger_data.append(row)
        return ledger_data

    def export_to_json(
        self,
        ledger_ids: List[int],
        mask_sensitive: bool = True
    ) -> Dict:
        ledgers = self.db.query(LedgerRecord).filter(
            LedgerRecord.id.in_(ledger_ids),
            LedgerRecord.is_deleted == False,
            LedgerRecord.status.in_(["audited", "exported"])
        ).all()

        if not ledgers:
            raise ValueError("没有可导出的记录")

        export_no = f"EXP{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        ledger_data = self._build_export_data(ledgers, mask_sensitive)
        
        file_name = f"{export_no}_ledger_export.json"
        file_path = os.path.join(self.export_dir, file_name)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump({
                "export_no": export_no,
                "export_time": datetime.utcnow().isoformat(),
                "operator": self.user.full_name,
                "mask_sensitive": mask_sensitive,
                "records": ledger_data
            }, f, ensure_ascii=False, indent=2)

        file_hash = self._generate_file_hash(file_path)

        export_record = ExportRecord(
            export_no=export_no,
            export_type="json",
            ledger_nos=[l.ledger_no for l in ledgers],
            export_time=datetime.utcnow(),
            operator_id=self.user.id,
            operator_name=self.user.full_name,
            file_path=file_path,
            file_hash=file_hash,
            is_sensitive_masked=mask_sensitive,
            export_params={"mask_sensitive": mask_sensitive},
            record_count=len(ledgers)
        )
        
        self.db.add(export_record)
        self.db.commit()

        for ledger in ledgers:
            if ledger.status == "audited":
                ledger.status = "exported"
                ledger.export_time = datetime.utcnow()
                self.db.add(StatusHistory(
                    ledger_id=ledger.id,
                    ledger_no=ledger.ledger_no,
                    from_status="audited",
                    to_status="exported",
                    operator_id=self.user.id,
                    operator_name=self.user.full_name,
                    operate_time=datetime.utcnow(),
                    reason="导出标记"
                ))
        self.db.commit()

        return {
            "export_no": export_no,
            "file_path": file_path,
            "file_hash": file_hash,
            "record_count": len(ledgers)
        }

    def export_to_csv(
        self,
        ledger_ids: List[int],
        mask_sensitive: bool = True
    ) -> Dict:
        ledgers = self.db.query(LedgerRecord).filter(
            LedgerRecord.id.in_(ledger_ids),
            LedgerRecord.is_deleted == False,
            LedgerRecord.status.in_(["audited", "exported"])
        ).all()

        if not ledgers:
            raise ValueError("没有可导出的记录")

        export_no = f"EXP{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        ledger_data = self._build_export_data(ledgers, mask_sensitive)
        
        file_name = f"{export_no}_ledger_export.csv"
        file_path = os.path.join(self.export_dir, file_name)
        
        df = pd.DataFrame(ledger_data)
        df.to_csv(file_path, index=False, encoding='utf-8-sig')

        file_hash = self._generate_file_hash(file_path)

        export_record = ExportRecord(
            export_no=export_no,
            export_type="csv",
            ledger_nos=[l.ledger_no for l in ledgers],
            export_time=datetime.utcnow(),
            operator_id=self.user.id,
            operator_name=self.user.full_name,
            file_path=file_path,
            file_hash=file_hash,
            is_sensitive_masked=mask_sensitive,
            export_params={"mask_sensitive": mask_sensitive},
            record_count=len(ledgers)
        )
        
        self.db.add(export_record)
        self.db.commit()

        for ledger in ledgers:
            if ledger.status == "audited":
                ledger.status = "exported"
                ledger.export_time = datetime.utcnow()
                self.db.add(StatusHistory(
                    ledger_id=ledger.id,
                    ledger_no=ledger.ledger_no,
                    from_status="audited",
                    to_status="exported",
                    operator_id=self.user.id,
                    operator_name=self.user.full_name,
                    operate_time=datetime.utcnow(),
                    reason="导出标记"
                ))
        self.db.commit()

        return {
            "export_no": export_no,
            "file_path": file_path,
            "file_hash": file_hash,
            "record_count": len(ledgers)
        }

    def verify_export_consistency(self, export_no: str) -> Dict:
        export_record = self.db.query(ExportRecord).filter(
            ExportRecord.export_no == export_no
        ).first()
        
        if not export_record:
            raise ValueError("导出记录不存在")

        if not os.path.exists(export_record.file_path):
            return {
                "export_no": export_no,
                "is_consistent": False,
                "reason": "文件不存在"
            }

        current_hash = self._generate_file_hash(export_record.file_path)
        is_consistent = current_hash == export_record.file_hash

        return {
            "export_no": export_no,
            "is_consistent": is_consistent,
            "original_hash": export_record.file_hash,
            "current_hash": current_hash,
            "export_time": export_record.export_time,
            "operator": export_record.operator_name
        }

    def get_export_history(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict:
        query = self.db.query(ExportRecord)
        
        if start_date:
            query = query.filter(ExportRecord.export_time >= start_date)
        if end_date:
            query = query.filter(ExportRecord.export_time <= end_date)
        
        total = query.count()
        records = query.order_by(ExportRecord.export_time.desc()).offset((page - 1) * page_size).limit(page_size).all()
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": records
        }
