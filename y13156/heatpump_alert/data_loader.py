"""数据加载模块：加载设备铭牌、循环样本数据，识别采样缺口。"""
import os
import pandas as pd
from typing import Tuple, List, Dict


def load_nameplate(input_dir: str) -> pd.DataFrame:
    """加载设备铭牌数据，返回 DataFrame。

    设备铭牌文件必须命名为 nameplate.csv 或 nameplate.xlsx，
    至少包含列：设备编号、型号、额定功率(kW)、COP上限、COP下限、
    最高出水温度(℃)、最低出水温度(℃)、循环流量(m³/h)。
    """
    csv_path = os.path.join(input_dir, "nameplate.csv")
    xlsx_path = os.path.join(input_dir, "nameplate.xlsx")

    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
    elif os.path.exists(xlsx_path):
        df = pd.read_excel(xlsx_path)
    else:
        raise FileNotFoundError(f"设备铭牌文件未找到，请在 {input_dir} 下放置 nameplate.csv 或 nameplate.xlsx")

    df.columns = df.columns.str.strip()
    return df


def load_samples(input_dir: str) -> pd.DataFrame:
    """加载循环样本数据，识别采样缺口并标记。

    样本文件命名为 samples.csv 或 samples.xlsx，
    至少包含列：设备编号、循环序号、采样时间、出水温度(℃)、
    回水温度(℃)、功耗(kW)、流量(m³/h)。
    """
    csv_path = os.path.join(input_dir, "samples.csv")
    xlsx_path = os.path.join(input_dir, "samples.xlsx")

    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
    elif os.path.exists(xlsx_path):
        df = pd.read_excel(xlsx_path)
    else:
        raise FileNotFoundError(f"样本数据文件未找到，请在 {input_dir} 下放置 samples.csv 或 samples.xlsx")

    df.columns = df.columns.str.strip()

    if "采样时间" in df.columns:
        df["采样时间"] = pd.to_datetime(df["采样时间"], errors="coerce")

    df = _mark_gaps(df)
    df = _mark_bad_data(df)
    return df


def _mark_gaps(df: pd.DataFrame) -> pd.DataFrame:
    """标记采样缺口：相邻采样间隔超过 30 分钟视为缺口。"""
    if "采样时间" not in df.columns or "设备编号" not in df.columns:
        df["采样缺口"] = False
        return df

    df = df.sort_values(["设备编号", "采样时间"]).reset_index(drop=True)
    df["采样缺口"] = False

    for device in df["设备编号"].unique():
        mask = df["设备编号"] == device
        times = df.loc[mask, "采样时间"]
        diffs = times.diff()
        gap_mask = diffs > pd.Timedelta(minutes=30)
        df.loc[mask & gap_mask, "采样缺口"] = True

    return df


def _mark_bad_data(df: pd.DataFrame) -> pd.DataFrame:
    """标记明显坏数据（空值、温度/功耗为负、流量异常等）。"""
    df["坏数据"] = False
    df["坏数据原因"] = ""

    numeric_cols = ["出水温度(℃)", "回水温度(℃)", "功耗(kW)", "流量(m³/h)"]
    for col in numeric_cols:
        if col in df.columns:
            null_mask = df[col].isna()
            df.loc[null_mask, "坏数据"] = True
            df.loc[null_mask, "坏数据原因"] += f"{col}为空;"

            neg_mask = df[col] < 0
            df.loc[neg_mask & ~null_mask, "坏数据"] = True
            df.loc[neg_mask & ~null_mask, "坏数据原因"] += f"{col}为负;"

    if "出水温度(℃)" in df.columns and "回水温度(℃)" in df.columns:
        reverse_mask = df["出水温度(℃)"] < df["回水温度(℃)"]
        valid_mask = df["出水温度(℃)"].notna() & df["回水温度(℃)"].notna()
        df.loc[reverse_mask & valid_mask & ~df["坏数据"], "坏数据"] = True
        df.loc[reverse_mask & valid_mask, "坏数据原因"] += "进出水温颠倒;"

    return df


def load_note(input_dir: str) -> str:
    """加载后补说明文本（note.txt），不存在则返回空字符串。"""
    note_path = os.path.join(input_dir, "note.txt")
    if os.path.exists(note_path):
        with open(note_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    return ""


def list_input_files(input_dir: str) -> List[str]:
    """列出输入目录下的所有文件。"""
    if not os.path.exists(input_dir):
        return []
    return sorted(os.listdir(input_dir))
