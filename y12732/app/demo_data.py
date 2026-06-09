from sqlalchemy.orm import Session
from typing import Dict, Any, List
import json

from . import crud, schemas, reporting


SAMPLE_RECORDS_BATCH1: List[Dict[str, Any]] = [
    {
        "row_no": 1,
        "indicator_name": "社会消费品零售总额同比",
        "indicator_code": "CONS_YOY",
        "period": "2024-12",
        "value": 7.4,
        "unit": "%",
        "first_derivative": 0.8,
        "prev_first_derivative_sign": "+",
        "second_derivative": -0.3,
        "prev_second_derivative_sign": "+"
    },
    {
        "row_no": 2,
        "indicator_name": "固定资产投资累计同比",
        "indicator_code": "FAI_YOY",
        "period": "2024-12",
        "value": 3.2,
        "unit": "%",
        "first_derivative": -0.5,
        "prev_first_derivative_sign": "+",
        "second_derivative": -0.2,
        "prev_second_derivative_sign": "-"
    },
    {
        "row_no": 3,
        "indicator_name": "工业增加值同比",
        "indicator_code": "IND_YOY",
        "period": "2024-12",
        "value": 6.8,
        "unit": None,
        "first_derivative": 0.4,
        "prev_first_derivative_sign": "+",
        "second_derivative": 0.1,
        "prev_second_derivative_sign": "+"
    },
    {
        "row_no": 4,
        "indicator_name": "出口同比（美元计）",
        "indicator_code": "EXP_YOY",
        "period": "2024-12",
        "value": 2.3,
        "unit": "%",
        "first_derivative": -1.2,
        "prev_first_derivative_sign": "+",
        "second_derivative": 0.5,
        "prev_second_derivative_sign": "-"
    },
    {
        "row_no": 5,
        "indicator_name": "CPI同比",
        "indicator_code": "CPI_YOY",
        "period": "2024-12",
        "value": None,
        "unit": "%",
        "first_derivative": 0.0,
        "prev_first_derivative_sign": "-",
        "second_derivative": None,
        "prev_second_derivative_sign": "+"
    },
    {
        "row_no": 6,
        "indicator_name": "PPI同比",
        "indicator_code": "PPI_YOY",
        "period": "2024-12",
        "value": -2.1,
        "unit": "%",
        "first_derivative": 0.3,
        "prev_first_derivative_sign": "-",
        "second_derivative": 0.2,
        "prev_second_derivative_sign": "-"
    },
    {
        "row_no": 7,
        "indicator_name": "M2同比",
        "indicator_code": "M2_YOY",
        "period": "2024-12",
        "value": 9.5,
        "unit": "%",
        "first_derivative": 0.1,
        "prev_first_derivative_sign": "+",
        "second_derivative": 0.0,
        "prev_second_derivative_sign": "+"
    }
]

SAMPLE_RECORDS_BATCH2: List[Dict[str, Any]] = [
    {
        "row_no": 1,
        "indicator_name": "社会消费品零售总额同比",
        "indicator_code": "CONS_YOY",
        "period": "2025-01",
        "value": 5.6,
        "unit": "%",
        "first_derivative": -1.8,
        "prev_first_derivative_sign": "+",
        "second_derivative": -2.6,
        "prev_second_derivative_sign": "-"
    },
    {
        "row_no": 2,
        "indicator_name": "固定资产投资累计同比",
        "indicator_code": "FAI_YOY",
        "period": "2025-01",
        "value": 3.0,
        "unit": "%",
        "first_derivative": -0.2,
        "prev_first_derivative_sign": "-",
        "second_derivative": 0.3,
        "prev_second_derivative_sign": "-"
    },
    {
        "row_no": 3,
        "indicator_name": "工业增加值同比",
        "indicator_code": "IND_YOY",
        "period": "2025-01",
        "value": 7.2,
        "unit": "%",
        "first_derivative": 0.4,
        "prev_first_derivative_sign": "+",
        "second_derivative": 0.0,
        "prev_second_derivative_sign": "+"
    },
    {
        "row_no": 4,
        "indicator_name": "出口同比（美元计）",
        "indicator_code": "EXP_YOY",
        "period": "2025-01",
        "value": 1.5,
        "unit": "%",
        "first_derivative": -0.8,
        "prev_first_derivative_sign": "-",
        "second_derivative": 0.4,
        "prev_second_derivative_sign": "+"
    },
    {
        "row_no": 5,
        "indicator_name": "CPI同比",
        "indicator_code": "CPI_YOY",
        "period": "2025-01",
        "value": 0.3,
        "unit": "%",
        "first_derivative": 0.3,
        "prev_first_derivative_sign": "0",
        "second_derivative": 0.3,
        "prev_second_derivative_sign": None
    },
    {
        "row_no": 6,
        "indicator_name": "新增社融（亿元）",
        "indicator_code": "TSF_NEW",
        "period": "2025-01",
        "value": 65000,
        "unit": None,
        "first_derivative": 12000,
        "prev_first_derivative_sign": "+",
        "second_derivative": 3000,
        "prev_second_derivative_sign": "+"
    }
]


def seed_all(db: Session) -> Dict[str, Any]:
    results = {}

    batch1 = crud.create_batch(db, schemas.BatchCreate(
        source_file="derivative_table_202412.csv",
        imported_by="投研助理-张三",
        remark="2024年12月导数符号变化表，首次导入"
    ))
    import1 = crud.import_records(db, batch1.id, SAMPLE_RECORDS_BATCH1)
    results["batch1"] = {
        "batch_id": batch1.id,
        "batch_no": batch1.batch_no,
        "import_result": import1.model_dump()
    }

    crud.update_batch_status(db, batch1.id, schemas.BatchStatusUpdate(
        new_status="reviewing",
        operator="投研助理-张三",
        comment="开始复核异常记录"
    ))

    anomaly_records = crud.list_records(db, batch_id=batch1.id, only_anomaly=True)
    if anomaly_records:
        r3 = anomaly_records[0]
        crud.fix_record(db, r3.id, schemas.RecordFix(
            unit="%",
            reviewer="投研助理-张三",
            comment="对照Wind数据库确认单位为%"
        ))
        results["fixed_record_1"] = {
            "record_id": r3.id,
            "indicator_name": r3.indicator_name,
            "fix_note": "补上缺失单位%"
        }

        if len(anomaly_records) > 1:
            r5 = anomaly_records[1]
            crud.review_record(db, r5.id, schemas.RecordReview(
                action="review",
                reviewer="投研助理-张三",
                comment="CPI数据暂缺，等统计局更新"
            ))
            results["reviewed_record_2"] = {
                "record_id": r5.id,
                "indicator_name": r5.indicator_name,
                "review_note": "标记为复核中，等待数据源更新"
            }

    all_records = crud.list_records(db, batch_id=batch1.id)
    for r in all_records:
        if not r.is_anomaly and r.status == "pending":
            crud.review_record(db, r.id, schemas.RecordReview(
                action="confirm",
                reviewer="投研助理-张三",
                comment="数据正常，导数符号变化符合预期"
            ))

    crud.update_batch_status(db, batch1.id, schemas.BatchStatusUpdate(
        new_status="reviewed",
        operator="投研助理-张三",
        comment="本轮复核完成，生成报告"
    ))

    snapshot1 = reporting.create_report_snapshot(
        db, batch1.id, created_by="投研助理-张三",
        title="2024年12月导数符号变化分析报告"
    )
    results["report_snapshot_1"] = {
        "snapshot_id": snapshot1.id if snapshot1 else None,
        "title": snapshot1.title if snapshot1 else None
    }

    batch2 = crud.create_batch(db, schemas.BatchCreate(
        source_file="derivative_table_202501.csv",
        imported_by="投研助理-张三",
        remark="2025年1月导数符号变化表，第二轮导入"
    ))
    import2 = crud.import_records(db, batch2.id, SAMPLE_RECORDS_BATCH2)
    results["batch2"] = {
        "batch_id": batch2.id,
        "batch_no": batch2.batch_no,
        "import_result": import2.model_dump()
    }

    results["summary"] = {
        "total_batches": 2,
        "total_records_batch1": len(SAMPLE_RECORDS_BATCH1),
        "total_records_batch2": len(SAMPLE_RECORDS_BATCH2),
        "note": "示例数据已就绪。可通过 trace_record 接口（记录ID可从 list_records 获取）验证追溯链路。"
    }

    return results
