from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, date
from sqlalchemy.orm import Session
from collections import defaultdict

from app.models.inspection import InspectionRecord
from app.models.rework import ReworkOrder
from app.models.machine_shift import MachineShift
from app.models.price_adjustment import PriceAdjustment
from app.models.audit import ChangeHistory
from app.models.states import RecordStatus


class TraceabilityService:
    """
    核心追责台账服务
    实现抽检表、返工单、机台班次、手工改价表的互相印证
    定位责任班次和重复返工风险
    """

    @staticmethod
    def get_batch_traceability(
        db: Session,
        batch_no: str,
    ) -> Dict[str, Any]:
        """
        获取单个批次的完整追责链条
        抽检表 ↔ 返工单 ↔ 机台班次 ↔ 手工改价表
        """
        inspections = db.query(InspectionRecord).filter(
            InspectionRecord.batch_no == batch_no
        ).all()
        
        reworks = db.query(ReworkOrder).filter(
            ReworkOrder.batch_no == batch_no
        ).all()
        
        price_adjustments = db.query(PriceAdjustment).filter(
            PriceAdjustment.batch_no == batch_no
        ).all()

        shift_ids = set()
        for insp in inspections:
            if insp.shift_id:
                shift_ids.add(insp.shift_id)
        for rw in reworks:
            if rw.responsible_shift_id:
                shift_ids.add(rw.responsible_shift_id)
        
        shifts = db.query(MachineShift).filter(
            MachineShift.id.in_(list(shift_ids))
        ).all() if shift_ids else []

        inspection_ids = [i.id for i in inspections]
        rework_ids = [r.id for r in reworks]

        inspection_changes = db.query(ChangeHistory).filter(
            ChangeHistory.entity_type == "inspection",
            ChangeHistory.entity_id.in_(inspection_ids)
        ).all()
        
        rework_changes = db.query(ChangeHistory).filter(
            ChangeHistory.entity_type == "rework",
            ChangeHistory.entity_id.in_(rework_ids)
        ).all()

        return {
            "batch_no": batch_no,
            "inspections": [
                TraceabilityService._serialize_inspection(i) 
                for i in inspections
            ],
            "reworks": [
                TraceabilityService._serialize_rework(r) 
                for r in reworks
            ],
            "shifts": [
                TraceabilityService._serialize_shift(s) 
                for s in shifts
            ],
            "price_adjustments": [
                TraceabilityService._serialize_price(p) 
                for p in price_adjustments
            ],
            "change_history": {
                "inspections": [TraceabilityService._serialize_change(c) for c in inspection_changes],
                "reworks": [TraceabilityService._serialize_change(c) for c in rework_changes],
            },
            "cross_validation": TraceabilityService._validate_batch_consistency(
                inspections, reworks, shifts
            ),
            "responsibility_chain": TraceabilityService._build_responsibility_chain(
                inspections, reworks, shifts
            ),
        }

    @staticmethod
    def detect_rework_risk(
        db: Session,
        days: int = 7,
        rework_threshold: int = 2,
    ) -> Dict[str, Any]:
        """
        检测重复返工风险
        同一批次/同一机台/同一班次反复返工
        """
        from datetime import timedelta
        cutoff_date = datetime.now() - timedelta(days=days)

        reworks = db.query(ReworkOrder).filter(
            ReworkOrder.created_at >= cutoff_date
        ).all()

        batch_rework_count = defaultdict(int)
        machine_rework_count = defaultdict(int)
        shift_rework_count = defaultdict(int)
        defect_type_count = defaultdict(int)

        for rw in reworks:
            batch_rework_count[rw.batch_no] += 1
            if rw.original_inspection and rw.original_inspection.machine_id:
                machine_rework_count[rw.original_inspection.machine_id] += 1
            if rw.responsible_shift_id:
                shift_rework_count[rw.responsible_shift_id] += 1
            if rw.defect_type:
                defect_type_count[rw.defect_type] += 1

        high_risk_batches = [
            {"batch_no": b, "rework_count": c, "risk_level": "HIGH" if c >= rework_threshold else "MEDIUM"}
            for b, c in batch_rework_count.items() if c >= rework_threshold
        ]

        high_risk_machines = [
            {"machine_id": m, "rework_count": c, "risk_level": "HIGH" if c >= rework_threshold else "MEDIUM"}
            for m, c in machine_rework_count.items() if c >= rework_threshold
        ]

        high_risk_defects = sorted(
            [{"defect_type": t, "count": c} for t, c in defect_type_count.items()],
            key=lambda x: x["count"],
            reverse=True
        )[:10]

        return {
            "analysis_period_days": days,
            "rework_threshold": rework_threshold,
            "summary": {
                "total_reworks": len(reworks),
                "affected_batches": len(batch_rework_count),
                "affected_machines": len(machine_rework_count),
                "high_risk_batches": len(high_risk_batches),
                "high_risk_machines": len(high_risk_machines),
            },
            "high_risk_batches": high_risk_batches,
            "high_risk_machines": high_risk_machines,
            "top_defect_types": high_risk_defects,
            "rework_trend": TraceabilityService._get_rework_trend(reworks),
        }

    @staticmethod
    def get_shift_responsibility_report(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        责任班次追责报告
        按班次统计良率、返工次数、改价记录
        """
        query = db.query(MachineShift)
        if start_date:
            query = query.filter(MachineShift.shift_date >= start_date)
        if end_date:
            query = query.filter(MachineShift.shift_date <= end_date)
        
        shifts = query.all()

        shift_stats = []
        for shift in shifts:
            shift_insp = db.query(InspectionRecord).filter(
                InspectionRecord.shift_id == shift.id
            ).all()
            
            shift_reworks = db.query(ReworkOrder).filter(
                ReworkOrder.responsible_shift_id == shift.id
            ).all()
            
            shift_price_adj = db.query(PriceAdjustment).join(
                ReworkOrder, PriceAdjustment.rework_order_id == ReworkOrder.id
            ).filter(
                ReworkOrder.responsible_shift_id == shift.id
            ).all()

            total_defects = sum(i.defect_count or 0 for i in shift_insp)
            total_samples = sum(i.sample_size or 0 for i in shift_insp)
            avg_yield = (total_samples - total_defects) / total_samples * 100 if total_samples > 0 else None

            manual_changes = db.query(ChangeHistory).filter(
                ChangeHistory.entity_type == "inspection",
                ChangeHistory.entity_id.in_([i.id for i in shift_insp]),
                ChangeHistory.is_manual_change == 1
            ).count()

            shift_stats.append({
                "shift_id": shift.id,
                "machine_id": shift.machine_id,
                "shift_name": shift.shift_name,
                "shift_date": shift.shift_date.isoformat() if shift.shift_date else None,
                "shift_leader": shift.shift_leader_user.full_name if shift.shift_leader_user else None,
                "operator": shift.operator_user.full_name if shift.operator_user else None,
                "stats": {
                    "total_output": shift.total_output,
                    "defect_output": shift.defect_output,
                    "rework_count": len(shift_reworks),
                    "price_adjustment_count": len(shift_price_adj),
                    "inspection_count": len(shift_insp),
                    "avg_yield_rate": round(avg_yield, 2) if avg_yield else None,
                    "manual_change_count": manual_changes,
                },
                "risk_indicators": TraceabilityService._calculate_shift_risk(
                    len(shift_reworks), manual_changes, len(shift_price_adj), avg_yield
                ),
            })

        return {
            "period": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            },
            "total_shifts": len(shift_stats),
            "shifts": sorted(
                shift_stats,
                key=lambda x: (x["risk_indicators"]["risk_score"]),
                reverse=True
            ),
        }

    @staticmethod
    def get_yield_integrity_check(
        db: Session,
        batch_no: Optional[str] = None,
        days: int = 30,
    ) -> Dict[str, Any]:
        """
        良率完整性校验
        检测良率被反复修改、人工改判等异常情况
        防止同一缺陷反复返工后良率被冲掉
        """
        from datetime import timedelta
        cutoff_date = datetime.now() - timedelta(days=days)

        query = db.query(ChangeHistory).filter(
            ChangeHistory.entity_type == "inspection",
            ChangeHistory.field_name.in_(["yield_rate", "defect_count", "judge_result", "final_judge"]),
            ChangeHistory.changed_at >= cutoff_date
        )

        if batch_no:
            insp_ids = [i.id for i in db.query(InspectionRecord).filter(
                InspectionRecord.batch_no == batch_no
            ).all()]
            query = query.filter(ChangeHistory.entity_id.in_(insp_ids))

        changes = query.order_by(ChangeHistory.changed_at.desc()).all()

        suspicious_changes = []
        for change in changes:
            record = db.query(InspectionRecord).filter(
                InspectionRecord.id == change.entity_id
            ).first()
            
            if change.is_manual_change or change.field_name in ["judge_result", "final_judge"]:
                suspicious_changes.append({
                    "change_id": change.id,
                    "batch_no": record.batch_no if record else None,
                    "field": change.field_name,
                    "old_value": change.old_value,
                    "new_value": change.new_value,
                    "is_manual": change.is_manual_change == 1,
                    "reason": change.change_reason,
                    "changed_by": change.changer.full_name if change.changer else None,
                    "changed_at": change.changed_at.isoformat() if change.changed_at else None,
                })

        return {
            "check_period_days": days,
            "batch_no": batch_no,
            "summary": {
                "total_field_changes": len(changes),
                "suspicious_changes": len(suspicious_changes),
                "manual_changes": sum(1 for c in changes if c.is_manual_change),
            },
            "suspicious_changes": suspicious_changes,
            "integrity_score": TraceabilityService._calculate_integrity_score(
                len(changes), sum(1 for c in changes if c.is_manual_change)
            ),
        }

    @staticmethod
    def _validate_batch_consistency(
        inspections: List[InspectionRecord],
        reworks: List[ReworkOrder],
        shifts: List[MachineShift],
    ) -> Dict[str, Any]:
        """
        批次数据一致性校验
        抽检表、返工单、机台班次数据互相印证
        """
        issues = []
        warnings = []

        for rw in reworks:
            linked = False
            for insp in inspections:
                if insp.batch_no == rw.batch_no:
                    linked = True
                    if insp.machine_id and rw.original_inspection and insp.machine_id != rw.original_inspection.machine_id:
                        issues.append({
                            "type": "MACHINE_MISMATCH",
                            "severity": "HIGH",
                            "message": f"返工单 {rw.rework_no} 与抽检记录机台不一致",
                        })
            if not linked:
                warnings.append({
                    "type": "UNLINKED_REWORK",
                    "severity": "MEDIUM",
                    "message": f"返工单 {rw.rework_no} 未关联到抽检记录",
                })

        for insp in inspections:
            if insp.shift_id and not any(s.id == insp.shift_id for s in shifts):
                warnings.append({
                    "type": "MISSING_SHIFT",
                    "severity": "LOW",
                    "message": f"抽检记录 {insp.id} 的班次信息缺失",
                })

        return {
            "is_consistent": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "data_points": {
                "inspection_count": len(inspections),
                "rework_count": len(reworks),
                "shift_count": len(shifts),
            },
        }

    @staticmethod
    def _build_responsibility_chain(
        inspections: List[InspectionRecord],
        reworks: List[ReworkOrder],
        shifts: List[MachineShift],
    ) -> List[Dict[str, Any]]:
        """
        构建责任链条
        追踪从抽检→返工→改价的完整责任路径
        """
        chains = []
        
        for insp in inspections:
            chain = {
                "inspection": {
                    "id": insp.id,
                    "batch_no": insp.batch_no,
                    "defect_count": insp.defect_count,
                    "yield_rate": insp.yield_rate,
                    "judge": insp.judge_result,
                },
                "reworks": [],
                "responsible_shifts": [],
                "price_adjustments": [],
            }

            for rw in reworks:
                if rw.batch_no == insp.batch_no:
                    chain["reworks"].append({
                        "id": rw.id,
                        "rework_no": rw.rework_no,
                        "defect_type": rw.defect_type,
                        "rework_count": rw.rework_count,
                        "rework_times": rw.rework_times,
                    })
                    if rw.responsible_shift_id:
                        shift = next((s for s in shifts if s.id == rw.responsible_shift_id), None)
                        if shift:
                            chain["responsible_shifts"].append({
                                "shift_id": shift.id,
                                "machine_id": shift.machine_id,
                                "shift_name": shift.shift_name,
                                "shift_date": shift.shift_date.isoformat() if shift.shift_date else None,
                                "shift_leader": shift.shift_leader_user.full_name if shift.shift_leader_user else None,
                            })

            chains.append(chain)
        
        return chains

    @staticmethod
    def _calculate_shift_risk(
        rework_count: int,
        manual_change_count: int,
        price_adj_count: int,
        avg_yield: Optional[float],
    ) -> Dict[str, Any]:
        """
        计算班次风险分数
        """
        score = 0
        factors = []

        if rework_count >= 3:
            score += 30
            factors.append("返工次数过多")
        elif rework_count >= 1:
            score += 10

        if manual_change_count >= 2:
            score += 25
            factors.append("人工改判频繁")
        elif manual_change_count >= 1:
            score += 10

        if price_adj_count >= 2:
            score += 20
            factors.append("手工改价较多")
        elif price_adj_count >= 1:
            score += 10

        if avg_yield is not None and avg_yield < 90:
            score += 25
            factors.append("良率偏低")
        elif avg_yield is not None and avg_yield < 95:
            score += 10

        risk_level = "LOW"
        if score >= 50:
            risk_level = "CRITICAL"
        elif score >= 30:
            risk_level = "HIGH"
        elif score >= 15:
            risk_level = "MEDIUM"

        return {
            "risk_score": score,
            "risk_level": risk_level,
            "risk_factors": factors,
        }

    @staticmethod
    def _get_rework_trend(reworks: List[ReworkOrder]) -> List[Dict[str, Any]]:
        """
        获取返工趋势
        """
        by_date = defaultdict(int)
        for rw in reworks:
            if rw.created_at:
                day = rw.created_at.date().isoformat()
                by_date[day] += 1
        
        return [
            {"date": d, "count": c}
            for d, c in sorted(by_date.items())
        ]

    @staticmethod
    def _calculate_integrity_score(total_changes: int, manual_changes: int) -> int:
        """
        计算数据完整性分数 (0-100)
        """
        if total_changes == 0:
            return 100
        
        manual_ratio = manual_changes / total_changes
        score = 100 - (manual_ratio * 50) - (total_changes * 2)
        
        return max(0, min(100, int(score)))

    @staticmethod
    def _serialize_inspection(obj: InspectionRecord) -> Dict[str, Any]:
        return {
            "id": obj.id,
            "batch_no": obj.batch_no,
            "product_code": obj.product_code,
            "machine_id": obj.machine_id,
            "sample_size": obj.sample_size,
            "defect_count": obj.defect_count,
            "pass_count": obj.pass_count,
            "yield_rate": obj.yield_rate,
            "original_yield_rate": obj.original_yield_rate,
            "defect_type": obj.defect_type,
            "judge_result": obj.judge_result,
            "status": obj.status.value if obj.status else None,
            "version": obj.version,
            "is_manual_adjustment": obj.is_manual_adjustment,
            "rework_count": obj.rework_count,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
        }

    @staticmethod
    def _serialize_rework(obj: ReworkOrder) -> Dict[str, Any]:
        return {
            "id": obj.id,
            "rework_no": obj.rework_no,
            "batch_no": obj.batch_no,
            "defect_type": obj.defect_type,
            "rework_count": obj.rework_count,
            "rework_pass_count": obj.rework_pass_count,
            "rework_fail_count": obj.rework_fail_count,
            "rework_times": obj.rework_times,
            "status": obj.status.value if obj.status else None,
            "version": obj.version,
            "is_manual_adjustment": obj.is_manual_adjustment,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
        }

    @staticmethod
    def _serialize_shift(obj: MachineShift) -> Dict[str, Any]:
        return {
            "id": obj.id,
            "machine_id": obj.machine_id,
            "shift_name": obj.shift_name,
            "shift_date": obj.shift_date.isoformat() if obj.shift_date else None,
            "total_output": obj.total_output,
            "defect_output": obj.defect_output,
            "rework_count": obj.rework_count,
            "shift_leader": obj.shift_leader_user.full_name if obj.shift_leader_user else None,
            "operator": obj.operator_user.full_name if obj.operator_user else None,
        }

    @staticmethod
    def _serialize_price(obj: PriceAdjustment) -> Dict[str, Any]:
        return {
            "id": obj.id,
            "adjustment_no": obj.adjustment_no,
            "batch_no": obj.batch_no,
            "adjustment_reason": obj.adjustment_reason,
            "handler": obj.handler_user.full_name if obj.handler_user else None,
            "approver": obj.approver_user.full_name if obj.approver_user else None,
            "status": obj.status.value if obj.status else None,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
        }

    @staticmethod
    def _serialize_change(obj: ChangeHistory) -> Dict[str, Any]:
        return {
            "id": obj.id,
            "field": obj.field_name,
            "old_value": obj.old_value,
            "new_value": obj.new_value,
            "is_manual": obj.is_manual_change == 1,
            "is_sensitive": obj.is_sensitive_field == 1,
            "reason": obj.change_reason,
            "changed_by": obj.changer.full_name if obj.changer else None,
            "changed_at": obj.changed_at.isoformat() if obj.changed_at else None,
        }
