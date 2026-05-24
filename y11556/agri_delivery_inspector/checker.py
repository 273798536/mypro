from datetime import datetime
from sqlalchemy import and_, or_
from .config import get_session
from .models import ImportBatch, ImportRecord, StandardData, CheckResult


def check_format_for_batch(batch_no, db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        batch = session.query(ImportBatch).filter(
            ImportBatch.batch_no == batch_no
        ).first()
        
        if not batch:
            return {
                "success": False,
                "message": f"批次不存在: {batch_no}"
            }
        
        records = session.query(ImportRecord).filter(
            ImportRecord.batch_id == batch.id,
            ImportRecord.is_deleted == False
        ).all()
        
        check_results = []
        
        for record in records:
            std = record.std_data
            if not std:
                continue
            
            if not std.order_no:
                result = CheckResult(
                    record_id=record.id,
                    check_type="format",
                    check_item="order_no",
                    is_passed=False,
                    message="订单号为空",
                    severity="error"
                )
                session.add(result)
                check_results.append({
                    "record_id": record.id,
                    "source_row": record.source_row,
                    "check_item": "order_no",
                    "passed": False,
                    "message": "订单号为空"
                })
            
            if not std.store_code:
                result = CheckResult(
                    record_id=record.id,
                    check_type="format",
                    check_item="store_code",
                    is_passed=False,
                    message="门店编码为空",
                    severity="error"
                )
                session.add(result)
                check_results.append({
                    "record_id": record.id,
                    "source_row": record.source_row,
                    "check_item": "store_code",
                    "passed": False,
                    "message": "门店编码为空"
                })
            
            if not std.product_code:
                result = CheckResult(
                    record_id=record.id,
                    check_type="format",
                    check_item="product_code",
                    is_passed=False,
                    message="商品编码为空",
                    severity="error"
                )
                session.add(result)
                check_results.append({
                    "record_id": record.id,
                    "source_row": record.source_row,
                    "check_item": "product_code",
                    "passed": False,
                    "message": "商品编码为空"
                })
            
            if std.quantity is None or std.quantity <= 0:
                result = CheckResult(
                    record_id=record.id,
                    check_type="format",
                    check_item="quantity",
                    is_passed=False,
                    message=f"数量异常: {std.quantity}",
                    severity="error"
                )
                session.add(result)
                check_results.append({
                    "record_id": record.id,
                    "source_row": record.source_row,
                    "check_item": "quantity",
                    "passed": False,
                    "message": f"数量异常: {std.quantity}"
                })
            
            if std.data_type == "store_order" and not std.delivery_date:
                result = CheckResult(
                    record_id=record.id,
                    check_type="format",
                    check_item="delivery_date",
                    is_passed=False,
                    message="配送日期为空",
                    severity="warning"
                )
                session.add(result)
                check_results.append({
                    "record_id": record.id,
                    "source_row": record.source_row,
                    "check_item": "delivery_date",
                    "passed": False,
                    "message": "配送日期为空"
                })
        
        session.commit()
        
        failed_count = len([r for r in check_results if not r["passed"]])
        
        return {
            "success": True,
            "message": f"格式校验完成: 检查 {len(records)} 条记录，发现 {failed_count} 个错误",
            "batch_no": batch_no,
            "checked_count": len(records),
            "failed_count": failed_count,
            "check_results": check_results[:50]
        }
        
    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "message": f"格式校验失败: {str(e)}"
        }
    finally:
        session.close()


def check_duplicates_for_batch(batch_no, db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        batch = session.query(ImportBatch).filter(
            ImportBatch.batch_no == batch_no
        ).first()
        
        if not batch:
            return {
                "success": False,
                "message": f"批次不存在: {batch_no}"
            }
        
        records = session.query(ImportRecord).filter(
            ImportRecord.batch_id == batch.id,
            ImportRecord.is_deleted == False
        ).all()
        
        check_results = []
        seen_keys = {}
        
        for record in records:
            std = record.std_data
            if not std or not std.order_no:
                continue
            
            key = f"{std.data_type}:{std.order_no}:{std.product_code}"
            
            if key in seen_keys:
                prev_row = seen_keys[key]
                result = CheckResult(
                    record_id=record.id,
                    check_type="duplicate",
                    check_item="batch_internal",
                    is_passed=False,
                    message=f"批次内重复: 与行号 {prev_row} 重复，订单号={std.order_no}，商品={std.product_code}",
                    severity="error"
                )
                session.add(result)
                check_results.append({
                    "record_id": record.id,
                    "source_row": record.source_row,
                    "check_item": "batch_internal",
                    "passed": False,
                    "message": f"批次内重复: 与行号 {prev_row} 重复"
                })
            else:
                seen_keys[key] = record.source_row
            
            existing = session.query(StandardData).join(ImportRecord).filter(
                StandardData.order_no == std.order_no,
                StandardData.product_code == std.product_code,
                StandardData.data_type == std.data_type,
                ImportRecord.batch_id != batch.id,
                ImportRecord.is_deleted == False
            ).first()
            
            if existing:
                existing_batch = existing.record.batch
                result = CheckResult(
                    record_id=record.id,
                    check_type="duplicate",
                    check_item="cross_batch",
                    is_passed=False,
                    message=f"跨批次重复: 订单号={std.order_no}，商品={std.product_code} 已在批次 {existing_batch.batch_no} 存在",
                    severity="warning"
                )
                session.add(result)
                check_results.append({
                    "record_id": record.id,
                    "source_row": record.source_row,
                    "check_item": "cross_batch",
                    "passed": False,
                    "message": f"跨批次重复: 批次 {existing_batch.batch_no}"
                })
        
        session.commit()
        
        return {
            "success": True,
            "message": f"重复校验完成: 发现 {len(check_results)} 个重复项",
            "batch_no": batch_no,
            "duplicate_count": len(check_results),
            "check_results": check_results
        }
        
    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "message": f"重复校验失败: {str(e)}"
        }
    finally:
        session.close()


def check_cross_validation(batch_no=None, db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        if batch_no:
            batch = session.query(ImportBatch).filter(
                ImportBatch.batch_no == batch_no
            ).first()
            
            if not batch:
                return {
                    "success": False,
                    "message": f"批次不存在: {batch_no}"
                }
            
            std_records = session.query(StandardData).join(ImportRecord).filter(
                ImportRecord.batch_id == batch.id,
                ImportRecord.is_deleted == False
            ).all()
        else:
            std_records = session.query(StandardData).join(ImportRecord).filter(
                ImportRecord.is_deleted == False
            ).all()
        
        check_results = []
        
        store_orders = {}
        sign_receipts = {}
        
        for std in std_records:
            key = f"{std.order_no}:{std.product_code}"
            if std.data_type == "store_order":
                store_orders[key] = std
            elif std.data_type == "sign_receipt":
                sign_receipts[key] = std
        
        for key, order in store_orders.items():
            if key in sign_receipts:
                receipt = sign_receipts[key]
                
                if abs(order.quantity - receipt.quantity) > 0.001:
                    result = CheckResult(
                        record_id=order.record_id,
                        check_type="cross_validate",
                        check_item="quantity_match",
                        is_passed=False,
                        message=f"数量不一致: 订单数量={order.quantity}，签收数量={receipt.quantity}",
                        severity="error"
                    )
                    session.add(result)
                    check_results.append({
                        "order_no": order.order_no,
                        "product_code": order.product_code,
                        "check_item": "quantity_match",
                        "passed": False,
                        "message": f"订单:{order.quantity} vs 签收:{receipt.quantity}"
                    })
                
                if order.amount and receipt.amount and abs(order.amount - receipt.amount) > 0.01:
                    result = CheckResult(
                        record_id=order.record_id,
                        check_type="cross_validate",
                        check_item="amount_match",
                        is_passed=False,
                        message=f"金额不一致: 订单金额={order.amount}，签收金额={receipt.amount}",
                        severity="error"
                    )
                    session.add(result)
                    check_results.append({
                        "order_no": order.order_no,
                        "product_code": order.product_code,
                        "check_item": "amount_match",
                        "passed": False,
                        "message": f"订单:{order.amount} vs 签收:{receipt.amount}"
                    })
            else:
                result = CheckResult(
                    record_id=order.record_id,
                    check_type="cross_validate",
                    check_item="has_sign_receipt",
                    is_passed=False,
                    message=f"订单缺少对应签收记录",
                    severity="warning"
                )
                session.add(result)
                check_results.append({
                    "order_no": order.order_no,
                    "product_code": order.product_code,
                    "check_item": "has_sign_receipt",
                    "passed": False,
                    "message": "缺少签收记录"
                })
        
        for key, receipt in sign_receipts.items():
            if key not in store_orders:
                result = CheckResult(
                    record_id=receipt.record_id,
                    check_type="cross_validate",
                    check_item="has_store_order",
                    is_passed=False,
                    message=f"签收记录缺少对应订单",
                    severity="warning"
                )
                session.add(result)
                check_results.append({
                    "order_no": receipt.order_no,
                    "product_code": receipt.product_code,
                    "check_item": "has_store_order",
                    "passed": False,
                    "message": "缺少订单记录"
                })
        
        session.commit()
        
        return {
            "success": True,
            "message": f"交叉校验完成: 发现 {len(check_results)} 个不一致项",
            "checked_pairs": len(store_orders) + len(sign_receipts),
            "issue_count": len(check_results),
            "check_results": check_results[:100]
        }
        
    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "message": f"交叉校验失败: {str(e)}"
        }
    finally:
        session.close()


def check_credit_substitute(batch_no=None, db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        query = session.query(StandardData).join(ImportRecord).filter(
            ImportRecord.is_deleted == False,
            or_(StandardData.is_credit == True, StandardData.is_substitute == True)
        )
        
        if batch_no:
            batch = session.query(ImportBatch).filter(
                ImportBatch.batch_no == batch_no
            ).first()
            if not batch:
                return {"success": False, "message": f"批次不存在: {batch_no}"}
            query = query.filter(ImportRecord.batch_id == batch.id)
        
        std_records = query.all()
        
        check_results = []
        
        for std in std_records:
            if std.is_credit:
                if std.credit_amount is None or std.credit_amount <= 0:
                    result = CheckResult(
                        record_id=std.record_id,
                        check_type="credit_substitute",
                        check_item="credit_amount",
                        is_passed=False,
                        message="赊销但赊销金额为空或异常",
                        severity="error"
                    )
                    session.add(result)
                    check_results.append({
                        "order_no": std.order_no,
                        "check_type": "credit",
                        "check_item": "credit_amount",
                        "message": "赊销金额异常"
                    })
                
                if std.credit_due_date is None:
                    result = CheckResult(
                        record_id=std.record_id,
                        check_type="credit_substitute",
                        check_item="credit_due_date",
                        is_passed=False,
                        message="赊销但到期日期为空",
                        severity="warning"
                    )
                    session.add(result)
                    check_results.append({
                        "order_no": std.order_no,
                        "check_type": "credit",
                        "check_item": "credit_due_date",
                        "message": "缺少到期日期"
                    })
            
            if std.is_substitute:
                if not std.substitute_from or not std.substitute_to:
                    result = CheckResult(
                        record_id=std.record_id,
                        check_type="credit_substitute",
                        check_item="substitute_info",
                        is_passed=False,
                        message="缺货替代但原商品或替代商品信息不全",
                        severity="error"
                    )
                    session.add(result)
                    check_results.append({
                        "order_no": std.order_no,
                        "check_type": "substitute",
                        "check_item": "substitute_info",
                        "message": "替代信息不全"
                    })
        
        session.commit()
        
        return {
            "success": True,
            "message": f"赊销替代校验完成: 检查 {len(std_records)} 条记录，发现 {len(check_results)} 个问题",
            "checked_count": len(std_records),
            "issue_count": len(check_results),
            "check_results": check_results
        }
        
    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "message": f"赊销替代校验失败: {str(e)}"
        }
    finally:
        session.close()


def run_all_checks(batch_no=None, db_path=None):
    results = {
        "format": check_format_for_batch(batch_no, db_path) if batch_no else {"success": False, "message": "格式校验需要指定批次"},
        "duplicate": check_duplicates_for_batch(batch_no, db_path) if batch_no else {"success": False, "message": "重复校验需要指定批次"},
        "cross_validate": check_cross_validation(batch_no, db_path),
        "credit_substitute": check_credit_substitute(batch_no, db_path)
    }
    
    total_issues = 0
    for r in results.values():
        if r.get("success"):
            total_issues += r.get("failed_count", 0) + r.get("duplicate_count", 0) + r.get("issue_count", 0)
    
    return {
        "success": True,
        "message": f"全部校验完成，共发现 {total_issues} 个问题",
        "batch_no": batch_no,
        "total_issues": total_issues,
        "details": results
    }


def get_check_results(batch_no=None, check_type=None, only_failed=False, db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        query = session.query(CheckResult).join(ImportRecord)
        
        if batch_no:
            batch = session.query(ImportBatch).filter(
                ImportBatch.batch_no == batch_no
            ).first()
            if not batch:
                return {"success": False, "message": f"批次不存在: {batch_no}"}
            query = query.filter(ImportRecord.batch_id == batch.id)
        
        if check_type:
            query = query.filter(CheckResult.check_type == check_type)
        
        if only_failed:
            query = query.filter(CheckResult.is_passed == False, CheckResult.is_overridden == False)
        
        results = query.order_by(CheckResult.checked_at.desc()).all()
        
        formatted_results = []
        for r in results:
            formatted_results.append({
                "id": r.id,
                "record_id": r.record_id,
                "source_row": r.record.source_row if r.record else None,
                "check_type": r.check_type,
                "check_item": r.check_item,
                "is_passed": r.is_passed,
                "message": r.message,
                "severity": r.severity,
                "checked_at": r.checked_at.isoformat() if r.checked_at else None,
                "is_overridden": r.is_overridden,
                "override_reason": r.override_reason
            })
        
        return {
            "success": True,
            "count": len(formatted_results),
            "results": formatted_results
        }
        
    finally:
        session.close()
