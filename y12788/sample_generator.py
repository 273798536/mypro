"""
生成可复现的树脂固化谱图样例数据
每个样例都带 seed,可独立重现。
"""
import numpy as np
import json
import os


def _s_rand(seed: int):
    """可复现伪随机数生成器"""
    rng = np.random.RandomState(seed)
    return rng


def generate_curing_curve(seed: int, n_points: int = 250, t_max: float = 3600.0,
                          gel_t_offset: float = 0.0, vit_ratio: float = 1.9,
                          end_ratio: float = 1.6, noise_std: float = 0.02,
                          plateau_level: float = 0.97, initial_drift: float = 0.05):
    """
    生成标准S型树脂固化曲线

    阶段:
    1. 诱导期: t < t_gel  → 低信号,缓慢增长
    2. 凝胶化: t_gel ~ t_vit  → 信号急剧上升 (三次多项式)
    3. 玻璃化: t_vit ~ t_end  → 信号逐渐平台 (指数趋近)
    4. 固化后: t > t_end  → 稳定平台
    """
    rng = _s_rand(seed)
    t = np.linspace(0, t_max, n_points)

    t_gel = 900.0 + gel_t_offset + rng.uniform(-120, 180)
    t_vit = t_gel * vit_ratio + rng.uniform(-60, 120)
    t_end = t_vit * end_ratio + rng.uniform(-80, 240)

    s = np.zeros_like(t)
    for i, ti in enumerate(t):
        if ti < t_gel:
            u = ti / t_gel
            s[i] = initial_drift + (0.12 - initial_drift) * (u ** 1.5)
        elif ti < t_vit:
            u = (ti - t_gel) / (t_vit - t_gel)
            s_gel_start = initial_drift + (0.12 - initial_drift) * 1.0
            s[i] = s_gel_start + (0.67 - s_gel_start) * (1 - (1 - u) ** 3)
        elif ti < t_end:
            u = (ti - t_vit) / (t_end - t_vit)
            s[i] = 0.67 + (plateau_level - 0.67) * (1 - np.exp(-4.0 * u))
        else:
            s[i] = plateau_level

    noise = rng.normal(0, noise_std, size=n_points)
    s = np.clip(s + noise, 0.01, 1.0)

    return t.tolist(), s.tolist(), {
        "true_gel_time": float(t_gel),
        "true_vitrification_time": float(t_vit),
        "true_full_cure_time": float(t_end),
        "noise_std": noise_std,
    }


DEMO_BATCHES = [
    {
        "batch_no": "RESIN-2025-A001",
        "resin_type": "E-51双酚A型环氧",
        "manufacturer": "中石化巴陵石化",
        "production_date": "2025-09-15",
        "nominal_concentration": 52.50,
        "remark": "常规教学用树脂,常温储存",
    },
    {
        "batch_no": "RESIN-2025-A002",
        "resin_type": "E-51双酚A型环氧",
        "manufacturer": "中石化巴陵石化",
        "production_date": "2025-09-22",
        "nominal_concentration": 51.80,
        "remark": "同型号不同批次,用于验证重复性",
    },
    {
        "batch_no": "RESIN-2025-B003",
        "resin_type": "F-44酚醛环氧",
        "manufacturer": "陶氏化学",
        "production_date": "2025-08-30",
        "nominal_concentration": 48.20,
        "remark": "耐高温型,固化速率较快",
    },
    {
        "batch_no": "RESIN-2025-C004",
        "resin_type": "6101通用环氧",
        "manufacturer": "无锡树脂厂",
        "production_date": "2025-10-01",
        "nominal_concentration": 55.00,
        "remark": "学生实验用,浓度较高",
    },
    {
        "batch_no": "RESIN-2025-D005",
        "resin_type": "DER-331低粘度环氧",
        "manufacturer": "Olin",
        "production_date": "2025-09-05",
        "nominal_concentration": 50.30,
        "remark": "进口对照样",
    },
]


DEMO_EXPERIMENTS = [
    # 批号 A001: 4 个重复实验(验证重复性)
    {"batch_no": "RESIN-2025-A001", "seed": 1001, "operator": "李老师", "experiment_date": "2025-10-08",
     "initial_weight": 0.2510, "curing_agent_ratio": 30.0, "actual_concentration": 52.3,
     "spectrum_type": "FTIR", "temperature": 80.0, "remark": "标准条件平行样1",
     "gel_offset": -40, "n_points": 280},
    {"batch_no": "RESIN-2025-A001", "seed": 1002, "operator": "李老师", "experiment_date": "2025-10-08",
     "initial_weight": 0.2487, "curing_agent_ratio": 30.0, "actual_concentration": 52.7,
     "spectrum_type": "FTIR", "temperature": 80.0, "remark": "标准条件平行样2",
     "gel_offset": 20, "n_points": 280},
    {"batch_no": "RESIN-2025-A001", "seed": 1003, "operator": "李老师", "experiment_date": "2025-10-09",
     "initial_weight": 0.2532, "curing_agent_ratio": 30.0, "actual_concentration": 52.1,
     "spectrum_type": "Rheology", "temperature": 80.0, "remark": "旋转流变仪验证",
     "gel_offset": 0, "n_points": 300},
    {"batch_no": "RESIN-2025-A001", "seed": 1004, "operator": "王同学", "experiment_date": "2025-10-10",
     "initial_weight": 0.2499, "curing_agent_ratio": 30.0, "actual_concentration": None,
     "spectrum_type": "FTIR", "temperature": 85.0, "remark": "学生操作,温度略高",
     "gel_offset": -120, "n_points": 260},  # 温度高,凝胶快

    # 批号 A002: 3 个样,与A001同型号
    {"batch_no": "RESIN-2025-A002", "seed": 2001, "operator": "李老师", "experiment_date": "2025-10-12",
     "initial_weight": 0.2505, "curing_agent_ratio": 30.0, "actual_concentration": 51.9,
     "spectrum_type": "FTIR", "temperature": 80.0, "remark": "新批次验证",
     "gel_offset": 30, "n_points": 280},
    {"batch_no": "RESIN-2025-A002", "seed": 2002, "operator": "李老师", "experiment_date": "2025-10-12",
     "initial_weight": 0.2478, "curing_agent_ratio": 30.0, "actual_concentration": 51.6,
     "spectrum_type": "FTIR", "temperature": 80.0, "remark": "新批次平行",
     "gel_offset": -10, "n_points": 280},
    {"batch_no": "RESIN-2025-A002", "seed": 2003, "operator": "张同学", "experiment_date": "2025-10-13",
     "initial_weight": 0.2466, "curing_agent_ratio": 28.0, "actual_concentration": None,
     "spectrum_type": "DSC", "temperature": 80.0, "remark": "固化剂减少2%",
     "gel_offset": 80, "n_points": 290},  # 固化剂少,凝胶慢

    # 批号 B003: 酚醛环氧,2个样
    {"batch_no": "RESIN-2025-B003", "seed": 3001, "operator": "李老师", "experiment_date": "2025-10-06",
     "initial_weight": 0.2388, "curing_agent_ratio": 25.0, "actual_concentration": 48.5,
     "spectrum_type": "FTIR", "temperature": 100.0, "remark": "高温固化,速率快",
     "gel_offset": -200, "n_points": 320, "vit_ratio": 1.7},
    {"batch_no": "RESIN-2025-B003", "seed": 3002, "operator": "李老师", "experiment_date": "2025-10-06",
     "initial_weight": 0.2402, "curing_agent_ratio": 25.0, "actual_concentration": 48.0,
     "spectrum_type": "FTIR", "temperature": 100.0, "remark": "平行样",
     "gel_offset": -180, "n_points": 320, "vit_ratio": 1.7},

    # 批号 C004: 高浓度,3个样
    {"batch_no": "RESIN-2025-C004", "seed": 4001, "operator": "赵同学", "experiment_date": "2025-10-14",
     "initial_weight": 0.2550, "curing_agent_ratio": 35.0, "actual_concentration": 54.8,
     "spectrum_type": "FTIR", "temperature": 80.0, "remark": "教学实验",
     "gel_offset": 60, "n_points": 270},
    {"batch_no": "RESIN-2025-C004", "seed": 4002, "operator": "赵同学", "experiment_date": "2025-10-14",
     "initial_weight": 0.2522, "curing_agent_ratio": 35.0, "actual_concentration": 55.1,
     "spectrum_type": "FTIR", "temperature": 80.0, "remark": "教学实验平行",
     "gel_offset": 90, "n_points": 270},
    {"batch_no": "RESIN-2025-C004", "seed": 4003, "operator": "钱同学", "experiment_date": "2025-10-15",
     "initial_weight": 0.2571, "curing_agent_ratio": 35.0, "actual_concentration": None,
     "spectrum_type": "FTIR", "temperature": 75.0, "remark": "温度偏低,反应慢",
     "gel_offset": 200, "n_points": 290, "vit_ratio": 2.1},

    # 批号 D005: 进口对照,2个样
    {"batch_no": "RESIN-2025-D005", "seed": 5001, "operator": "李老师", "experiment_date": "2025-10-07",
     "initial_weight": 0.2301, "curing_agent_ratio": 30.0, "actual_concentration": 50.5,
     "spectrum_type": "FTIR", "temperature": 80.0, "remark": "进口样对照1",
     "gel_offset": -60, "n_points": 300, "noise_std": 0.015},
    {"batch_no": "RESIN-2025-D005", "seed": 5002, "operator": "李老师", "experiment_date": "2025-10-07",
     "initial_weight": 0.2315, "curing_agent_ratio": 30.0, "actual_concentration": 50.2,
     "spectrum_type": "FTIR", "temperature": 80.0, "remark": "进口样对照2",
     "gel_offset": -50, "n_points": 300, "noise_std": 0.015},
]


def build_spectrum_for_experiment(exp: dict):
    kwargs = {"seed": exp["seed"], "n_points": exp.get("n_points", 250),
              "gel_t_offset": exp.get("gel_offset", 0.0), "vit_ratio": exp.get("vit_ratio", 1.9),
              "noise_std": exp.get("noise_std", 0.02)}
    t, s, true_params = generate_curing_curve(**kwargs)
    measured_at = f"{exp['experiment_date']}T{str(9 + (exp['seed'] % 8)).zfill(2)}:{str((exp['seed'] * 7) % 60).zfill(2)}"
    return {
        "time_points": t,
        "signal_values": s,
        "file_name": f"{exp['batch_no']}_{exp['seed']}_{exp['spectrum_type']}.json",
        "spectrum_type": exp["spectrum_type"],
        "temperature": exp["temperature"],
        "measured_at": measured_at,
        "_true_params": true_params,
    }


def save_sample_files(output_dir: str = "sample_data"):
    """将谱图保存为独立 JSON 文件,方便导入"""
    os.makedirs(output_dir, exist_ok=True)
    batch_info_path = os.path.join(output_dir, "00_batches_overview.json")
    with open(batch_info_path, "w", encoding="utf-8") as f:
        json.dump(DEMO_BATCHES, f, ensure_ascii=False, indent=2)
    print(f"[OK] 批次清单 → {batch_info_path}")

    for i, exp in enumerate(DEMO_EXPERIMENTS):
        spectrum = build_spectrum_for_experiment(exp)
        del spectrum["_true_params"]
        fname = f"{i+1:02d}_{spectrum['file_name']}"
        fpath = os.path.join(output_dir, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(spectrum, f, ensure_ascii=False, indent=2)
        truth = {
            "experiment": {k: v for k, v in exp.items() if k != "seed"},
            "file": fname,
        }
        with open(fpath.replace(".json", ".truth.json"), "w", encoding="utf-8") as f:
            json.dump(truth, f, ensure_ascii=False, indent=2)
    print(f"[OK] {len(DEMO_EXPERIMENTS)} 个谱图 JSON + 真值清单 → {output_dir}/")


def get_all_demo_import_payloads():
    """返回用于程序化导入的 payload 列表"""
    payloads = []
    for exp in DEMO_EXPERIMENTS:
        spectrum = build_spectrum_for_experiment(exp)
        true_params = spectrum.pop("_true_params")
        payloads.append({
            "batch_no": exp["batch_no"],
            "spectrum_payload": spectrum,
            "operator": exp["operator"],
            "experiment_date": exp["experiment_date"],
            "initial_weight": exp["initial_weight"],
            "curing_agent_ratio": exp["curing_agent_ratio"],
            "actual_concentration": exp["actual_concentration"],
            "remark": exp["remark"],
            "allow_update": True,
            "_expected_params": true_params,
        })
    return DEMO_BATCHES, payloads


if __name__ == "__main__":
    save_sample_files()
    print("\n可复现样例生成完成。每个谱图对应独立的 seed,保证可重复。")
