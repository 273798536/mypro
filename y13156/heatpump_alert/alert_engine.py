"""核心预警逻辑：计算 COP、比对阈值、输出预警结果。"""
import pandas as pd
from typing import Tuple, Dict


WATER_SPECIFIC_HEAT = 4.186  # kJ/(kg·℃)
WATER_DENSITY = 1000  # kg/m³


def calculate_cop(samples_df: pd.DataFrame) -> pd.DataFrame:
    """计算每条样本的 COP（性能系数）。

    COP = 制热量 / 功耗
    制热量(kW) = 流量(m³/h) × 1000(kg/m³) × 温差(℃) × 4.186(kJ/(kg·℃)) / 3600(s)
    """
    df = samples_df.copy()

    required = ["流量(m³/h)", "出水温度(℃)", "回水温度(℃)", "功耗(kW)"]
    if not all(col in df.columns for col in required):
        df["COP"] = None
        return df

    temp_diff = df["出水温度(℃)"] - df["回水温度(℃)"]
    heat_power_kw = (df["流量(m³/h)"] * WATER_DENSITY * temp_diff * WATER_SPECIFIC_HEAT) / 3600

    df["制热量(kW)"] = heat_power_kw.round(4)
    df["COP"] = (heat_power_kw / df["功耗(kW)"]).round(4)

    invalid_mask = (df["功耗(kW)"] <= 0) | df["坏数据"] | df["采样缺口"]
    df.loc[invalid_mask, "COP"] = None
    df.loc[invalid_mask, "制热量(kW)"] = None

    return df


def run_alert(samples_df: pd.DataFrame, nameplate_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """执行阈值预警，返回带预警标记的明细 DataFrame 和汇总字典。

    预警规则：
    - COP 低于铭牌下限 → 低COP预警
    - COP 高于铭牌上限 → 高COP预警（疑似异常）
    - 出水温度超过铭牌最高 → 超温预警
    - 出水温度低于铭牌最低 → 低温预警
    - 坏数据 → 数据异常，不计入统计
    - 采样缺口 → 单独标记
    """
    df = calculate_cop(samples_df)

    nameplate_map = {}
    for _, row in nameplate_df.iterrows():
        nameplate_map[str(row["设备编号"])] = row

    df["预警类型"] = ""
    df["预警级别"] = ""
    df["参考铭牌行"] = ""
    df["是否纳入统计"] = True

    for idx, row in df.iterrows():
        device_id = str(row["设备编号"])
        np_row = nameplate_map.get(device_id)

        if row["坏数据"]:
            df.at[idx, "预警类型"] = "数据异常"
            df.at[idx, "预警级别"] = "异常"
            df.at[idx, "是否纳入统计"] = False
            if np_row is not None:
                df.at[idx, "参考铭牌行"] = f"设备铭牌-{device_id}"
            continue

        if row["采样缺口"]:
            df.at[idx, "预警类型"] = "采样缺口"
            df.at[idx, "预警级别"] = "注意"
            df.at[idx, "是否纳入统计"] = False
            continue

        if np_row is None:
            df.at[idx, "预警类型"] = "无铭牌数据"
            df.at[idx, "预警级别"] = "注意"
            df.at[idx, "是否纳入统计"] = False
            continue

        alerts = []
        level = "正常"

        cop = row["COP"]
        if pd.notna(cop):
            if cop < np_row["COP下限"]:
                alerts.append("低COP预警")
                level = "预警"
            elif cop > np_row["COP上限"]:
                alerts.append("高COP预警")
                level = "预警"

        out_temp = row["出水温度(℃)"]
        if pd.notna(out_temp):
            if out_temp > np_row["最高出水温度(℃)"]:
                alerts.append("超温预警")
                level = "预警"
            elif out_temp < np_row["最低出水温度(℃)"]:
                alerts.append("低温预警")
                if level != "预警":
                    level = "预警"

        df.at[idx, "预警类型"] = ",".join(alerts) if alerts else "正常"
        df.at[idx, "预警级别"] = level
        df.at[idx, "参考铭牌行"] = f"设备铭牌-{device_id}"

    summary = _build_summary(df, nameplate_map)
    return df, summary


def _build_summary(df: pd.DataFrame, nameplate_map: Dict) -> Dict:
    """构建汇总统计。"""
    total = len(df)
    valid = df[df["是否纳入统计"]]
    valid_count = len(valid)
    bad_count = df["坏数据"].sum()
    gap_count = df["采样缺口"].sum()
    no_nameplate = (df["预警类型"] == "无铭牌数据").sum()

    alert_count = len(valid[valid["预警级别"] == "预警"])
    normal_count = len(valid[valid["预警级别"] == "正常"])

    alert_types = {}
    for t in valid["预警类型"].unique():
        if t and t != "正常":
            alert_types[t] = int((valid["预警类型"] == t).sum())

    avg_cop = valid["COP"].mean()
    avg_cop = round(float(avg_cop), 4) if pd.notna(avg_cop) else None

    device_stats = {}
    for device in df["设备编号"].unique():
        dev_df = df[df["设备编号"] == device]
        dev_valid = dev_df[dev_df["是否纳入统计"]]
        device_stats[str(device)] = {
            "样本总数": int(len(dev_df)),
            "有效样本": int(len(dev_valid)),
            "坏数据": int(dev_df["坏数据"].sum()),
            "采样缺口": int(dev_df["采样缺口"].sum()),
            "预警数": int((dev_valid["预警级别"] == "预警").sum()),
            "平均COP": round(float(dev_valid["COP"].mean()), 4) if len(dev_valid) > 0 and dev_valid["COP"].notna().any() else None,
        }

    return {
        "样本总数": total,
        "有效样本数": valid_count,
        "坏数据数": int(bad_count),
        "采样缺口数": int(gap_count),
        "无铭牌数据数": int(no_nameplate),
        "正常样本数": int(normal_count),
        "预警样本数": int(alert_count),
        "预警类型分布": alert_types,
        "整体平均COP": avg_cop,
        "设备统计": device_stats,
        "设备铭牌数": len(nameplate_map),
    }
