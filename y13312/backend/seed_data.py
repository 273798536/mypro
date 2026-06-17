import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models, schemas, crud

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

demo_samples = [
    {
        "sample_no": "CS20240001",
        "customer_name": "张伟",
        "id_card": "110101199001011234",
        "original_score": 72.5,
        "current_score": 72.5,
        "status": "processed",
        "risk_level": "低风险",
        "has_label_conflict": False,
        "has_name_mismatch": False,
        "has_material_mismatch": False,
        "materials": [
            {
                "material_name": "身份证",
                "material_type": "证件",
                "material_value": "张伟|110101199001011234",
                "source": "系统导入",
                "source_detail": "OCR识别",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "张伟|110101199001011234",
            },
            {
                "material_name": "收入证明",
                "material_type": "收入",
                "material_value": "月收入15000元",
                "source": "人工录入",
                "source_detail": "客户经理录入",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "月收入15000元",
            },
            {
                "material_name": "征信报告",
                "material_type": "征信",
                "material_value": "无逾期记录",
                "source": "第三方接口",
                "source_detail": "人行征信",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "无逾期记录",
            },
        ],
        "label_conflicts": [],
    },
    {
        "sample_no": "CS20240002",
        "customer_name": "李娜",
        "id_card": "310101198805055678",
        "original_score": 65.0,
        "current_score": 78.0,
        "status": "manual_adjusted",
        "risk_level": "中风险",
        "has_label_conflict": True,
        "has_name_mismatch": True,
        "has_material_mismatch": True,
        "materials": [
            {
                "material_name": "身份证",
                "material_type": "证件",
                "material_value": "李娜|310101198805055678",
                "source": "系统导入",
                "source_detail": "OCR识别",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "李娜|310101198805055678",
            },
            {
                "material_name": "工作证明",
                "material_type": "工作",
                "material_value": "李娜|某科技有限公司|产品经理|入职3年",
                "source": "人工录入",
                "source_detail": "客户经理-王芳",
                "is_original": True,
                "is_dirty": False,
                "is_name_mismatch": False,
                "raw_value": "李娜|某科技有限公司|产品经理|入职3年",
            },
            {
                "material_name": "银行流水",
                "material_type": "收入",
                "material_value": "li na|月均入账18000元",
                "source": "第三方接口",
                "source_detail": "银行数据接口",
                "is_original": True,
                "is_dirty": True,
                "is_name_mismatch": True,
                "raw_value": "li na|月均入账18000元",
            },
            {
                "material_name": "社保缴纳记录",
                "material_type": "社保",
                "material_value": "缴纳基数20000元|连续缴纳60个月",
                "source": "第三方接口",
                "source_detail": "社保局接口",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "缴纳基数20000元|连续缴纳60个月",
            },
        ],
        "label_conflicts": [
            {
                "field_name": "income_level",
                "field_label": "收入水平标签",
                "source_a": "模型A",
                "value_a": "高收入",
                "source_b": "模型B",
                "value_b": "中等收入",
                "conflict_type": "label_mismatch",
                "is_resolved": False,
            },
            {
                "field_name": "employment_status",
                "field_label": "就业状态",
                "source_a": "工作证明",
                "value_a": "在职",
                "source_b": "社保记录",
                "value_b": "在职（但缴费基数异常波动）",
                "conflict_type": "value_mismatch",
                "is_resolved": True,
                "resolution": "adopt_a",
                "resolved_by": "评审员-陈老师",
            },
        ],
    },
    {
        "sample_no": "CS20240003",
        "customer_name": "王强",
        "id_card": "440101199212129012",
        "original_score": 55.5,
        "current_score": 55.5,
        "status": "material_missing",
        "risk_level": "高风险",
        "has_label_conflict": False,
        "has_name_mismatch": False,
        "has_material_mismatch": False,
        "materials": [
            {
                "material_name": "身份证",
                "material_type": "证件",
                "material_value": "王强|440101199212129012",
                "source": "系统导入",
                "source_detail": "OCR识别",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "王强|440101199212129012",
            },
            {
                "material_name": "征信报告",
                "material_type": "征信",
                "material_value": "有2次逾期记录|最近一次为6个月前",
                "source": "第三方接口",
                "source_detail": "人行征信",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "有2次逾期记录|最近一次为6个月前",
            },
        ],
        "label_conflicts": [],
    },
    {
        "sample_no": "CS20240004",
        "customer_name": "赵敏",
        "id_card": "510101199503033456",
        "original_score": 80.0,
        "current_score": 80.0,
        "status": "pending_review",
        "risk_level": "低风险",
        "has_label_conflict": False,
        "has_name_mismatch": False,
        "has_material_mismatch": False,
        "materials": [
            {
                "material_name": "身份证",
                "material_type": "证件",
                "material_value": "赵敏|510101199503033456",
                "source": "系统导入",
                "source_detail": "OCR识别",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "赵敏|510101199503033456",
            },
            {
                "material_name": "收入证明",
                "material_type": "收入",
                "material_value": "月收入25000元",
                "source": "人工录入",
                "source_detail": "客户经理录入",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "月收入25000元",
            },
        ],
        "label_conflicts": [],
    },
    {
        "sample_no": "CS20240005",
        "customer_name": "刘洋",
        "id_card": "320101198711017890",
        "original_score": 48.0,
        "current_score": 62.0,
        "status": "manual_adjusted",
        "risk_level": "中风险",
        "has_label_conflict": True,
        "has_name_mismatch": False,
        "has_material_mismatch": True,
        "materials": [
            {
                "material_name": "身份证",
                "material_type": "证件",
                "material_value": "刘洋|320101198711017890",
                "source": "系统导入",
                "source_detail": "OCR识别",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "刘洋|320101198711017890",
            },
            {
                "material_name": "房产证明",
                "material_type": "资产",
                "material_value": "自有房产1套|估值150万",
                "source": "人工录入",
                "source_detail": "客户经理-李明",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "自有房产1套|估值150万",
            },
            {
                "material_name": "车辆证明",
                "material_type": "资产",
                "material_value": "自有车辆1辆|估值20万",
                "source": "人工录入",
                "source_detail": "客户经理-李明",
                "is_original": True,
                "is_dirty": True,
                "raw_value": "车车一辆，大概20万左右吧",
            },
        ],
        "label_conflicts": [
            {
                "field_name": "asset_level",
                "field_label": "资产等级",
                "source_a": "房产评估模型",
                "value_a": "高资产",
                "source_b": "综合评分模型",
                "value_b": "中等资产",
                "conflict_type": "label_mismatch",
                "is_resolved": False,
            },
        ],
    },
    {
        "sample_no": "CS20240006",
        "customer_name": "陈静",
        "id_card": "330101199307072345",
        "original_score": 88.5,
        "current_score": 88.5,
        "status": "processed",
        "risk_level": "低风险",
        "has_label_conflict": False,
        "has_name_mismatch": False,
        "has_material_mismatch": False,
        "materials": [
            {
                "material_name": "身份证",
                "material_type": "证件",
                "material_value": "陈静|330101199307072345",
                "source": "系统导入",
                "source_detail": "OCR识别",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "陈静|330101199307072345",
            },
            {
                "material_name": "公积金缴纳",
                "material_type": "社保",
                "material_value": "月缴3000元|连续缴纳5年",
                "source": "第三方接口",
                "source_detail": "公积金中心",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "月缴3000元|连续缴纳5年",
            },
        ],
        "label_conflicts": [],
    },
    {
        "sample_no": "CS20240007",
        "customer_name": "赵磊",
        "id_card": "370101199108086789",
        "original_score": 70.0,
        "current_score": 55.0,
        "status": "manual_adjusted",
        "risk_level": "高风险",
        "has_label_conflict": True,
        "has_name_mismatch": True,
        "has_material_mismatch": True,
        "materials": [
            {
                "material_name": "身份证",
                "material_type": "证件",
                "material_value": "赵磊|370101199108086789",
                "source": "系统导入",
                "source_detail": "OCR识别",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "赵磊|370101199108086789",
            },
            {
                "material_name": "工作证明",
                "material_type": "工作",
                "material_value": "赵磊|某贸易公司|销售经理",
                "source": "人工录入",
                "source_detail": "客户经理-孙涛",
                "is_original": True,
                "is_dirty": False,
                "is_name_mismatch": False,
                "raw_value": "赵磊|某贸易公司|销售经理",
            },
            {
                "material_name": "银行流水",
                "material_type": "收入",
                "material_value": "赵雷|月均入账8000元",
                "source": "第三方接口",
                "source_detail": "银行数据接口",
                "is_original": True,
                "is_dirty": True,
                "is_name_mismatch": True,
                "raw_value": "赵雷|月均入账8000元",
            },
            {
                "material_name": "征信报告",
                "material_type": "征信",
                "material_value": "无逾期|查询次数多",
                "source": "第三方接口",
                "source_detail": "人行征信",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "无逾期|查询次数多",
            },
        ],
        "label_conflicts": [
            {
                "field_name": "employment_stability",
                "field_label": "就业稳定性",
                "source_a": "工作证明",
                "value_a": "稳定（同一公司3年）",
                "source_b": "银行流水",
                "value_b": "不稳定（收入波动大）",
                "conflict_type": "value_mismatch",
                "is_resolved": False,
            },
            {
                "field_name": "name_consistency",
                "field_label": "姓名一致性",
                "source_a": "身份证",
                "value_a": "赵磊",
                "source_b": "银行流水",
                "value_b": "赵雷",
                "conflict_type": "value_mismatch",
                "is_resolved": False,
            },
        ],
    },
    {
        "sample_no": "CS20240008",
        "customer_name": "孙丽",
        "id_card": "420101198902021234",
        "original_score": 75.0,
        "current_score": 75.0,
        "status": "pending_review",
        "risk_level": "中风险",
        "has_label_conflict": False,
        "has_name_mismatch": False,
        "has_material_mismatch": False,
        "materials": [
            {
                "material_name": "身份证",
                "material_type": "证件",
                "material_value": "孙丽|420101198902021234",
                "source": "系统导入",
                "source_detail": "OCR识别",
                "is_original": True,
                "is_dirty": False,
                "raw_value": "孙丽|420101198902021234",
            },
        ],
        "label_conflicts": [],
    },
]

for sample_data in demo_samples:
    existing = crud.get_sample_by_no(db, sample_data["sample_no"])
    if existing:
        print(f"样本 {sample_data['sample_no']} 已存在，跳过")
        continue

    sample_create = schemas.SampleCreate(**sample_data)
    sample = crud.create_sample(db, sample_create)
    print(f"已创建样本: {sample.sample_no} - {sample.customer_name}")

db.commit()

adjustment_data = [
    {
        "sample_no": "CS20240002",
        "adjustments": [
            {
                "adjuster": "评审员-陈老师",
                "reason": "补充社保缴纳记录，证明收入稳定，评分上调",
                "score_after": 72.0,
                "status_after": "pending_review",
                "risk_level_after": "中风险",
                "source": "manual_review",
                "source_ref": "REVIEW-2024-001",
            },
            {
                "adjuster": "评审组长-李主任",
                "reason": "银行流水姓名不一致存疑，但工作证明和社保一致，确认为同一人，再次上调",
                "score_after": 78.0,
                "status_after": "manual_adjusted",
                "risk_level_after": "中风险",
                "source": "manual_review",
                "source_ref": "REVIEW-2024-002",
            },
        ],
    },
    {
        "sample_no": "CS20240005",
        "adjustments": [
            {
                "adjuster": "评审员-王老师",
                "reason": "发现遗漏房产证明材料，资产情况优于模型评估，上调评分",
                "score_after": 62.0,
                "status_after": "manual_adjusted",
                "risk_level_after": "中风险",
                "source": "manual_review",
                "source_ref": "REVIEW-2024-003",
            },
        ],
    },
    {
        "sample_no": "CS20240007",
        "adjustments": [
            {
                "adjuster": "评审员-张老师",
                "reason": "银行流水姓名不一致，且收入较低，下调风险评级",
                "score_after": 60.0,
                "status_after": "pending_review",
                "risk_level_after": "中风险",
                "source": "manual_review",
                "source_ref": "REVIEW-2024-004",
            },
            {
                "adjuster": "评审组长-李主任",
                "reason": "发现存在多处材料不一致，收入真实性存疑，继续下调",
                "score_after": 55.0,
                "status_after": "manual_adjusted",
                "risk_level_after": "高风险",
                "source": "manual_review",
                "source_ref": "REVIEW-2024-005",
            },
        ],
    },
]

for adj_item in adjustment_data:
    sample = crud.get_sample_by_no(db, adj_item["sample_no"])
    if not sample:
        continue

    for adj_data in adj_item["adjustments"]:
        adj_create = schemas.ManualAdjustmentCreate(**adj_data)
        result = crud.create_manual_adjustment(db, sample.id, adj_create)
        print(f"已为样本 {sample.sample_no} 添加改判记录: {result.score_before} -> {result.score_after}")

db.close()
print("\n演示数据初始化完成！")
print("包含:")
print("  - 8 条样本（覆盖4种状态）")
print("  - 5 次人工改判记录")
print("  - 5 个标签冲突（含已解决和未解决）")
print("  - 2 条名称不一致的材料")
print("  - 脏数据痕迹保留（raw_value字段）")
print("  - 多条被重复评测的样本")
