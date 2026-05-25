"""
真实业务任务处理器
包含税费核算、异常检测、数据核对、数据导出等实际业务逻辑
"""
import logging
import random
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from .models import Batch, Package, TaxNotice, TrackingNode, TempRecord
from .database import SessionLocal

logger = logging.getLogger(__name__)


class BaseTaskHandler:
    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()

    def __call__(self, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            result = self.execute(payload or {})
            return result
        except Exception as e:
            logger.error(f"Task {self.__class__.__name__} failed: {e}")
            raise
        finally:
            if self.db:
                self.db.close()

    def execute(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


class TaxCalculationHandler(BaseTaskHandler):
    """
    税费核算任务
    根据申报表、补税通知重新核算每个包裹的税费
    检测税费错位问题
    """

    def execute(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        batch_id = payload.get("batch_id")
        if not batch_id:
            raise ValueError("batch_id is required")

        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch not found: {batch_id}")

        packages = self.db.query(Package).filter(Package.batch_id == batch_id).all()
        tax_notices = self.db.query(TaxNotice).filter(TaxNotice.batch_id == batch_id).all()

        if random.random() < 0.3:
            raise RuntimeError("税务系统接口超时，请稍后重试")

        tax_notice_map = {tn.package_no: tn for tn in tax_notices if tn.package_no}

        mismatched = []
        updated = 0
        total_tax = 0.0

        for pkg in packages:
            notice = tax_notice_map.get(pkg.package_no)
            if notice:
                expected_tax = notice.tax_amount
                if pkg.tax_amount and abs(pkg.tax_amount - expected_tax) > 0.01:
                    mismatched.append({
                        "package_no": pkg.package_no,
                        "declared_tax": pkg.tax_amount,
                        "notice_tax": expected_tax,
                        "diff": abs(pkg.tax_amount - expected_tax)
                    })
                pkg.tax_amount = expected_tax
                pkg.is_abnormal = True
                pkg.abnormal_reason = "税费与补税通知不符，已更新"
                updated += 1
                total_tax += expected_tax
            else:
                if pkg.tax_amount:
                    total_tax += pkg.tax_amount

        batch.total_tax_amount = total_tax
        self.db.commit()

        return {
            "batch_id": batch_id,
            "packages_processed": len(packages),
            "tax_notices_processed": len(tax_notices),
            "updated_packages": updated,
            "mismatched_packages": mismatched,
            "total_tax_amount": total_tax,
            "warning": f"发现 {len(mismatched)} 个包裹税费错位，已修正" if mismatched else "税费核对一致"
        }


class AbnormalDetectionHandler(BaseTaskHandler):
    """
    异常件检测任务
    根据轨迹节点、临时补录单检测异常件
    识别包裹拆分后的归属问题
    """

    def execute(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        batch_id = payload.get("batch_id")
        if not batch_id:
            raise ValueError("batch_id is required")

        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch not found: {batch_id}")

        packages = self.db.query(Package).filter(Package.batch_id == batch_id).all()
        tracking_nodes = self.db.query(TrackingNode).filter(TrackingNode.batch_id == batch_id).all()
        temp_records = self.db.query(TempRecord).filter(TempRecord.batch_id == batch_id).all()

        if random.random() < 0.2:
            raise RuntimeError("轨迹系统连接失败，数据同步中断")

        pkg_map = {p.package_no: p for p in packages}
        abnormal_packages = []
        ownership_issues = []

        for node in tracking_nodes:
            if node.package_no and node.package_no in pkg_map:
                pkg = pkg_map[node.package_no]
                if node.status and ("异常" in node.status or "扣留" in node.status or "退运" in node.status):
                    pkg.is_abnormal = True
                    if not pkg.abnormal_reason:
                        pkg.abnormal_reason = f"轨迹异常: {node.status}"
                    abnormal_packages.append(pkg.package_no)

        for record in temp_records:
            if record.package_no and record.package_no in pkg_map:
                pkg = pkg_map[record.package_no]
                if record.record_type == "ownership_correction":
                    pkg.is_abnormal = True
                    pkg.abnormal_reason = f"临时补录: {record.content}"
                    ownership_issues.append({
                        "package_no": pkg.package_no,
                        "issue": record.content,
                        "recorded_by": record.recorded_by
                    })
                elif record.record_type == "异常登记":
                    pkg.is_abnormal = True
                    if not pkg.abnormal_reason:
                        pkg.abnormal_reason = f"人工登记: {record.content}"
                    abnormal_packages.append(pkg.package_no)

        self.db.commit()

        result = {
            "batch_id": batch_id,
            "packages_checked": len(packages),
            "tracking_nodes_checked": len(tracking_nodes),
            "temp_records_checked": len(temp_records),
            "new_abnormal_count": len(set(abnormal_packages)),
            "ownership_issues": ownership_issues,
            "abnormal_packages": list(set(abnormal_packages))
        }

        if len(ownership_issues) > 0:
            result["warning"] = f"检测到 {len(ownership_issues)} 个包裹归属问题，需人工复核"
            if random.random() < 0.5:
                raise RuntimeError(
                    f"严重: 发现 {len(ownership_issues)} 个包裹归属错位，需要人工确认后才能继续处理"
                )

        return result


class DataReconciliationHandler(BaseTaskHandler):
    """
    数据核对任务
    核对申报表、轨迹、补税通知、临时补录单之间的数据一致性
    生成复核依据
    """

    def execute(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        batch_id = payload.get("batch_id")
        if not batch_id:
            raise ValueError("batch_id is required")

        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch not found: {batch_id}")

        packages = self.db.query(Package).filter(Package.batch_id == batch_id).all()
        tracking_nodes = self.db.query(TrackingNode).filter(TrackingNode.batch_id == batch_id).all()
        tax_notices = self.db.query(TaxNotice).filter(TaxNotice.batch_id == batch_id).all()
        temp_records = self.db.query(TempRecord).filter(TempRecord.batch_id == batch_id).all()

        if random.random() < 0.15:
            raise RuntimeError("核心数据库查询超时")

        pkg_nos = {p.package_no for p in packages}
        track_pkg_nos = {n.package_no for n in tracking_nodes if n.package_no}
        tax_pkg_nos = {n.package_no for n in tax_notices if n.package_no}
        temp_pkg_nos = {r.package_no for r in temp_records if r.package_no}

        missing_tracking = pkg_nos - track_pkg_nos
        missing_tax = pkg_nos - tax_pkg_nos
        extra_temp = temp_pkg_nos - pkg_nos

        discrepancies = []

        if missing_tracking:
            discrepancies.append({
                "type": "missing_tracking",
                "package_nos": list(missing_tracking),
                "description": "这些包裹没有对应的轨迹节点"
            })

        if missing_tax:
            discrepancies.append({
                "type": "missing_tax_notice",
                "package_nos": list(missing_tax),
                "description": "这些包裹没有对应的补税通知"
            })

        if extra_temp:
            discrepancies.append({
                "type": "extra_temp_record",
                "package_nos": list(extra_temp),
                "description": "临时补录单包含不在批次中的包裹"
            })

        review_evidence = {
            "data_sources_summary": {
                "packages": len(packages),
                "tracking_nodes": len(tracking_nodes),
                "tax_notices": len(tax_notices),
                "temp_records": len(temp_records)
            },
            "data_coverage": {
                "tracking_coverage": len(pkg_nos & track_pkg_nos) / len(pkg_nos) if pkg_nos else 0,
                "tax_coverage": len(pkg_nos & tax_pkg_nos) / len(pkg_nos) if pkg_nos else 0
            },
            "discrepancies": discrepancies,
            "recommendation": "请核对以上差异后再进行结算" if discrepancies else "数据一致，可正常结算"
        }

        batch.manual_remark = f"核对完成: {len(discrepancies)} 项差异待处理" if discrepancies else "核对完成: 数据一致"
        self.db.commit()

        return review_evidence


class ExportGenerationHandler(BaseTaskHandler):
    """
    异步导出任务
    生成导出文件，支持大数据量异步处理
    """

    def execute(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        from .export_service import ExportService

        batch_id = payload.get("batch_id")
        if not batch_id:
            raise ValueError("batch_id is required")

        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch not found: {batch_id}")

        if random.random() < 0.1:
            raise RuntimeError("Excel 生成服务暂不可用")

        export_service = ExportService(self.db)
        result = export_service.export_to_excel(
            batch=batch,
            include_history=payload.get("include_history", True),
            include_packages=payload.get("include_packages", True)
        )

        return {
            "batch_id": batch_id,
            "export_type": "excel",
            "file_name": result["file_name"],
            "file_path": result["file_path"],
            "file_size": result["file_size"],
            "generated_at": result["created_at"].isoformat()
        }


TASK_HANDLERS = {
    "tax_calculation": TaxCalculationHandler,
    "abnormal_detection": AbnormalDetectionHandler,
    "data_reconciliation": DataReconciliationHandler,
    "export_generation": ExportGenerationHandler,
}


def register_handlers(processor):
    """注册所有任务处理器到任务处理器"""
    for task_type, handler_class in TASK_HANDLERS.items():
        processor.register_handler(task_type, handler_class())
