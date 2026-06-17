"""核心预警逻辑：计算 COP、比对阈值、输出预警结果。

强化点：
- 每条预警附带「判定依据」：实际值 vs 阈值，可直接复核
- 边界样本（备注含"边界样本"）显式标记，方便人工抽验
- 状态链路：坏数据/缺口/无铭牌 → 是否纳入统计 → 预警级别，可追溯
- 汇总统计与明细行级过滤使用同一表达式，保证口径一致
"""
import pandas as pd
from typing import Tuple, Dict


WATER_SPECIFIC_HEAT = 4.186  # kJ/(kg·℃)
WATER_DENSITY = 1000  # kg/m³


def calculate_cop(samples_df: pd.DataFrame) -> pd.DataFrame:
    """计算每条样本的 COP（性能系数）。

    COP = 制热量 / 功耗
    制热量(kW) = 流量(m³/h) × 1000(kg/m³) × 温差(℃) × 4.186(kJ/(kg·℃)) / 3600(s)

    坏数据、采样缺口、功耗≤0 时 COP 置空，不参与后续统计。
    """
    df = samples_df.copy()

    required = ["流量(m³/h)", "出水温度(℃)", "回水温度(℃)", "功耗(kW)"]
    if not all(col in df.columns for col in required):
        df["COP"] = None
        df["制热量(kW)"] = None
        df["温差(℃)"] = None
        return df

    df["温差(℃)"] = (df["出水温度(℃)"] - df["回水温度(℃)"]).round(2)
    temp_diff = df["出水温度(℃)"] - df["回水温度(℃)"]
    heat_power_kw = (df["流量(m³/h)"] * WATER_DENSITY * temp_diff * WATER_SPECIFIC_HEAT) / 3600

    df["制热量(kW)"] = heat_power_kw.round(4)
    raw_cop = heat_power_kw / df["功耗(kW)"]
    df["COP"] = raw_cop.round(4).where(~raw_cop.isin([float("inf"), float("-inf")]), None)

    invalid_mask = (
        (df["功耗(kW)"] <= 0)
        | df["坏数据"].fillna(False)
        | df["采样缺口"].fillna(False)
        | df["COP"].isna()
        | raw_cop.isin([float("inf"), float("-inf")])
    )
    df.loc[invalid_mask, "COP"] = None
    df.loc[invalid_mask, "制热量(kW)"] = None

    return df


def _mark_boundary(df: pd.DataFrame) -> pd.DataFrame:
    """显式标记边界样本（备注包含「边界样本」字样）。"""
    df["边界样本"] = False
    if "备注" in df.columns:
        note_mask = df["备注"].fillna("").str.contains("边界样本", na=False)
        df.loc[note_mask, "边界样本"] = True
    return df


def run_alert(samples_df: pd.DataFrame, nameplate_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """执行阈值预警，返回带预警标记的明细 DataFrame 和汇总字典。

    预警规则（阈值来自铭牌）：
    - COP < 铭牌下限 → 低COP预警
    - COP > 铭牌上限 → 高COP预警
    - 出水温度 > 铭牌最高 → 超温预警
    - 出水温度 < 铭牌最低 → 低温预警

    不纳入统计的情形（优先级高→低）：
    1. 坏数据 → 预警类型"数据异常"，级别"异常"
    2. 采样缺口 → 预警类型"采样缺口"，级别"注意"
    3. 无铭牌数据 → 预警类型"无铭牌数据"，级别"注意"
    """
    df = calculate_cop(samples_df)
    df = _mark_boundary(df)

    nameplate_map = {}
    for _, row in nameplate_df.iterrows():
        nameplate_map[str(row["设备编号"])] = row

    df["预警类型"] = ""
    df["预警级别"] = ""
    df["判定依据"] = ""
    df["参考铭牌行"] = ""
    df["是否纳入统计"] = True

    FILTER_VALID = "是否纳入统计"
    FILTER_ALERT = "预警级别"

    for idx, row in df.iterrows():
        device_id = str(row["设备编号"])
        np_row = nameplate_map.get(device_id)
        nameplate_ref = ""
        if np_row is not None and "_铭牌原始行号" in np_row.index:
            nameplate_ref = f"设备铭牌-{device_id}[行{int(np_row['_铭牌原始行号'])}]"
        elif np_row is not None:
            nameplate_ref = f"设备铭牌-{device_id}"

        if row["坏数据"]:
            df.at[idx, "预警类型"] = "数据异常"
            df.at[idx, "预警级别"] = "异常"
            df.at[idx, FILTER_VALID] = False
            df.at[idx, "参考铭牌行"] = nameplate_ref
            df.at[idx, "判定依据"] = f"坏数据原因：{row['坏数据原因']}"
            continue

        if row["采样缺口"]:
            df.at[idx, "预警类型"] = "采样缺口"
            df.at[idx, "预警级别"] = "注意"
            df.at[idx, FILTER_VALID] = False
            df.at[idx, "参考铭牌行"] = nameplate_ref
            gap_min = row.get("采样间隔_分钟", "")
            df.at[idx, "判定依据"] = f"与上一条采样间隔 {gap_min} 分钟 > 阈值30分钟"
            continue

        if np_row is None:
            df.at[idx, "预警类型"] = "无铭牌数据"
            df.at[idx, "预警级别"] = "注意"
            df.at[idx, FILTER_VALID] = False
            df.at[idx, "判定依据"] = f"设备编号 {device_id} 在铭牌中未找到"
            continue

        alerts = []
        evidences = []
        level = "正常"

        cop = row["COP"]
        cop_lower = np_row["COP下限"]
        cop_upper = np_row["COP上限"]
        if pd.notna(cop):
            if cop < cop_lower:
                alerts.append("低COP预警")
                level = "预警"
                evidences.append(f"COP={cop} < 下限={cop_lower}")
            elif cop > cop_upper:
                alerts.append("高COP预警")
                level = "预警"
                evidences.append(f"COP={cop} > 上限={cop_upper}")
            else:
                evidences.append(f"COP={cop} ∈ [{cop_lower},{cop_upper}]")

        out_temp = row["出水温度(℃)"]
        temp_max = np_row["最高出水温度(℃)"]
        temp_min = np_row["最低出水温度(℃)"]
        if pd.notna(out_temp):
            if out_temp > temp_max:
                alerts.append("超温预警")
                level = "预警"
                evidences.append(f"出水温度={out_temp}℃ > 最高={temp_max}℃")
            elif out_temp < temp_min:
                alerts.append("低温预警")
                level = "预警"
                evidences.append(f"出水温度={out_temp}℃ < 最低={temp_min}℃")
            else:
                evidences.append(f"出水温度={out_temp}℃ ∈ [{temp_min},{temp_max}]℃")

        df.at[idx, "预警类型"] = ",".join(alerts) if alerts else "正常"
        df.at[idx, "预警级别"] = level
        df.at[idx, "参考铭牌行"] = nameplate_ref
        df.at[idx, "判定依据"] = "；".join(evidences)

    summary = _build_summary(df, nameplate_map)
    return df, summary


def _build_summary(df: pd.DataFrame, nameplate_map: Dict) -> Dict:
    """构建汇总统计。

    注意：过滤表达式必须与明细中实际写入的字段值完全一致，
    才能保证汇总和明细口径一致。
    """
    total = len(df)

    valid_mask = df["是否纳入统计"] == True
    valid = df[valid_mask]
    valid_count = len(valid)

    bad_count = int((df["预警类型"] == "数据异常").sum())
    gap_count = int((df["预警类型"] == "采样缺口").sum())
    no_nameplate = int((df["预警类型"] == "无铭牌数据").sum())

    assert bad_count == int(df["坏数据"].sum()), "坏数据计数不一致"
    assert gap_count == int(df["采样缺口"].sum()), "采样缺口计数不一致"

    alert_mask = valid["预警级别"] == "预警"
    normal_mask = valid["预警级别"] == "正常"
    alert_count = int(alert_mask.sum())
    normal_count = int(normal_mask.sum())

    assert normal_count + alert_count == valid_count, (
        f"汇总口径不一致：正常{normal_count} + 预警{alert_count} "
        f"≠ 有效{valid_count}"
    )

    alert_types = {}
    for t in valid.loc[alert_mask, "预警类型"].unique():
        if t and t != "正常":
            for sub_t in t.split(","):
                alert_types[sub_t] = alert_types.get(sub_t, 0) + int(
                    valid["预警类型"].str.contains(sub_t, na=False).sum()
                )

    avg_cop = valid["COP"].mean()
    avg_cop = round(float(avg_cop), 4) if pd.notna(avg_cop) else None

    boundary_total = int(df["边界样本"].sum())
    boundary_alert = int((df["边界样本"] & valid_mask & alert_mask).sum())

    device_stats = {}
    for device in df["设备编号"].unique():
        dev_df = df[df["设备编号"] == device]
        dev_valid_mask = dev_df["是否纳入统计"] == True
        dev_valid = dev_df[dev_valid_mask]
        dev_alert_count = int((dev_valid["预警级别"] == "预警").sum())
        cop_series = dev_valid["COP"].dropna()
        device_stats[str(device)] = {
            "样本总数": int(len(dev_df)),
            "有效样本": int(len(dev_valid)),
            "坏数据": int(dev_df["坏数据"].sum()),
            "采样缺口": int(dev_df["采样缺口"].sum()),
            "预警数": dev_alert_count,
            "平均COP": round(float(cop_series.mean()), 4) if len(cop_series) > 0 else None,
            "边界样本数": int(dev_df["边界样本"].sum()),
        }

    return {
        "样本总数": total,
        "有效样本数": valid_count,
        "坏数据数": bad_count,
        "采样缺口数": gap_count,
        "无铭牌数据数": no_nameplate,
        "正常样本数": normal_count,
        "预警样本数": alert_count,
        "预警类型分布": alert_types,
        "整体平均COP": avg_cop,
        "边界样本总数": boundary_total,
        "边界样本中预警数": boundary_alert,
        "设备统计": device_stats,
        "设备铭牌数": len(nameplate_map),
    }


FILTER_VALID = "是否纳入统计"
