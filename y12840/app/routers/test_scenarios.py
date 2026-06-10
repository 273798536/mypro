from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.sample_import import import_samples

router = APIRouter(prefix="/api/test", tags=["test-scenarios"])


@router.post("/duplicate-import")
def test_duplicate_import_scenario(db: Session = Depends(get_db)):
    """测试路径：模拟重复导入场景，确保重复条码被正确兜住"""
    first_batch = [
        {"barcode": "SAM-001", "sample_name": "叶片A", "material_source": "野生型", "time_point": "0h", "notes": "正常"},
        {"barcode": "SAM-002", "sample_name": "叶片B", "material_source": "突变体", "time_point": "24h", "notes": "正常"},
        {"barcode": "SAM-003", "sample_name": "叶片C", "material_source": "野生型", "time_point": "48h", "notes": "正常"},
    ]
    first_result = import_samples(db, first_batch, imported_by="test-runner", file_name="first_batch.csv")

    second_batch = [
        {"barcode": "SAM-001", "sample_name": "叶片A-重复", "material_source": "野生型", "time_point": "0h", "notes": "条码重复测试"},
        {"barcode": "SAM-002", "sample_name": "叶片B-重复", "material_source": "突变体", "time_point": "24h", "notes": "条码重复测试"},
        {"barcode": "SAM-004", "sample_name": "叶片D", "material_source": "突变体", "time_point": "72h", "notes": "正常"},
        {"barcode": "", "sample_name": "无条码样本", "material_source": "", "time_point": "", "notes": "备注里混写了;多种,分隔符|还有问题说明"},
    ]
    second_result = import_samples(db, second_batch, imported_by="test-runner", file_name="second_batch.csv")

    return {
        "first_batch": first_result.model_dump(),
        "second_batch": second_result.model_dump(),
        "test_passed": (
            len(first_result.duplicate_barcodes) == 0
            and "SAM-001" in second_result.duplicate_barcodes
            and "SAM-002" in second_result.duplicate_barcodes
            and len(second_result.empty_field_samples) > 0
            and len(second_result.mixed_notes_samples) > 0
        ),
        "test_description": "第二次导入应识别出 SAM-001/SAM-002 为重复条码，并检出空值行和备注混写行",
    }


@router.post("/pipeline-demo")
def test_full_pipeline(db: Session = Depends(get_db)):
    """演示完整流程：导入 → 质控 → 复核 → 状态推进 → 导出，便于月底转交质控组查验"""
    samples_data = [
        {"barcode": "DEMO-001", "sample_name": "组1-野生型-0h", "material_source": "Col-0", "culture_record": "培养皿A3", "time_point": "0h", "notes": "对照组正常"},
        {"barcode": "DEMO-002", "sample_name": "组1-野生型-24h", "material_source": "Col-0", "culture_record": "培养皿A3", "time_point": "24h", "notes": "对照组"},
        {"barcode": "DEMO-003", "sample_name": "组2-突变体-0h", "material_source": "abi1-1", "culture_record": "培养皿B2", "time_point": "0h", "notes": "处理组"},
        {"barcode": "DEMO-004", "sample_name": "组2-突变体-24h", "material_source": "abi1-1", "culture_record": "", "time_point": "", "notes": "备注有问题;时间点缺失,培养记录也没填"},
        {"barcode": "DEMO-005", "sample_name": "组3-污染样本", "material_source": "未知", "culture_record": "培养皿C1", "time_point": "48h", "notes": "怀疑有真菌污染"},
    ]
    import_result = import_samples(db, samples_data, imported_by="demo", file_name="demo_batch.csv")

    return {
        "import_result": import_result.model_dump(),
        "next_steps": [
            f"1. 对样本 DEMO-001/002/003 执行 POST /api/qc/qc-record 记录质控结果（质量分 >= 0.8 标记为高质量）",
            f"2. 对样本 DEMO-004 执行 POST /api/qc/review，标记 empty_field_found=true, mixed_notes_found=true，final_decision=needs_bio_review",
            f"3. 对样本 DEMO-005 执行 POST /api/qc/qc-record，标记 low_quality_flag=true",
            f"4. 查看 GET /api/qc/unusable 质控组月底转交时最关心的不可用清单",
            f"5. 查看 GET /api/qc/summary 获取整体质控统计",
            f"6. 最后 POST /api/analysis/export 生成报告（include_all_valid=true）",
        ],
        "for_qc_team": "质控组月底转交时，请优先查看 /api/qc/unusable 接口返回的不可用记录，而非菜单列表",
    }
