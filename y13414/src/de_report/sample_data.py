from src.de_report.models import (
    Record, RecordSource, RecordStatus,
    BoundaryCondition, ExtrapolationAlert,
)

SITE_RECORDS: list[Record] = [
    Record(
        id="DE-001",
        source=RecordSource.NORMAL,
        boundary_conditions=[
            BoundaryCondition(
                symbol="dy/dx",
                equation_text="dy/dx = 2x, y(0)=1",
                valid_range="x ∈ ℝ",
                note="标准一阶线性ODE，符号 dy/dx，初始条件 y(0)=1",
            ),
        ],
        screenshot_note="课本P12例3截图",
        original_remark="课堂讲解标准例题，学生普遍理解",
        extrapolation_alert=ExtrapolationAlert.NONE,
    ),
    Record(
        id="DE-002",
        source=RecordSource.NORMAL,
        boundary_conditions=[
            BoundaryCondition(
                symbol="y'",
                equation_text="y' + y = e^x, y(0)=2",
                valid_range="x ∈ ℝ",
                note="一阶线性ODE，符号用 y' 而非 dy/dx，与DE-001符号不同但同类型",
            ),
        ],
        screenshot_note="课本P15练习截图",
        original_remark="符号写法不同，实际同类型题，需注意区分",
        extrapolation_alert=ExtrapolationAlert.NONE,
    ),
    Record(
        id="DE-003-OLD",
        source=RecordSource.OLD_VERSION,
        version=0,
        boundary_conditions=[
            BoundaryCondition(
                symbol="D_x y",
                equation_text="D_x y + 2y = 0, y(0)=3",
                valid_range="x ∈ ℝ",
                note="旧版教材符号 D_x y，新版已改为 dy/dx；此条来自旧版截图，符号对不上需人工确认",
            ),
        ],
        screenshot_note="旧版教材P8截图，符号 D_x y 与现版不同",
        original_remark="旧版记录，符号 D_x y 在新版中记作 dy/dx，复盘时差点被当成另一题",
        extrapolation_alert=ExtrapolationAlert.NONE,
    ),
    Record(
        id="DE-004-SUPP",
        source=RecordSource.ON_SITE_SUPPLEMENT,
        boundary_conditions=[
            BoundaryCondition(
                symbol="dy/dx",
                equation_text="dy/dx = -ky, y(0)=y₀",
                valid_range="k > 0",
                note="现场补充：学生提问时新增，衰减模型；参数 k>0 为边界条件",
            ),
        ],
        screenshot_note="现场手机拍照补充，非课本截图",
        original_remark="讲解中学生提问补充，k>0 是物理约束不是数学约束",
        extrapolation_alert=ExtrapolationAlert.NONE,
    ),
    Record(
        id="DE-005",
        source=RecordSource.NORMAL,
        boundary_conditions=[
            BoundaryCondition(
                symbol="dy/dx",
                equation_text="dy/dx = x² + y², y(0)=0",
                valid_range="x ∈ (-∞, r) 其中 r 为爆破点",
                note="非线性ODE，存在爆破点；外推越界时需警惕",
            ),
        ],
        screenshot_note="课本P22拓展题截图",
        original_remark="非线性项 y² 导致解可能爆破，外推时容易越界",
        extrapolation_alert=ExtrapolationAlert.SINGLE_OUT_OF_BOUND,
    ),
    Record(
        id="DE-006",
        source=RecordSource.NORMAL,
        boundary_conditions=[
            BoundaryCondition(
                symbol="dy/dx",
                equation_text="dy/dx = x³ + y³, y(0)=0",
                valid_range="x ∈ (-∞, r)",
                note="与DE-005同类型，立方项更易爆破",
            ),
        ],
        screenshot_note="课本P23拓展题截图",
        original_remark="连续出现外推越界，与DE-005一起考虑可能是上游材料选题问题",
        extrapolation_alert=ExtrapolationAlert.CONSECUTIVE_OUT_OF_BOUND,
    ),
]
