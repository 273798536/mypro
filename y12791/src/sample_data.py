from src.models import (
    Reagent, WeighingRecord, FeedingStep, ExperimentRecord,
    SafetyNote
)
from typing import List, Dict, Tuple


def generate_reagent_ledger() -> List[Reagent]:
    return [
        Reagent(
            reagent_id="RG-001",
            name="氢氧化钠",
            formula="NaOH",
            purity=96.0,
            purity_unit="%",
            ph_range_min=12.0,
            ph_range_max=14.0,
            supplier="国药集团化学试剂有限公司",
            batch_no="20240315-A",
            received_date="2024-03-18",
            expiry_date="2027-03-17",
            storage_condition="室温干燥密封",
            remark=""
        ),
        Reagent(
            reagent_id="RG-002",
            name="盐酸",
            formula="HCl",
            purity=36.5,
            purity_unit="%",
            ph_range_min=0.5,
            ph_range_max=2.0,
            supplier="上海阿拉丁生化科技股份有限公司",
            batch_no="20240122-H",
            received_date="2024-01-25",
            expiry_date="2026-01-24",
            storage_condition="阴凉通风处",
            remark="腐蚀性，注意防护"
        ),
        Reagent(
            reagent_id="RG-003",
            name="乙酸乙酯",
            formula="CH3COOC2H5",
            purity=99.5,
            purity_unit="%",
            ph_range_min=6.5,
            ph_range_max=7.5,
            supplier="上海泰坦科技股份有限公司",
            batch_no="20231108-E",
            received_date="2023-11-10",
            expiry_date="2025-11-09",
            storage_condition="易燃品专柜",
            remark="旧批次，已申请报废待处理"
        ),
        Reagent(
            reagent_id="RG-004",
            name="对甲苯磺酰胺",
            formula="C7H9NO2S",
            purity=98.0,
            purity_unit="%",
            ph_range_min=5.0,
            ph_range_max=6.5,
            supplier="国药集团化学试剂有限公司",
            batch_no="20240201-T",
            received_date="2024-02-05",
            expiry_date="2028-02-04",
            storage_condition="室温干燥",
            remark=""
        ),
        Reagent(
            reagent_id="RG-005",
            name="蒸馏水",
            formula="H2O",
            purity=99.9,
            purity_unit="%",
            ph_range_min=6.8,
            ph_range_max=7.2,
            supplier="自制",
            batch_no="20240601-W",
            received_date="2024-06-01",
            expiry_date="2024-06-08",
            storage_condition="洁净区",
            remark="每周更换"
        ),
        Reagent(
            reagent_id="RG-006",
            name="乙醇(无水)",
            formula="C2H5OH",
            purity=99.7,
            purity_unit="%",
            ph_range_min=7.0,
            ph_range_max=8.0,
            supplier="上海国药集团",
            batch_no="20231215-AL",
            received_date="2023-12-20",
            expiry_date="2025-12-19",
            storage_condition="易燃品专柜",
            remark="注意防火"
        ),
        Reagent(
            reagent_id="RG-007",
            name="活性炭",
            formula=None,
            purity=None,
            purity_unit=None,
            ph_range_min=None,
            ph_range_max=None,
            supplier="上海活性炭厂",
            batch_no="20240402-C",
            received_date="2024-04-05",
            expiry_date=None,
            storage_condition="干燥通风",
            remark="台账漏填纯度和pH范围"
        )
    ]


def generate_weighing_records(batch_id: str) -> List[WeighingRecord]:
    return [
        WeighingRecord(
            record_id="W-001",
            batch_id=batch_id,
            reagent_id="RG-001",
            reagent_name="氢氧化钠",
            weighed_amount=40.0,
            amount_unit="g",
            theoretical_amount=40.0,
            theoretical_unit="g",
            weigh_time="2024-06-10 08:30",
            operator="张伟",
            balance_id="BAL-01",
            remark=""
        ),
        WeighingRecord(
            record_id="W-002",
            batch_id=batch_id,
            reagent_id="RG-002",
            reagent_name="盐酸",
            weighed_amount=100.0,
            amount_unit="mL",
            theoretical_amount=100.0,
            theoretical_unit="mL",
            weigh_time="2024-06-10 08:35",
            operator="张伟",
            balance_id="BAL-02",
            remark=""
        ),
        WeighingRecord(
            record_id="W-003",
            batch_id=batch_id,
            reagent_id="RG-003",
            reagent_name="乙酸乙酯",
            weighed_amount=250.0,
            amount_unit=None,
            theoretical_amount=250.0,
            theoretical_unit="mL",
            weigh_time="2024-06-10 08:40",
            operator="李娜",
            balance_id="BAL-01",
            remark="称量单漏填单位，按惯例应为mL",
            has_unit_issue=True
        ),
        WeighingRecord(
            record_id="W-004",
            batch_id=batch_id,
            reagent_id="RG-004",
            reagent_name="对甲苯磺酰胺",
            weighed_amount=85.5,
            amount_unit="g",
            theoretical_amount=86.0,
            theoretical_unit="g",
            weigh_time="2024-06-10 08:45",
            operator="李娜",
            balance_id="BAL-03",
            remark="偏差0.5g，在允许范围内"
        ),
        WeighingRecord(
            record_id="W-005",
            batch_id=batch_id,
            reagent_id="RG-005",
            reagent_name="蒸馏水",
            weighed_amount=500,
            amount_unit=None,
            theoretical_amount=500.0,
            theoretical_unit=None,
            weigh_time="2024-06-10 08:50",
            operator="王强",
            balance_id=None,
            remark="旧表格式，理论量和实际量单位均未填",
            has_unit_issue=True
        ),
        WeighingRecord(
            record_id="W-006",
            batch_id=batch_id,
            reagent_id="RG-006",
            reagent_name="乙醇(无水)",
            weighed_amount=None,
            amount_unit="mL",
            theoretical_amount=150.0,
            theoretical_unit="mL",
            weigh_time=None,
            operator=None,
            balance_id=None,
            remark="补录：称量记录缺失，实际用量约150mL",
            has_unit_issue=False
        )
    ]


def generate_feeding_steps(batch_id: str) -> List[FeedingStep]:
    return [
        FeedingStep(
            step_no=1,
            batch_id=batch_id,
            reagent_id="RG-005",
            reagent_name="蒸馏水",
            planned_time="2024-06-10 09:00",
            actual_time="2024-06-10 09:02",
            operator="张伟",
            temperature=25.0,
            ph_value=7.0,
            is_blank_control=False,
            remark="打底溶剂"
        ),
        FeedingStep(
            step_no=2,
            batch_id=batch_id,
            reagent_id="RG-001",
            reagent_name="氢氧化钠",
            planned_time="2024-06-10 09:15",
            actual_time="2024-06-10 09:18",
            operator="张伟",
            temperature=26.5,
            ph_value=13.2,
            is_blank_control=False,
            remark="pH正常偏高"
        ),
        FeedingStep(
            step_no=3,
            batch_id=batch_id,
            reagent_id="RG-004",
            reagent_name="对甲苯磺酰胺",
            planned_time="2024-06-10 09:30",
            actual_time="2024-06-10 09:28",
            operator="李娜",
            temperature=28.0,
            ph_value=9.5,
            is_blank_control=False,
            remark=""
        ),
        FeedingStep(
            step_no=4,
            batch_id=batch_id,
            reagent_id="RG-002",
            reagent_name="盐酸",
            planned_time="2024-06-10 10:00",
            actual_time="2024-06-10 10:05",
            operator="李娜",
            temperature=32.0,
            ph_value=2.1,
            is_blank_control=False,
            remark="中和反应，pH迅速下降",
            safety_note_before=None,
            safety_note_after=None
        ),
        FeedingStep(
            step_no=5,
            batch_id=batch_id,
            reagent_id="RG-003",
            reagent_name="乙酸乙酯",
            planned_time="2024-06-10 10:30",
            actual_time="2024-06-10 10:42",
            operator="王强",
            temperature=30.5,
            ph_value=8.9,
            is_blank_control=False,
            remark="投料延迟12分钟，因等待前一步pH稳定"
        ),
        FeedingStep(
            step_no=6,
            batch_id=batch_id,
            reagent_id="RG-006",
            reagent_name="乙醇(无水)",
            planned_time="2024-06-10 11:00",
            actual_time=None,
            operator=None,
            temperature=None,
            ph_value=11.8,
            is_blank_control=False,
            remark="投料时间漏记，根据反应时间推算约11:05",
            safety_note_before="投料前注意防爆通风",
            safety_note_after="乙醇已通过管路密闭投料，未出现异常"
        )
    ]


def generate_chromatogram_data() -> Tuple[Dict, Dict]:
    before = {
        "peaks": [
            {"retention_time": 1.2, "area": 25000, "label": "溶剂峰"},
            {"retention_time": 2.8, "area": 850000, "label": "主成分"},
            {"retention_time": 3.5, "area": 45000, "label": "杂质A"},
            {"retention_time": 4.2, "area": 32000, "label": "杂质B"},
            {"retention_time": 5.1, "area": 18000, "label": "未知杂质"}
        ],
        "total_area": 970000,
        "main_purity": 87.6
    }
    after = {
        "peaks": [
            {"retention_time": 1.2, "area": 28000, "label": "溶剂峰"},
            {"retention_time": 2.8, "area": 890000, "label": "主成分"},
            {"retention_time": 3.5, "area": 22000, "label": "杂质A"},
            {"retention_time": 4.2, "area": 15000, "label": "杂质B"}
        ],
        "total_area": 955000,
        "main_purity": 93.2
    }
    return before, after


def generate_experiment_record() -> ExperimentRecord:
    batch_id = "BATCH-20240610-003"
    chrom_before, chrom_after = generate_chromatogram_data()

    return ExperimentRecord(
        experiment_id="EXP-20240610",
        batch_id=batch_id,
        experiment_date="2024-06-10",
        reactor_id="R-003",
        reaction_name="对甲苯磺酰胺中和酯化反应",
        planned_start_time="2024-06-10 09:00",
        actual_start_time="2024-06-10 09:02",
        planned_end_time="2024-06-10 14:00",
        actual_end_time=None,
        reaction_duration_min=None,
        operator="张伟/李娜/王强",
        reviewer="刘主管",
        old_remark="旧系统备注：此批次乙酸乙酯为待报废旧料，使用前需确认质量",
        current_remark="补录：本批反应时间预计较标准延长约30分钟，原因待复核",
        feeding_steps=generate_feeding_steps(batch_id),
        chromatogram_before=chrom_before,
        chromatogram_after=chrom_after
    )


def generate_safety_notes(batch_id: str) -> List[SafetyNote]:
    return [
        SafetyNote(
            note_id="SN-001",
            batch_id=batch_id,
            reagent_id="RG-003",
            note_type="reagent_warning",
            content="乙酸乙酯为旧批次待报废物料，本批次使用前经检测纯度仍符合要求(99.2%)，但含水量偏高(0.12%)",
            created_at="2024-06-10 07:45",
            created_by="质检-老赵",
            affects_judgment=False,
            judgment_change_reason=None
        ),
        SafetyNote(
            note_id="SN-002",
            batch_id=batch_id,
            reagent_id="RG-006",
            note_type="operation_reminder",
            content="乙醇投料前确认反应釜内温度不超过35°C，通风系统开启",
            created_at="2024-06-10 10:50",
            created_by="安全员-小陈",
            affects_judgment=False,
            judgment_change_reason=None
        ),
        SafetyNote(
            note_id="SN-003",
            batch_id=batch_id,
            reagent_id="RG-002",
            note_type="judgment_change",
            content="第4步pH值2.1为中和反应预期结果，盐酸过量用于确保完全反应，判定为正常，不记为pH越界",
            created_at="2024-06-10 15:30",
            created_by="质检主管-刘敏",
            affects_judgment=True,
            judgment_change_reason="中和反应需酸性环境，盐酸过量属工艺要求，原pH越界判定撤销"
        )
    ]


def generate_all_sample_data():
    reagents = generate_reagent_ledger()
    experiment = generate_experiment_record()
    batch_id = experiment.batch_id
    weighing = generate_weighing_records(batch_id)
    safety = generate_safety_notes(batch_id)
    return {
        "reagents": reagents,
        "experiment": experiment,
        "weighing_records": weighing,
        "safety_notes": safety,
        "batch_id": batch_id
    }
