"""样例数据生成器 - 不使用旧流程通用样例，而是"眼前这批具体材料"风格"""

from pathlib import Path
from typing import Dict
import pandas as pd
import random
from datetime import date, timedelta


def _d(offset_days: int = 0) -> date:
    return date.today() - timedelta(days=offset_days)


def generate_samples(target_dir: Path, scenario: str = "typical") -> Dict[str, Path]:
    """生成完整的五份样例 Excel 文件。

    scenario:
        typical       - 典型日常问题：空白对照不足 + 几条反应时间漏记 + 几条称量偏差
        blank-missing - 空白对照完全缺失（极端严重场景）
        all-ok        - 全部材料齐全且通过（理想场景）
        temp-issues   - 温度曲线超差（复测建议场景）
    """
    target_dir = Path(target_dir).resolve()
    target_dir.mkdir(parents=True, exist_ok=True)
    random.seed(42)

    today = date.today()
    batches = _pick_batches(scenario)

    paths: Dict[str, Path] = {}
    paths["reagent_ledger"] = _make_reagent_ledger(target_dir, batches, today, scenario)
    paths["experiment_record"] = _make_experiment_record(target_dir, batches, today, scenario)
    paths["weighing_sheet"] = _make_weighing_sheet(target_dir, batches, today, scenario)
    paths["reaction_time"] = _make_reaction_time(target_dir, batches, today, scenario)
    paths["temp_curve"] = _make_temp_curve(target_dir, batches, today, scenario)
    return paths


def _pick_batches(scenario: str):
    base = [
        {"batch_no": "KIT-2026-06A01", "kit_name": "心肌肌钙蛋白I检测试剂盒", "exp_offset": 180},
        {"batch_no": "KIT-2026-06A02", "kit_name": "心肌肌钙蛋白I检测试剂盒", "exp_offset": 200},
        {"batch_no": "KIT-2026-06B03", "kit_name": "C反应蛋白检测试剂盒", "exp_offset": 365},
    ]
    if scenario in ("all-ok",):
        return base[:2]
    return base


# ── 试剂台账 ────────────────────────────────────────────────
def _make_reagent_ledger(target_dir: Path, batches, today, scenario: str) -> Path:
    rows = []
    for b in batches:
        reagents = [
            ("包被抗体", 100, "mg", "2-8℃冷藏"),
            ("标记抗体", 50, "mg", "-20℃冷冻"),
            ("标准品", 5, "mL", "2-8℃冷藏"),
            ("显色液A", 100, "mL", "2-8℃冷藏"),
            ("显色液B", 100, "mL", "2-8℃冷藏，避光"),
            ("终止液", 100, "mL", "室温"),
        ]
        for idx, (name, qty, unit, storage) in enumerate(reagents):
            row = {
                "批次号": b["batch_no"],
                "试剂盒名称": b["kit_name"],
                "试剂名称": name,
                "入库日期": today - timedelta(days=30 - idx * 2),
                "有效期": today + timedelta(days=b["exp_offset"] - idx * 10),
                "数量": qty + (random.choice([-2, 0, 0, 2]) if scenario != "all-ok" else 0),
                "单位": unit,
                "储存条件": storage,
                "操作人": random.choice(["李敏", "王磊", "陈静", "赵刚"]),
                "备注": "",
            }
            if b["batch_no"] == "KIT-2026-06B03" and name == "标记抗体" and scenario == "typical":
                # 人工备注：严格保留原话，不做规范化
                row["备注"] = "这瓶抗体上次拆封后可能有轻微析出现象 但继续用了不影响？"
            if b["batch_no"] == "KIT-2026-06A02" and name == "标准品" and scenario == "temp-issues":
                row["备注"] = "标准品取出时有点结冰了 融了再配的"
            rows.append(row)
    path = target_dir / "试剂台账.xlsx"
    pd.DataFrame(rows).to_excel(path, index=False)
    return path


# ── 实验记录 ────────────────────────────────────────────────
def _make_experiment_record(target_dir: Path, batches, today, scenario: str) -> Path:
    rows = []
    for b in batches:
        exp_dates = [today - timedelta(days=2), today - timedelta(days=1), today]
        for i, d in enumerate(exp_dates):
            exp_no = f"{b['batch_no']}-EXP{i+1:02d}"
            blank_count = _pick_blank_count(b["batch_no"], i, scenario)
            row = {
                "批次号": b["batch_no"],
                "实验编号": exp_no,
                "实验日期": d,
                "实验类型": "批间差平行实验",
                "样本数": 40 if scenario != "all-ok" else 48,
                "操作人": random.choice(["李敏", "王磊", "陈静"]),
                "空白对照数": blank_count,
                "备注": "",
            }
            if blank_count == 0 and scenario == "blank-missing":
                row["备注"] = "今天没来得及做空白 下次一定补上（组长催结果）"
            elif b["batch_no"] == "KIT-2026-06A01" and i == 1 and scenario == "typical":
                row["备注"] = "这轮实验中间仪器跳了一次报错 但重启后继续了 结果看起来还行"
            rows.append(row)
    path = target_dir / "实验记录.xlsx"
    pd.DataFrame(rows).to_excel(path, index=False)
    return path


def _pick_blank_count(batch_no: str, exp_idx: int, scenario: str) -> int:
    if scenario == "blank-missing":
        return 0
    if scenario == "all-ok":
        return random.choice([3, 4, 4, 5])
    # typical / temp-issues
    if batch_no == "KIT-2026-06A01":
        # 空白对照不足：3次实验总共不够最低要求(按默认3算，刚好0/0/2总和=2)
        return [0, 0, 2][exp_idx]
    if batch_no == "KIT-2026-06A02":
        return [3, 2, 3][exp_idx]
    if batch_no == "KIT-2026-06B03":
        return [4, 3, 4][exp_idx]
    return 3


# ── 称量单 ──────────────────────────────────────────────────
def _make_weighing_sheet(target_dir: Path, batches, today, scenario: str) -> Path:
    rows = []
    for b in batches:
        exp_dates = [today - timedelta(days=2), today - timedelta(days=1), today]
        for i, d in enumerate(exp_dates):
            exp_no = f"{b['batch_no']}-EXP{i+1:02d}"
            reagents_theory = [
                ("包被抗体母液", 10.0, 0.02),
                ("HRP-标记抗体", 5.0, 0.01),
                ("BSA封闭剂", 500.0, 1.0),
            ]
            for name, theory, tol in reagents_theory:
                if scenario == "all-ok":
                    actual = theory + random.uniform(-tol * 0.5, tol * 0.5)
                elif scenario == "typical" and b["batch_no"] == "KIT-2026-06A01" and i == 0 and name == "包被抗体母液":
                    actual = theory * 1.062  # 称量偏差6.2% > 5% → 严重
                elif scenario == "typical" and b["batch_no"] == "KIT-2026-06A02" and i == 1 and name == "HRP-标记抗体":
                    actual = theory * 1.033  # 称量偏差3.3% → 警告
                else:
                    actual = theory + random.uniform(-tol * 2, tol * 2)
                row = {
                    "批次号": b["batch_no"],
                    "实验编号": exp_no,
                    "试剂名称": name,
                    "称量日期": d,
                    "理论称量": round(theory, 3),
                    "实际称量": round(actual, 3),
                    "单位": "mg" if theory < 100 else "mg",
                    "操作人": random.choice(["李敏", "王磊", "陈静"]),
                    "备注": "",
                }
                if actual > theory * 1.05 and scenario != "all-ok":
                    row["备注"] = "称的时候手抖了一下 多倒了一点点 懒得重新称了 应该问题不大"
                rows.append(row)
    path = target_dir / "称量单.xlsx"
    pd.DataFrame(rows).to_excel(path, index=False)
    return path


# ── 反应时间 ────────────────────────────────────────────────
def _make_reaction_time(target_dir: Path, batches, today, scenario: str) -> Path:
    rows = []
    steps = [
        ("加样孵育", 30.0),
        ("洗板", 5.0),
        ("加酶标抗体", 20.0),
        ("二次洗板", 5.0),
        ("显色", 15.0),
        ("终止读板", 3.0),
    ]
    for b in batches:
        exp_dates = [today - timedelta(days=2), today - timedelta(days=1), today]
        for i, d in enumerate(exp_dates):
            exp_no = f"{b['batch_no']}-EXP{i+1:02d}"
            for step_name, std in steps:
                should_miss = False
                actual = None
                dev = 0.0
                if scenario == "all-ok":
                    actual = std + random.uniform(-1, 1)
                elif scenario == "typical":
                    if b["batch_no"] == "KIT-2026-06A01" and i == 2 and step_name in ("加酶标抗体", "显色"):
                        should_miss = True
                    elif b["batch_no"] == "KIT-2026-06A02" and i == 0 and step_name == "加样孵育":
                        actual = std + 4.5  # 超差
                    else:
                        actual = std + random.uniform(-1.5, 1.5)
                elif scenario == "blank-missing":
                    if i == 1 and step_name in ("二次洗板", "终止读板"):
                        should_miss = True
                    else:
                        actual = std + random.uniform(-1, 1)
                elif scenario == "temp-issues":
                    actual = std + random.uniform(-2, 2)
                row = {
                    "批次号": b["batch_no"],
                    "实验编号": exp_no,
                    "步骤名称": step_name,
                    "标准时间_分钟": std,
                    "实际时间_分钟": None if should_miss else round(actual, 1) if actual else None,
                    "操作人": random.choice(["李敏", "王磊", "陈静"]),
                    "备注": "",
                }
                if should_miss and scenario == "typical":
                    row["备注"] = "这步时间忘了记了 应该跟标准时间差不多吧"
                rows.append(row)
    path = target_dir / "反应时间.xlsx"
    pd.DataFrame(rows).to_excel(path, index=False)
    return path


# ── 温度曲线 ────────────────────────────────────────────────
def _make_temp_curve(target_dir: Path, batches, today, scenario: str) -> Path:
    rows = []
    for b in batches:
        exp_dates = [today - timedelta(days=2), today - timedelta(days=1), today]
        for i, d in enumerate(exp_dates):
            exp_no = f"{b['batch_no']}-EXP{i+1:02d}"
            times = [0, 5, 10, 15, 20, 25, 30]
            expected = 37.0
            for t in times:
                if scenario == "all-ok":
                    actual = expected + random.uniform(-0.5, 0.5)
                elif scenario == "temp-issues" and b["batch_no"] == "KIT-2026-06A02" and i == 1:
                    # 第二轮温控出问题
                    if 10 <= t <= 20:
                        actual = expected + random.uniform(2.8, 3.5)
                    else:
                        actual = expected + random.uniform(-0.3, 0.3)
                elif scenario == "typical" and b["batch_no"] == "KIT-2026-06A01" and i == 0 and t == 15:
                    actual = expected + 2.3  # 单点轻微超差
                else:
                    actual = expected + random.uniform(-1.0, 1.0)
                row = {
                    "批次号": b["batch_no"],
                    "实验编号": exp_no,
                    "曲线名称": "孵育温度曲线",
                    "时间_分钟": t,
                    "标准温度": expected,
                    "实际温度": round(actual, 1),
                    "操作人": random.choice(["李敏", "王磊"]),
                    "备注": "",
                }
                if actual > expected + 2.0 and scenario != "all-ok":
                    row["备注"] = "这个点温度有点飘 可能开关门影响的"
                rows.append(row)
    path = target_dir / "温度曲线.xlsx"
    pd.DataFrame(rows).to_excel(path, index=False)
    return path
