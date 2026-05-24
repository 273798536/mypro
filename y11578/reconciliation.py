import json
from datetime import datetime
from sqlalchemy.orm import Session
from database import (
    DeliveryOrder, RepairRecord, DeductionDetail, RefundFlow,
    ReconciliationResult, ReconciliationDetail, OperationLog
)

DIRTY_TYPES = {
    "MISSING_FIELD": "缺失关键字段",
    "CROSS_DATE": "跨日异常",
    "NAME_CHANGE": "名称变更",
    "AMOUNT_CONFLICT": "金额冲突",
    "QUANTITY_CONFLICT": "数量冲突"
}

class DirtyDataDetector:
    @staticmethod
    def detect_delivery_order(record: dict, existing_records: list = None) -> tuple:
        issues = []
        suggestions = []
        
        required_fields = ['order_no', 'batch_no', 'quantity', 'delivery_date']
        for field in required_fields:
            if not record.get(field):
                issues.append(f"缺少{field}")
                suggestions.append(f"请补充{field}字段")
        
        if record.get('quantity') is not None and record.get('quantity') <= 0:
            issues.append("数量异常")
            suggestions.append("数量应为正数")
        
        if record.get('delivery_date'):
            if existing_records:
                for existing in existing_records:
                    if existing.batch_no == record.get('batch_no'):
                        if abs((datetime.strptime(record['delivery_date'], '%Y-%m-%d') - 
                               datetime.strptime(existing.delivery_date, '%Y-%m-%d')).days) > 30:
                            issues.append("跨日异常")
                            suggestions.append("同批次送货日期差异过大，请核实")
                        break
        
        if issues:
            return True, "; ".join(issues), "; ".join(suggestions)
        return False, "", ""

    @staticmethod
    def detect_repair_record(record: dict, existing_records: list = None) -> tuple:
        issues = []
        suggestions = []
        
        required_fields = ['repair_no', 'batch_no', 'repair_quantity', 'repair_date']
        for field in required_fields:
            if not record.get(field):
                issues.append(f"缺少{field}")
                suggestions.append(f"请补充{field}字段")
        
        if record.get('repair_quantity') is not None and record.get('return_quantity') is not None:
            if record['return_quantity'] > record['repair_quantity']:
                issues.append("数量冲突")
                suggestions.append("返修数量不应大于送货数量")
        
        if issues:
            return True, "; ".join(issues), "; ".join(suggestions)
        return False, "", ""

    @staticmethod
    def detect_deduction_detail(record: dict, existing_records: list = None) -> tuple:
        issues = []
        suggestions = []
        
        required_fields = ['deduction_no', 'batch_no', 'amount', 'deduction_date']
        for field in required_fields:
            if not record.get(field):
                issues.append(f"缺少{field}")
                suggestions.append(f"请补充{field}字段")
        
        if record.get('amount') is not None and record.get('amount') <= 0:
            issues.append("金额异常")
            suggestions.append("扣款金额应为正数")
        
        if record.get('quantity') and record.get('unit_price'):
            calc_amount = record['quantity'] * record['unit_price']
            if abs(calc_amount - record.get('amount', calc_amount)) > 0.01:
                issues.append("金额冲突")
                suggestions.append(f"金额不匹配: 计算值{calc_amount}≠记录值{record.get('amount')}")
        
        if issues:
            return True, "; ".join(issues), "; ".join(suggestions)
        return False, "", ""

    @staticmethod
    def detect_refund_flow(record: dict, existing_records: list = None) -> tuple:
        issues = []
        suggestions = []
        
        required_fields = ['refund_no', 'batch_no', 'amount', 'refund_date']
        for field in required_fields:
            if not record.get(field):
                issues.append(f"缺少{field}")
                suggestions.append(f"请补充{field}字段")
        
        if record.get('amount') is not None and record.get('amount') <= 0:
            issues.append("金额异常")
            suggestions.append("退款金额应为正数")
        
        if issues:
            return True, "; ".join(issues), "; ".join(suggestions)
        return False, "", ""

class ReconciliationEngine:
    def __init__(self, db: Session):
        self.db = db
    
    def _get_batch_data(self, batch_no: str):
        deliveries = self.db.query(DeliveryOrder).filter(
            DeliveryOrder.batch_no == batch_no,
            DeliveryOrder.is_dirty == False
        ).all()
        
        repairs = self.db.query(RepairRecord).filter(
            RepairRecord.batch_no == batch_no,
            RepairRecord.is_dirty == False
        ).all()
        
        deductions = self.db.query(DeductionDetail).filter(
            DeductionDetail.batch_no == batch_no,
            DeductionDetail.is_dirty == False
        ).all()
        
        refunds = self.db.query(RefundFlow).filter(
            RefundFlow.batch_no == batch_no,
            RefundFlow.is_dirty == False
        ).all()
        
        return deliveries, repairs, deductions, refunds
    
    def _calculate_totals(self, deliveries, repairs, deductions, refunds):
        total_delivery = sum(d.quantity or 0 for d in deliveries)
        total_repair = sum(r.repair_quantity or 0 for r in repairs)
        total_return = sum(r.return_quantity or 0 for r in repairs)
        total_deduction = sum(d.amount or 0 for d in deductions)
        total_refund = sum(r.amount or 0 for r in refunds)
        
        return {
            'total_delivery': total_delivery,
            'total_repair': total_repair,
            'total_return': total_return,
            'total_deduction': total_deduction,
            'total_refund': total_refund
        }
    
    def _detect_batch_discrepancies(self, batch_no, deliveries, repairs, deductions, refunds, totals):
        discrepancies = []
        discrepancy_amount = 0
        
        repair_groups = {}
        for r in repairs:
            if r.repair_date not in repair_groups:
                repair_groups[r.repair_date] = []
            repair_groups[r.repair_date].append(r)
        
        if len(repair_groups) > 1:
            deduction_groups = {}
            for d in deductions:
                if d.deduction_date not in deduction_groups:
                    deduction_groups[d.deduction_date] = []
                deduction_groups[d.deduction_date].append(d)
            
            total_repair_qty = sum(r.repair_quantity or 0 for r in repairs)
            total_deduction_by_repair = sum(
                d.amount or 0 for d in deductions 
                if d.deduction_type == '返修扣款'
            )
            
            expected_deduction = total_repair_qty * 10
            if len(deduction_groups) < len(repair_groups):
                diff = total_deduction_by_repair - expected_deduction
                if abs(diff) > 0.01:
                    discrepancies.append(
                        f"分批返工多扣款: {len(repair_groups)}批返工仅{len(deduction_groups)}笔扣款记录, "
                        f"预计扣款{expected_deduction:.2f}, 实际扣款{total_deduction_by_repair:.2f}, "
                        f"差异{diff:.2f}"
                    )
                    discrepancy_amount += diff
        
        deduction_refund_map = {}
        for d in deductions:
            deduction_refund_map[d.deduction_no] = d.amount or 0
        
        for r in refunds:
            if r.related_deduction and r.related_deduction in deduction_refund_map:
                if r.amount > deduction_refund_map[r.related_deduction]:
                    discrepancies.append(
                        f"退款超额: 扣款{r.related_deduction}金额{deduction_refund_map[r.related_deduction]:.2f}, "
                        f"退款{r.refund_no}金额{r.amount:.2f}"
                    )
                    discrepancy_amount += (r.amount - deduction_refund_map[r.related_deduction])
        
        net_return = totals['total_return'] - totals['total_repair']
        if net_return > 0:
            discrepancies.append(
                f"返修返还异常: 返修{totals['total_repair']}, 返还{totals['total_return']}, "
                f"净返还{net_return}"
            )
            discrepancy_amount += net_return * 10
        
        return discrepancies, discrepancy_amount
    
    def reconcile_batch(self, batch_no: str, operator: str = "system"):
        deliveries, repairs, deductions, refunds = self._get_batch_data(batch_no)
        
        if not deliveries and not repairs:
            return None
        
        totals = self._calculate_totals(deliveries, repairs, deductions, refunds)
        
        discrepancies, discrepancy_amount = self._detect_batch_discrepancies(
            batch_no, deliveries, repairs, deductions, refunds, totals
        )
        
        supplier = deliveries[0].supplier if deliveries else (
            repairs[0].supplier if repairs else None
        )
        product_name = deliveries[0].product_name if deliveries else (
            repairs[0].product_name if repairs else None
        )
        product_code = deliveries[0].product_code if deliveries else (
            repairs[0].product_code if repairs else None
        )
        
        recon_no = f"RECON{datetime.now().strftime('%Y%m%d%H%M%S')}{batch_no[-4:]}"
        
        recon_result = ReconciliationResult(
            recon_no=recon_no,
            batch_no=batch_no,
            product_name=product_name,
            product_code=product_code,
            supplier=supplier,
            total_delivery_qty=totals['total_delivery'],
            total_repair_qty=totals['total_repair'],
            total_return_qty=totals['total_return'],
            total_deduction_amount=totals['total_deduction'],
            total_refund_amount=totals['total_refund'],
            net_settlement=totals['total_deduction'] - totals['total_refund'],
            has_discrepancy=len(discrepancies) > 0,
            discrepancy_type="多批次返工扣款差异" if discrepancies else None,
            discrepancy_desc="\n".join(discrepancies) if discrepancies else None,
            discrepancy_amount=discrepancy_amount,
            status="待确认" if discrepancies else "已完成",
            recon_date=datetime.now().strftime('%Y-%m-%d')
        )
        
        self.db.add(recon_result)
        self.db.flush()
        
        for d in deliveries:
            detail = ReconciliationDetail(
                recon_id=recon_result.id,
                source_type="DELIVERY",
                source_id=d.id,
                source_no=d.order_no,
                quantity=d.quantity,
                amount=0,
                date=d.delivery_date,
                remark=d.remark
            )
            self.db.add(detail)
        
        for r in repairs:
            detail = ReconciliationDetail(
                recon_id=recon_result.id,
                source_type="REPAIR",
                source_id=r.id,
                source_no=r.repair_no,
                quantity=r.repair_quantity,
                amount=0,
                date=r.repair_date,
                remark=r.defect_reason
            )
            self.db.add(detail)
        
        for d in deductions:
            detail = ReconciliationDetail(
                recon_id=recon_result.id,
                source_type="DEDUCTION",
                source_id=d.id,
                source_no=d.deduction_no,
                quantity=d.quantity,
                amount=d.amount,
                date=d.deduction_date,
                remark=d.reason
            )
            self.db.add(detail)
        
        for r in refunds:
            detail = ReconciliationDetail(
                recon_id=recon_result.id,
                source_type="REFUND",
                source_id=r.id,
                source_no=r.refund_no,
                quantity=0,
                amount=r.amount,
                date=r.refund_date,
                remark=r.reason
            )
            self.db.add(detail)
        
        log = OperationLog(
            operation_type="RECONCILE",
            table_name="reconciliation_results",
            record_id=recon_result.id,
            old_value="",
            new_value=json.dumps({
                "recon_no": recon_no,
                "batch_no": batch_no,
                "discrepancies": discrepancies
            }, ensure_ascii=False),
            operator=operator
        )
        self.db.add(log)
        
        self.db.commit()
        return recon_result
    
    def reconcile_all(self, batch_nos: list = None, operator: str = "system"):
        if not batch_nos:
            batch_nos = set()
            for d in self.db.query(DeliveryOrder.batch_no).distinct():
                batch_nos.add(d[0])
            for r in self.db.query(RepairRecord.batch_no).distinct():
                batch_nos.add(r[0])
            batch_nos = list(batch_nos)
        
        results = []
        for batch_no in batch_nos:
            result = self.reconcile_batch(batch_no, operator)
            if result:
                results.append(result)
        
        return results
