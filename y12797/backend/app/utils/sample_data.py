"""生成贴近日常的真实样例数据：旧表格式、补录备注、漏填单位混在一起。"""
from typing import Dict, Any, List


def build_sample_record() -> Dict[str, Any]:
    """
    构建一套真实感的酶促反应底物换算样例：
    - 旧表的遗留格式（温度同时存在 ℃、K、°F、漏填）
    - 补录备注（样品来源、库存状态）
    - 漏填单位（底物1浓度单位缺失，pH单位写成"无单位"）
    - 谱峰重叠（产物与杂质峰重叠）
    - 称量精度不足（某底物仅称了 0.3 mg）
    - 安全备注（含易燃、有毒试剂）
    """
    return {
        "batch_no": "EZS-20260608-A11",
        "material_name": "β-半乳糖苷酶底物体系（乳糖+ONPG混合批）",
        "source_file_name": "酶促反应底物换算_旧表_20260608.xlsx",
        "source_format": "old_excel",
        "remark": "本批为上周五遗留样品，因中间换班交接导致部分数据缺失，已补录；详见 supplementary_note。",
        "supplementary_note": (
            "补录说明：1) 反应温度 310.15K 来自上一班记录（李工），当班人习惯用开尔文；"
            "2) ONPG 称样量由辅助记录回算，原始称量单编号 W-20260608-037；"
            "3) 乳糖 2 号样浓度单位漏填，按历史批次惯例默认 mmol/L；"
            "4) 缓冲液 pH 旧表未写单位，按标准以pH单位计。"
        ),
        "safety_note": (
            "安全提醒：① β-巯基乙醇具有刺激性臭味，需在通风橱操作；"
            "② ONPG 水解产物邻硝基苯酚对皮肤有染色作用，操作时戴一次性手套；"
            "③ 反应终止液 1M Na2CO3 为强碱性，避免溅入眼。"
        ),
        "reaction_conditions": [
            {
                "condition_name": "反应温度-保温槽（旧表K制）",
                "condition_value": "310.15K",
                "row_order": 1,
            },
            {
                "condition_name": "反应温度-酶活最适（旧表℃制）",
                "condition_value": "37",
                "unit": "℃",
                "row_order": 2,
            },
            {
                "condition_name": "反应温度-存储（旧表°F制）",
                "condition_value": "41°F",
                "row_order": 3,
            },
            {
                "condition_name": "pH值（旧表漏填单位）",
                "condition_value": "7.4",
                "unit": "",
                "row_order": 4,
            },
            {
                "condition_name": "反应时间",
                "condition_value": "15",
                "unit": "min",
                "row_order": 5,
            },
            {
                "condition_name": "酶加入量",
                "condition_value": "0.02",
                "unit": "mg/mL",
                "row_order": 6,
            },
        ],
        "substrate_conversions": [
            {
                "substrate_name": "乳糖（一水合物）",
                "cas_no": "5989-81-1",
                "initial_mass": 180.2,
                "initial_mass_unit": "mg",
                "volume": 50,
                "volume_unit": "mL",
                "molecular_weight": 360.31,
                "purity": 99.0,
                "final_concentration_unit": "mmol/L",
                "row_order": 1,
            },
            {
                "substrate_name": "ONPG（邻硝基苯-β-D-半乳糖苷）",
                "cas_no": "369-07-3",
                "initial_mass": 0.3,
                "initial_mass_unit": "mg",
                "volume": 10,
                "volume_unit": "mL",
                "molecular_weight": 301.25,
                "purity": 98.5,
                "final_concentration_unit": "mmol/L",
                "row_order": 2,
            },
            {
                "substrate_name": "β-半乳糖苷酶（对照品）",
                "cas_no": "9031-11-2",
                "initial_mass": 12.5,
                "initial_mass_unit": "mg",
                "volume": 25,
                "volume_unit": "mL",
                "molecular_weight": 540000,
                "purity": 95.0,
                "final_concentration_unit": "μmol/L",
                "row_order": 3,
            },
            {
                "substrate_name": "Na2HPO4·12H2O（缓冲对A）",
                "cas_no": "10039-32-4",
                "initial_mass": 716.3,
                "initial_mass_unit": "mg",
                "volume": 100,
                "volume_unit": "mL",
                "molecular_weight": 358.14,
                "purity": 100.0,
                "final_concentration_unit": "mmol/L",
                "row_order": 4,
            },
        ],
        "spectrum_data": [
            {
                "spectrum_type": "HPLC",
                "detection_wavelength": "405nm",
                "column_info": "C18 250×4.6mm 5μm",
                "retention_time": 2.83,
                "peak_area": 125680,
                "peak_height": 9823,
                "peak_name": "溶剂峰+乳糖-水",
                "is_overlap": False,
                "interpretation": "溶剂前沿正常，乳糖衍生峰略见拖尾。",
                "row_order": 1,
            },
            {
                "retention_time": 5.67,
                "peak_area": 892340,
                "peak_height": 68920,
                "peak_name": "ONPG底物峰",
                "is_overlap": False,
                "interpretation": "主峰对称因子 0.95，定量无问题。",
                "row_order": 2,
            },
            {
                "retention_time": 6.12,
                "peak_area": 112450,
                "peak_height": 12560,
                "peak_name": "邻硝基苯酚（产物）",
                "is_overlap": True,
                "overlap_with": "杂质X（RT≈6.02）",
                "overlap_severity": "moderate",
                "overlap_note": "产物峰与其水解副产物杂质X中度重叠，需扣除背景后定量。",
                "interpretation": "产物峰与杂质X中度重叠，建议改用 420nm 检测或梯度洗脱分离。",
                "row_order": 3,
            },
            {
                "retention_time": 6.02,
                "peak_area": 45320,
                "peak_height": 5820,
                "peak_name": "杂质X（副产物）",
                "is_overlap": True,
                "overlap_with": "邻硝基苯酚（RT≈6.12）",
                "overlap_severity": "moderate",
                "overlap_note": "杂质峰与产物峰重叠，已在谱图判读中注明。",
                "interpretation": "与产物共同构成复合峰，按去卷积估算相对占比约 28%。",
                "row_order": 4,
            },
            {
                "retention_time": 9.45,
                "peak_area": 67820,
                "peak_height": 4210,
                "peak_name": "半乳糖（衍生）",
                "is_overlap": False,
                "interpretation": "正常。",
                "row_order": 5,
            },
        ],
    }
