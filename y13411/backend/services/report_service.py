import os
import json
import csv
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from models import ImportRecord, ImportItem
from config import REPORT_DIR
from utils import generate_batch_no


def generate_import_report(
    db: Session, import_record_id: int, format: str = "json"
) -> Dict[str, Any]:
    record = db.query(ImportRecord).filter(ImportRecord.id == import_record_id).first()
    if not record:
        return {"error": "导入记录不存在"}

    items = db.query(ImportItem).filter(ImportItem.import_record_id == record.id).all()
    new_items = [it for it in items if it.status == "new"]
    skipped_items = [it for it in items if it.status == "skipped"]
    updated_items = [it for it in items if it.status == "updated"]
    error_items = [it for it in items if it.status == "error"]

    report = {
        "报告标题": "微分方程参数沙盘导入报告",
        "生成时间": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "批次信息": {
            "批次号": record.batch_no,
            "文件名": record.file_name,
            "导入时间": record.imported_at.strftime("%Y-%m-%d %H:%M:%S") if record.imported_at else "",
            "导入人": record.imported_by or "系统",
            "导入类型": record.import_type,
        },
        "统计汇总": {
            "总记录数": record.total_count,
            "新增数量": record.new_count,
            "跳过数量": record.skipped_count,
            "更新数量": record.updated_count,
            "错误数量": record.error_count,
        },
        "稳定性检查": {
            "排序是否稳定": "是" if record.sort_stable else "否",
            "风险提示": (
                "数据排序稳定，同一批文件重复导入结果一致。"
                if record.sort_stable
                else "数据排序不稳定，该批次已中止导入，请根据错误提示补齐材料后重新导入。"
            ),
        },
        "幂等性说明": {
            "状态": record.status,
            "说明": (
                "本系统支持重复导入检测：同一文件通过哈希校验识别，重复导入时会自动跳过，"
                "不会重复计数。报告中明确区分新增与跳过内容。"
                if record.status != "skipped_duplicate"
                else record.error_message or "该批次为重复导入，已全部跳过。"
            ),
        },
        "新增明细": [
            {
                "行号": it.row_no,
                "关键字": it.item_key,
                "详情": it.detail,
                "备注": it.remark,
            }
            for it in new_items
        ],
        "跳过明细": [
            {
                "行号": it.row_no,
                "关键字": it.item_key,
                "详情": it.detail,
                "备注": it.remark,
            }
            for it in skipped_items
        ],
        "更新明细": [
            {
                "行号": it.row_no,
                "关键字": it.item_key,
                "详情": it.detail,
                "备注": it.remark,
            }
            for it in updated_items
        ],
        "错误明细": [
            {
                "行号": it.row_no,
                "关键字": it.item_key,
                "详情": it.detail,
                "备注": it.remark,
            }
            for it in error_items
        ],
        "值班提示": {
            "如需复核": f"请在系统中使用复核入口查看批次号 {record.batch_no} 对应的参数、单位和边界条件。",
            "异常处理": (
                "如遇排序不稳定错误，请根据'缺失材料'提示补齐原始底单和录入顺序说明后重新导入。"
                if not record.sort_stable
                else "本批次导入流程正常。"
            ),
        },
    }

    if record.status == "aborted_sort_unstable":
        report["缺失材料"] = record.missing_materials or "请联系数据录入同事确认。"
        report["错误信息"] = record.error_message or ""

    filename = f"report_{record.batch_no}.{format}"
    filepath = os.path.join(REPORT_DIR, filename)

    if format == "json":
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
    elif format == "csv":
        with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["微分方程参数沙盘导入报告"])
            writer.writerow(["生成时间", report["生成时间"]])
            writer.writerow([])
            writer.writerow(["批次号", record.batch_no])
            writer.writerow(["文件名", record.file_name])
            writer.writerow([])
            writer.writerow(["类别", "数量"])
            writer.writerow(["总记录数", record.total_count])
            writer.writerow(["新增", record.new_count])
            writer.writerow(["跳过", record.skipped_count])
            writer.writerow(["更新", record.updated_count])
            writer.writerow(["错误", record.error_count])
            writer.writerow([])
            writer.writerow(["新增明细"])
            writer.writerow(["行号", "关键字", "备注"])
            for it in new_items:
                writer.writerow([it.row_no, it.item_key, it.remark])
            writer.writerow([])
            writer.writerow(["跳过明细"])
            writer.writerow(["行号", "关键字", "备注"])
            for it in skipped_items:
                writer.writerow([it.row_no, it.item_key, it.remark])

    report["报告文件"] = filepath
    return report


def list_import_records(
    db: Session, skip: int = 0, limit: int = 100,
    status: Optional[str] = None, batch_no: Optional[str] = None
) -> List[ImportRecord]:
    q = db.query(ImportRecord)
    if status:
        q = q.filter(ImportRecord.status == status)
    if batch_no:
        q = q.filter(ImportRecord.batch_no.contains(batch_no))
    return q.order_by(ImportRecord.imported_at.desc()).offset(skip).limit(limit).all()
