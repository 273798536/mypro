from typing import Any, Dict, List
from sqlalchemy import func

from lease_audit.models.database import (
    get_session, ImportRecord, ImportBatch, ImportFailure,
    EquipmentLease, ReturnRecord, ReturnItem, ReturnPhoto, RepairEstimate, StoreHandover
)


class CheckService:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.session = get_session(db_path)
    
    def check_duplicates(self, batch_no: str = None, source_type: str = None) -> Dict[str, Any]:
        issues = []
        
        query = self.session.query(
            ImportRecord.data_hash,
            func.count(ImportRecord.id).label("count")
        ).group_by(ImportRecord.data_hash).having(func.count(ImportRecord.id) > 1)
        
        if source_type:
            query = query.filter(ImportRecord.source_type == source_type)
        
        if batch_no:
            batch = self.session.query(ImportBatch).filter_by(batch_no=batch_no).first()
            if batch:
                query = query.filter(ImportRecord.batch_id == batch.id)
        
        duplicates = query.all()
        for dup in duplicates:
            records = self.session.query(ImportRecord).filter_by(data_hash=dup.data_hash).all()
            batches = ", ".join(set(r.batch.batch_no for r in records if r.batch))
            issues.append(
                f"数据哈希重复 ({dup.count}次): {dup.data_hash[:16]}..., 涉及批次: {batches}"
            )
        
        unique_keys = {
            "lease": ("EquipmentLease", "lease_no"),
            "return": ("ReturnRecord", "return_no"),
            "repair": ("RepairEstimate", "estimate_no"),
            "handover": ("StoreHandover", "handover_no"),
        }
        
        for st, (model_name, key_field) in unique_keys.items():
            if source_type and st != source_type:
                continue
            
            model = {
                "EquipmentLease": EquipmentLease,
                "ReturnRecord": ReturnRecord,
                "RepairEstimate": RepairEstimate,
                "StoreHandover": StoreHandover,
            }[model_name]
            
            key_col = getattr(model, key_field)
            dup_keys = self.session.query(
                key_col,
                func.count(model.id).label("count")
            ).group_by(key_col).having(func.count(model.id) > 1).all()
            
            for dk in dup_keys:
                issues.append(f"{model_name} {key_field}重复 ({dk.count}次): {dk[0]}")
        
        return {
            "total": len(issues),
            "issues": issues
        }
    
    def check_integrity(self, batch_no: str = None, source_type: str = None) -> Dict[str, Any]:
        issues = []
        
        if source_type in [None, "return"]:
            returns = self.session.query(ReturnRecord)
            if batch_no:
                batch = self.session.query(ImportBatch).filter_by(batch_no=batch_no).first()
                if batch:
                    record_ids = [r.id for r in batch.records]
                    returns = returns.filter(ReturnRecord.import_record_id.in_(record_ids))
            
            for ret in returns.all():
                if ret.lease_no and not ret.lease:
                    issues.append(f"归还单 {ret.return_no}: 关联租赁单 {ret.lease_no} 不存在")
                
                items = self.session.query(ReturnItem).filter_by(return_record_id=ret.id).all()
                total_deduction = sum(item.deposit_deduction for item in items)
                if abs(total_deduction - ret.total_deposit_deduction) > 0.01:
                    issues.append(
                        f"归还单 {ret.return_no}: 扣款金额不一致 (明细:{total_deduction}, 汇总:{ret.total_deposit_deduction})"
                    )
        
        if source_type in [None, "repair"]:
            repairs = self.session.query(RepairEstimate)
            if batch_no:
                batch = self.session.query(ImportBatch).filter_by(batch_no=batch_no).first()
                if batch:
                    record_ids = [r.id for r in batch.records]
                    repairs = repairs.filter(RepairEstimate.import_record_id.in_(record_ids))
            
            for rep in repairs.all():
                if rep.lease_no and not rep.lease:
                    issues.append(f"估价单 {rep.estimate_no}: 关联租赁单 {rep.lease_no} 不存在")
                
                calc_total = rep.labor_cost + rep.parts_cost
                if abs(calc_total - rep.total_cost) > 0.01 and calc_total > 0:
                    issues.append(
                        f"估价单 {rep.estimate_no}: 总费用计算不一致 (人工+配件={calc_total}, 记录={rep.total_cost})"
                    )
        
        if source_type in [None, "handover"]:
            handovers = self.session.query(StoreHandover)
            if batch_no:
                batch = self.session.query(ImportBatch).filter_by(batch_no=batch_no).first()
                if batch:
                    record_ids = [r.id for r in batch.records]
                    handovers = handovers.filter(StoreHandover.import_record_id.in_(record_ids))
            
            for ho in handovers.all():
                if ho.return_no:
                    ret = self.session.query(ReturnRecord).filter_by(return_no=ho.return_no).first()
                    if not ret:
                        issues.append(f"交接单 {ho.handover_no}: 关联归还单 {ho.return_no} 不存在")
        
        return {
            "total": len(issues),
            "issues": issues
        }
    
    def check_consistency(self, batch_no: str = None) -> Dict[str, Any]:
        issues = []
        
        returns = self.session.query(ReturnRecord)
        for ret in returns.all():
            repairs = self.session.query(RepairEstimate).filter_by(lease_no=ret.lease_no).all()
            repair_total = sum(r.total_cost for r in repairs)
            
            if repair_total > 0 and abs(repair_total - ret.total_deposit_deduction) > 0.01:
                issues.append(
                    f"归还单 {ret.return_no}: 扣款({ret.total_deposit_deduction})与维修估价({repair_total})不一致"
                )
            
            photos = self.session.query(ReturnPhoto).filter_by(return_record_id=ret.id).all()
            if not photos and ret.total_deposit_deduction > 0:
                issues.append(
                    f"归还单 {ret.return_no}: 有扣款({ret.total_deposit_deduction})但无照片证据"
                )
            
            handovers = self.session.query(StoreHandover).filter_by(return_no=ret.return_no).all()
            if not handovers:
                issues.append(
                    f"归还单 {ret.return_no}: 无对应的门店交接记录"
                )
        
        return {
            "total": len(issues),
            "issues": issues
        }
