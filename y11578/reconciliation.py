import json
import hashlib
from datetime import datetime
from sqlalchemy.orm import Session
from database import (
    DeliveryOrder, RepairRecord, DeductionDetail, RefundFlow,
    ReconciliationResult, ReconciliationDetail, OperationLog,
    CompensationRecord, BatchInfo
)

DIRTY_TYPES = {
    "MISSING_FIELD": "缺失关键字段",
    "CROSS_DATE": "跨日异常",
    "NAME_CHANGE": "名称变更",
    "AMOUNT_CONFLICT": "金额冲突",
    "QUANTITY_CONFLICT": "数量冲突",
    "DUPLICATE_RECORD": "重复记录"
}

def generate_import_key(record_dict: dict, key_fields: list) -> str:
    key_values = [str(record_dict.get(k, '')) for k in key_fields]
    key_string = '|'.join(key_values)
    return hashlib.md5(key_string.encode('utf-8')).hexdigest()

class DirtyDataDetector:
    @staticmethod
    def detect_delivery_order(record: dict, existing_records: list = None, batch_products: dict = None) -> tuple:
        issues = []
        suggestions = []
        dirty_types = []
        
        required_fields = ['order_no', 'batch_no', 'quantity', 'delivery_date']
        missing_fields = []
        for field in required_fields:
            if not record.get(field):
                missing_fields.append(field)
        if missing_fields:
            issues.append(f"缺少{', '.join(missing_fields)}")
            suggestions.append(f"请补充{', '.join(missing_fields)}字段")
            dirty_types.append("MISSING_FIELD")
        
        if record.get('quantity') is not None and record.get('quantity') <= 0:
            issues.append("数量异常")
            suggestions.append("数量应为正数")
            dirty_types.append("QUANTITY_CONFLICT")
        
        if record.get('delivery_date') and existing_records:
            for existing in existing_records:
                if existing.batch_no == record.get('batch_no') and existing.delivery_date:
                    try:
                        if abs((datetime.strptime(record['delivery_date'], '%Y-%m-%d') - 
                               datetime.strptime(existing.delivery_date, '%Y-%m-%d')).days) > 30:
                            issues.append("跨日异常")
                            suggestions.append("同批次送货日期差异过大，请核实")
                            dirty_types.append("CROSS_DATE")
                        break
                    except:
                        pass
        
        if batch_products and record.get('batch_no') and record.get('product_name'):
            batch_no = record['batch_no']
            if batch_no in batch_products:
                existing_name = batch_products[batch_no]
                if existing_name and existing_name != record.get('product_name'):
                    issues.append(f"产品名称变更: 原名为'{existing_name}', 新名为'{record.get('product_name')}'")
                    suggestions.append(f"同批次{batch_no}产品名称不一致，请核实")
                    dirty_types.append("NAME_CHANGE")
        
        dirty_type = dirty_types[0] if dirty_types else None
        
        if issues:
            return True, dirty_type, "; ".join(issues), "; ".join(suggestions)
        return False, None, "", ""

    @staticmethod
    def detect_repair_record(record: dict, existing_records: list = None, batch_products: dict = None) -> tuple:
        issues = []
        suggestions = []
        dirty_types = []
        
        required_fields = ['repair_no', 'batch_no', 'repair_quantity', 'repair_date']
        missing_fields = []
        for field in required_fields:
            if not record.get(field):
                missing_fields.append(field)
        if missing_fields:
            issues.append(f"缺少{', '.join(missing_fields)}")
            suggestions.append(f"请补充{', '.join(missing_fields)}字段")
            dirty_types.append("MISSING_FIELD")
        
        if record.get('repair_quantity') is not None and record.get('return_quantity') is not None:
            if record['return_quantity'] > record['repair_quantity']:
                issues.append("数量冲突")
                suggestions.append("返还数量不应大于返修数量")
                dirty_types.append("QUANTITY_CONFLICT")
        
        if batch_products and record.get('batch_no') and record.get('product_name'):
            batch_no = record['batch_no']
            if batch_no in batch_products:
                existing_name = batch_products[batch_no]
                if existing_name and existing_name != record.get('product_name'):
                    issues.append(f"产品名称变更: 原名为'{existing_name}', 新名为'{record.get('product_name')}'")
                    suggestions.append(f"同批次{batch_no}产品名称不一致，请核实")
                    dirty_types.append("NAME_CHANGE")
        
        dirty_type = dirty_types[0] if dirty_types else None
        
        if issues:
            return True, dirty_type, "; ".join(issues), "; ".join(suggestions)
        return False, None, "", ""

    @staticmethod
    def detect_deduction_detail(record: dict, existing_records: list = None, batch_products: dict = None) -> tuple:
        issues = []
        suggestions = []
        dirty_types = []
        
        required_fields = ['deduction_no', 'batch_no', 'amount', 'deduction_date']
        missing_fields = []
        for field in required_fields:
            if not record.get(field):
                missing_fields.append(field)
        if missing_fields:
            issues.append(f"缺少{', '.join(missing_fields)}")
            suggestions.append(f"请补充{', '.join(missing_fields)}字段")
            dirty_types.append("MISSING_FIELD")
        
        if record.get('amount') is not None and record.get('amount') <= 0:
            issues.append("金额异常")
            suggestions.append("扣款金额应为正数")
            dirty_types.append("AMOUNT_CONFLICT")
        
        if record.get('quantity') and record.get('unit_price'):
            calc_amount = record['quantity'] * record['unit_price']
            record_amount = record.get('amount')
            if record_amount is not None and abs(calc_amount - record_amount) > 0.01:
                issues.append(f"金额冲突: 计算值{calc_amount}≠记录值{record_amount}")
                suggestions.append("数量×单价≠总金额，请核实")
                dirty_types.append("AMOUNT_CONFLICT")
        
        if batch_products and record.get('batch_no') and record.get('product_name'):
            batch_no = record['batch_no']
            if batch_no in batch_products:
                existing_name = batch_products[batch_no]
                if existing_name and existing_name != record.get('product_name'):
                    issues.append(f"产品名称变更: 原名为'{existing_name}', 新名为'{record.get('product_name')}'")
                    suggestions.append(f"同批次{batch_no}产品名称不一致，请核实")
                    dirty_types.append("NAME_CHANGE")
        
        dirty_type = dirty_types[0] if dirty_types else None
        
        if issues:
            return True, dirty_type, "; ".join(issues), "; ".join(suggestions)
        return False, None, "", ""

    @staticmethod
    def detect_refund_flow(record: dict, existing_records: list = None, batch_products: dict = None) -> tuple:
        issues = []
        suggestions = []
        dirty_types = []
        
        required_fields = ['refund_no', 'batch_no', 'amount', 'refund_date']
        missing_fields = []
        for field in required_fields:
            if not record.get(field):
                missing_fields.append(field)
        if missing_fields:
            issues.append(f"缺少{', '.join(missing_fields)}")
            suggestions.append(f"请补充{', '.join(missing_fields)}字段")
            dirty_types.append("MISSING_FIELD")
        
        if record.get('amount') is not None and record.get('amount') <= 0:
            issues.append("金额异常")
            suggestions.append("退款金额应为正数")
            dirty_types.append("AMOUNT_CONFLICT")
        
        dirty_type = dirty_types[0] if dirty_types else None
        
        if issues:
            return True, dirty_type, "; ".join(issues), "; ".join(suggestions)
        return False, None, "", ""

class ReconciliationEngine:
    def __init__(self, db: Session):
        self.db = db
    
    def _get_batch_products(self) -> dict:
        batch_products = {}
        
        for d in self.db.query(DeliveryOrder).filter(DeliveryOrder.is_withdrawn == False).all():
            if d.batch_no and d.product_name:
                if d.batch_no not in batch_products:
                    batch_products[d.batch_no] = d.product_name
        
        for r in self.db.query(RepairRecord).filter(RepairRecord.is_withdrawn == False).all():
            if r.batch_no and r.product_name:
                if r.batch_no not in batch_products:
                    batch_products[r.batch_no] = r.product_name
        
        return batch_products
    
    def _get_batch_data(self, batch_no: str):
        deliveries = self.db.query(DeliveryOrder).filter(
            DeliveryOrder.batch_no == batch_no,
            DeliveryOrder.is_dirty == False,
            DeliveryOrder.is_withdrawn == False
        ).all()
        
        repairs = self.db.query(RepairRecord).filter(
            RepairRecord.batch_no == batch_no,
            RepairRecord.is_dirty == False,
            RepairRecord.is_withdrawn == False
        ).all()
        
        deductions = self.db.query(DeductionDetail).filter(
            DeductionDetail.batch_no == batch_no,
            DeductionDetail.is_dirty == False,
            DeductionDetail.is_withdrawn == False
        ).all()
        
        refunds = self.db.query(RefundFlow).filter(
            RefundFlow.batch_no == batch_no,
            RefundFlow.is_dirty == False,
            RefundFlow.is_withdrawn == False
        ).all()
        
        compensations = self.db.query(CompensationRecord).filter(
            CompensationRecord.batch_no == batch_no
        ).all()
        
        return deliveries, repairs, deductions, refunds, compensations
    
    def _calculate_totals(self, deliveries, repairs, deductions, refunds, compensations):
        total_delivery = sum(d.quantity or 0 for d in deliveries)
        total_repair = sum(r.repair_quantity or 0 for r in repairs)
        total_return = sum(r.return_quantity or 0 for r in repairs)
        total_deduction = sum(d.amount or 0 for d in deductions)
        total_refund = sum(r.amount or 0 for r in refunds)
        total_compensation = sum(c.amount or 0 for c in compensations)
        
        return {
            'total_delivery': total_delivery,
            'total_repair': total_repair,
            'total_return': total_return,
            'total_deduction': total_deduction,
            'total_refund': total_refund,
            'total_compensation': total_compensation
        }
    
    def _detect_batch_discrepancies(self, batch_no, deliveries, repairs, deductions, refunds, compensations, totals):
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
        batch_info = self.db.query(BatchInfo).filter(BatchInfo.batch_no == batch_no).first()
        if batch_info and batch_info.is_frozen:
            return None
        
        deliveries, repairs, deductions, refunds, compensations = self._get_batch_data(batch_no)
        
        if not deliveries and not repairs:
            return None
        
        totals = self._calculate_totals(deliveries, repairs, deductions, refunds, compensations)
        
        discrepancies, discrepancy_amount = self._detect_batch_discrepancies(
            batch_no, deliveries, repairs, deductions, refunds, compensations, totals
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
            total_compensation_amount=totals['total_compensation'],
            net_settlement=totals['total_deduction'] - totals['total_refund'] - totals['total_compensation'],
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
        
        for c in compensations:
            detail = ReconciliationDetail(
                recon_id=recon_result.id,
                source_type="COMPENSATION",
                source_id=c.id,
                source_no=c.compensation_no,
                quantity=0,
                amount=c.amount,
                date=c.created_at.strftime('%Y-%m-%d') if c.created_at else None,
                remark=c.reason
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
