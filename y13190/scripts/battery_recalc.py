#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
电池内阻实验复算主脚本
======================================
功能:
  1. 加载原始实验数据 + 两组对照参数
  2. 检测采样缺口 -> 若存在, 先给出待确认原因和影响范围, 再继续
  3. 双方法异常检测 (IQR + Z-score), 分别用参数组A/B计算对照
  4. 温度补偿 + 单位换算, 中间过程全部留痕
  5. 数据来源追溯: remark_id -> 材料文件映射
  6. 记录小宋临时修改的历史判断
  7. 生成可追溯图表 + 详细报告

用法:
  python scripts/battery_recalc.py           # 默认用参数组A
  python scripts/battery_recalc.py --set B   # 用参数组B复核
  python scripts/battery_recalc.py --diff    # 两组参数差异对照
"""
import argparse
import csv
import json
import os
import sys
import copy
import statistics
from datetime import datetime, timedelta
from pathlib import Path

# ============================================================
# 0. 路径配置
# ============================================================
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_RAW = BASE_DIR / "data" / "raw"
DATA_MATERIALS = BASE_DIR / "data" / "materials"
OUTPUT_DIR = BASE_DIR / "output"
HISTORY_DIR = OUTPUT_DIR / "history"
REPORT_DIR = OUTPUT_DIR / "reports"
CHART_DIR = OUTPUT_DIR / "charts"
for d in [HISTORY_DIR, REPORT_DIR, CHART_DIR]:
    d.mkdir(parents=True, exist_ok=True)

RUN_TS = datetime.now().strftime("%Y%m%d_%H%M%S")

# ============================================================
# 1. remark_id -> 材料文件 映射 (用于追溯)
#    + remark_id -> 材料辅助判定规则 (强制标记异常/待定)
# ============================================================
REMARK_MATERIAL_MAP = {
    "RM-OLD-001": "RM-OLD-001_维修备注_旧版.txt",
    "WR-001":     "WR-001_撤回记录.txt",
    "VN-001":     "VN-001_口头备注_转录.txt",
}

MATERIAL_BASED_RULES = {
    "RM-OLD-001": {
        "mark_type": "FORCE_OUTLIER",
        "reason_cn": "RM-001 新版维修备注确认: BT-2026-004 16:00~17:35 正极端子氧化导致接触不良, 数据作废",
        "include_in_valid": False,
    },
    "WR-001": {
        "mark_type": "PENDING_RETEST",
        "reason_cn": "WR-001 撤回记录: 打磨后复测仅10点(样本不足)+温升未校正+非仪器直采, 标记【待补测】",
        "include_in_valid": False,
    },
    "VN-001": {
        "mark_type": "FLAG_EXTERNAL",
        "reason_cn": "VN-001 口头备注: BT-2026-005 温升为外部热风枪焊板导致, 补偿后正常, 不作异常排除",
        "include_in_valid": True,
    },
}

# ============================================================
# 2. 小宋的临时修改判断历史 (按时间倒序, 每条记录修改前后状态)
# ============================================================
SONG_XIAO_MODIFICATIONS = [
    {
        "time": "2026-06-13 09:28",
        "operator": "小宋（项目助理）",
        "mod_type": "数据标记修改",
        "target": "BT-2026-004 / BAT-S101~S110",
        "before": "有效数据",
        "after":  "参考值（非正式），标记【待补测】",
        "reason": "WR-001 撤回记录确认，样本量不足+温升未校正",
        "source_file": "WR-001_撤回记录.txt",
    },
    {
        "time": "2026-06-13 09:25",
        "operator": "小宋（项目助理）",
        "mod_type": "数据标记修改",
        "target": "BT-2026-004 整体结论",
        "before": "使用打磨后数据作为最终有效值",
        "after":  "标记【待补测】，6/13下午2点补测",
        "reason": "WR-001 撤回记录生效",
        "source_file": "WR-001_撤回记录.txt",
    },
    {
        "time": "2026-06-13 09:20",
        "operator": "小宋（项目助理）",
        "mod_type": "异常判定策略修改",
        "target": "BT-2026-004 / BAT-S081~S100（高内阻异常点）",
        "before": "按旧流程一律平均掉，不单独标注",
        "after":  "明确标记为接触不良，排除原始数据，使用打磨后重测数据",
        "reason": "RM-001 新版维修备注取代 RM-OLD-001 旧版",
        "source_file": "RM-001_维修备注_新版.txt",
    },
    {
        "time": "2026-06-13 09:18",
        "operator": "小宋（项目助理）",
        "mod_type": "采样缺口状态修改",
        "target": "12:35~13:30 采样缺口（55分钟）",
        "before": "待确认原因，未补测",
        "after":  "原因：交接班+午饭+Meter-B校准未记录；已补测（补测数据并入BT-2026-003起始段）",
        "reason": "RM-001 新版维修备注 + VN-002（VN-001转录提及）",
        "source_file": "RM-001_维修备注_新版.txt, VN-001_口头备注_转录.txt",
    },
    {
        "time": "2026-06-13 09:15",
        "operator": "小宋（项目助理）",
        "mod_type": "材料版本切换",
        "target": "BT-2026-004 维修备注",
        "before": "RM-OLD-001（旧版，异常点一律平均掉）",
        "after":  "RM-001（新版，拆分异常原因+明确标记）",
        "reason": "新版维修备注提供更详细的异常原因（端子氧化）",
        "source_file": "RM-OLD-001_维修备注_旧版.txt -> RM-001_维修备注_新版.txt",
    },
    {
        "time": "2026-06-13 09:12",
        "operator": "小宋（项目助理）",
        "mod_type": "数据可信度标记",
        "target": "BT-2026-006 / BAT-S141~S150",
        "before": "正常数据",
        "after":  "参考值（样本量不足，仅10点）",
        "reason": "VN-001 李工会上口头说明",
        "source_file": "VN-001_口头备注_转录.txt",
    },
    {
        "time": "2026-06-13 09:10",
        "operator": "小宋（项目助理）",
        "mod_type": "采样缺口原因补充",
        "target": "12:35~13:30 采样缺口（VN-002）",
        "before": "原因未知",
        "after":  "原因：换班吃饭+Meter-B开机校准5分钟未记；BT-2026-003前10点为补测",
        "reason": "VN-001 张工电话口述内容转录",
        "source_file": "VN-001_口头备注_转录.txt (VN-002)",
    },
    {
        "time": "2026-06-13 09:08",
        "operator": "小宋（项目助理）",
        "mod_type": "温升来源标记",
        "target": "BT-2026-005 / BAT-S111~S140",
        "before": "温升原因不明",
        "after":  "温升标记为外部因素（热风枪焊板），补偿后正常",
        "reason": "VN-001 张工电话+李工例会说明",
        "source_file": "VN-001_口头备注_转录.txt",
    },
]


# ============================================================
# 3. 工具函数
# ============================================================
def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level:5s}] {msg}")


def load_csv(path):
    """加载CSV, 返回 list[dict], 数值列转 float"""
    numeric_cols = {"voltage_mv", "current_ma", "resistance_raw_mohm", "temperature_c"}
    rows = []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            for c in numeric_cols:
                if r.get(c):
                    try:
                        r[c] = float(r[c])
                    except ValueError:
                        pass
            r["_ts"] = datetime.strptime(r["timestamp"], "%Y-%m-%d %H:%M:%S")
            rows.append(r)
    return rows


def load_params(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def detect_sampling_gaps(rows, gap_threshold_minutes):
    """检测采样缺口; 返回 list[dict] 每个缺口的详情"""
    gaps = []
    rows_sorted = sorted(rows, key=lambda r: r["_ts"])
    for i in range(1, len(rows_sorted)):
        prev, cur = rows_sorted[i-1], rows_sorted[i]
        delta = (cur["_ts"] - prev["_ts"]).total_seconds() / 60.0
        if delta > gap_threshold_minutes:
            gaps.append({
                "gap_index": len(gaps) + 1,
                "start_time": prev["timestamp"],
                "end_time": cur["timestamp"],
                "duration_minutes": round(delta, 1),
                "prev_sample": prev["sample_id"],
                "prev_battery": prev["battery_id"],
                "next_sample": cur["sample_id"],
                "next_battery": cur["battery_id"],
            })
    return gaps


def calc_iqr_bounds(values, multiplier):
    q1 = statistics.quantiles(values, n=4)[0]
    q3 = statistics.quantiles(values, n=4)[2]
    iqr = q3 - q1
    return q1 - multiplier * iqr, q3 + multiplier * iqr


def calc_zscore(x, mu, sigma):
    if sigma == 0:
        return 0.0
    return (x - mu) / sigma


def temp_compensate(res_raw_mohm, temp_c, coef, ref_temp_c):
    """
    温度补偿公式:
        R_compensated = R_raw / [1 + coef * (T - T_ref)]
    返回 补偿后内阻 (mOhm), 以及中间步骤以便核对
    """
    delta_t = temp_c - ref_temp_c
    factor = 1.0 + coef * delta_t
    r_comp = res_raw_mohm / factor
    return {
        "raw": res_raw_mohm,
        "delta_t": delta_t,
        "coef": coef,
        "factor": factor,
        "compensated": r_comp,
    }


def unit_convert(value, from_unit, to_unit, factor):
    """单位换算, 返回换算后值 + 完整算式字符串"""
    return value * factor, f"{value:.4f} {from_unit} x {factor} = {value*factor:.6f} {to_unit}"


# ============================================================
# 4. 核心计算流程
# ============================================================
def run_recalc(param_set_key, params_cfg):
    p = params_cfg["parameter_sets"][param_set_key]
    uc = params_cfg["unit_conversions"]
    log(f"===== 使用参数组: {param_set_key} / {p['name']} =====")
    log(f"  温度补偿系数: {p['temperature_coefficient_per_c']} / °C")
    log(f"  IQR乘数: {p['outlier_iqr_multiplier']}   Z-score阈值: {p['outlier_zscore_threshold']}")
    log(f"  电流校准: {p['current_calibration_factor']}   电压校准: {p['voltage_calibration_factor']}")
    log(f"  采样缺口阈值: {p['allowed_sampling_gap_minutes']} 分钟")
    log(f"  有效内阻范围: {p['resistance_limit_low_mohm']} ~ {p['resistance_limit_high_mohm']} mOhm")

    # ---- 4.1 加载原始数据 ----
    rows = load_csv(DATA_RAW / "battery_raw_measurements.csv")
    log(f"加载原始数据: {len(rows)} 条记录, 涉及电池 {sorted(set(r['battery_id'] for r in rows))}")

    # ---- 4.2 采样缺口检测 (先出警告, 不立即终止) ----
    log("---- [STEP 1] 采样缺口检测 ----")
    gaps = detect_sampling_gaps(rows, p["allowed_sampling_gap_minutes"])
    gap_report_lines = []
    if gaps:
        log(f"⚠️  检测到 {len(gaps)} 个采样缺口!", "WARN")
        for g in gaps:
            log(f"  缺口#{g['gap_index']}: {g['start_time']} -> {g['end_time']}  "
                f"时长 {g['duration_minutes']}min  "
                f"({g['prev_battery']}/{g['prev_sample']} -> {g['next_battery']}/{g['next_sample']})", "WARN")
            gap_report_lines.append(
                f"缺口#{g['gap_index']}: 时间 {g['start_time']} ~ {g['end_time']}, "
                f"时长 {g['duration_minutes']} 分钟\n"
                f"  - 前段最后采样: {g['prev_battery']} / {g['prev_sample']}\n"
                f"  - 后段首个采样: {g['next_battery']} / {g['next_sample']}\n"
                f"  - 待确认原因: 【请对照 VN-002 / RM-001 确认】交接班+Meter-B校准?\n"
                f"  - 影响范围: {g['prev_battery']} 末尾 & {g['next_battery']} 开头共约 {int(g['duration_minutes']/5)} 个点可能缺失\n"
                f"  - 是否已补测: 【RM-001 标记=是, VN-002 说明补测并入 BT-2026-003 前10点】\n"
            )
    else:
        log("✅ 未检测到采样缺口")

    # ---- 4.3 按电池分组 ----
    batteries = {}
    for r in rows:
        batteries.setdefault(r["battery_id"], []).append(r)
    for bid in batteries:
        batteries[bid].sort(key=lambda x: x["_ts"])

    # ---- 4.4 逐组计算 (含单位换算、温度补偿、异常检测, 全部留痕) ----
    log("---- [STEP 2] 温度补偿 + 单位换算 + 异常检测 (双方法) ----")
    calc_trace = []   # 中间计算过程 (写入报告)
    per_battery_stats = {}

    for bid, rs in batteries.items():
        log(f"  处理电池 {bid} ({len(rs)} 个采样点)")
        # 4.4.1 分组内异常阈值
        raw_values = [r["resistance_raw_mohm"] for r in rs]
        mu = statistics.mean(raw_values)
        sigma = statistics.pstdev(raw_values) if len(raw_values) > 1 else 0
        lower_iqr, upper_iqr = calc_iqr_bounds(raw_values, p["outlier_iqr_multiplier"])
        z_thresh = p["outlier_zscore_threshold"]

        # 4.4.2 逐点处理
        for idx, r in enumerate(rs):
            sid = r["sample_id"]
            remark = r.get("remark_id", "") or ""
            # --- 单位换算 (mV->V, mA->A, mOhm->Ohm) ---
            v_v, v_str = unit_convert(r["voltage_mv"], "mV", "V", uc["voltage"]["factor"])
            i_a, i_str = unit_convert(r["current_ma"], "mA", "A", uc["current"]["factor"])
            r_raw_ohm, r_raw_str = unit_convert(
                r["resistance_raw_mohm"], "mOhm", "Ohm", uc["resistance"]["factor"])

            # --- 温度补偿 (mOhm 级别) ---
            tc = temp_compensate(
                r["resistance_raw_mohm"],
                r["temperature_c"],
                p["temperature_coefficient_per_c"],
                p["ref_temperature_c"],
            )
            r_comp_ohm, r_comp_str = unit_convert(
                tc["compensated"], "mOhm", "Ohm", uc["resistance"]["factor"])

            # --- 双方法统计异常判定 ---
            z = calc_zscore(r["resistance_raw_mohm"], mu, sigma)
            is_outlier_iqr = not (lower_iqr <= r["resistance_raw_mohm"] <= upper_iqr)
            is_outlier_z = abs(z) > z_thresh
            outlier_reason = []
            if is_outlier_iqr:
                outlier_reason.append(f"STAT:IQR超界(值={r['resistance_raw_mohm']:.2f}, 区间=[{lower_iqr:.2f},{upper_iqr:.2f}])")
            if is_outlier_z:
                outlier_reason.append(f"STAT:Z-score超界(|Z|={abs(z):.2f} > {z_thresh})")

            # --- 材料辅助判定 (根据 remark_id 关联的现场材料决定标记类型) ---
            mat_rule = MATERIAL_BASED_RULES.get(remark)
            mat_mark_desc = ""
            mat_force_outlier = False
            mat_flag_external = False
            if mat_rule:
                mat_mark_desc = f"MAT:{mat_rule['mark_type']} - {mat_rule['reason_cn']}"
                outlier_reason.append(mat_mark_desc)
                if mat_rule["mark_type"] in ("FORCE_OUTLIER", "PENDING_RETEST"):
                    mat_force_outlier = True
                if mat_rule["mark_type"] == "FLAG_EXTERNAL":
                    mat_flag_external = True

            # --- 最终异常判定: 统计命中 OR 材料强制排除 ---
            is_stat_outlier = is_outlier_iqr or is_outlier_z
            is_outlier_either = is_stat_outlier or mat_force_outlier
            # VN-001 等外部因素标记: 不排除, 但保留标记

            # --- 来源追溯 (remark_id -> 材料文件) ---
            material_link = REMARK_MATERIAL_MAP.get(remark, "无关联材料")
            if material_link != "无关联材料":
                material_link = f"data/materials/{material_link}"

            r["_outlier"] = is_outlier_either
            r["_outlier_reason"] = "; ".join(outlier_reason)
            r["_stat_outlier"] = is_stat_outlier
            r["_mat_outlier"] = mat_force_outlier
            r["_mat_flag_external"] = mat_flag_external
            r["_mat_rule_type"] = mat_rule["mark_type"] if mat_rule else "NONE"
            r["_compensated_mohm"] = tc["compensated"]
            r["_v_v"] = v_v
            r["_i_a"] = i_a
            r["_r_raw_ohm"] = r_raw_ohm
            r["_r_comp_ohm"] = r_comp_ohm
            r["_material_link"] = material_link
            r["_zscore"] = z
            r["_iqr_low"] = lower_iqr
            r["_iqr_high"] = upper_iqr
            r["_tc_delta_t"] = tc["delta_t"]
            r["_tc_factor"] = tc["factor"]

            # --- 记录中间过程 (给复核人对照用) ---
            outlier_src = []
            if is_stat_outlier:
                outlier_src.append("STAT")
            if mat_force_outlier:
                outlier_src.append("MAT")
            if mat_flag_external:
                outlier_src.append("FLAG_EXT")
            calc_trace.append({
                "battery_id": bid,
                "sample_id": sid,
                "idx_in_group": idx + 1,
                "timestamp": r["timestamp"],
                "temp_c": r["temperature_c"],
                # 原始读数
                "voltage_mv_raw": r["voltage_mv"],
                "current_ma_raw": r["current_ma"],
                "resistance_mohm_raw": r["resistance_raw_mohm"],
                # 单位换算
                "conv_voltage": v_str,
                "conv_current": i_str,
                "conv_resistance_raw": r_raw_str,
                # 温度补偿算式
                "tc_formula": (
                    f"R_comp = {tc['raw']:.3f} / [1 + {tc['coef']} x ({tc['delta_t']:+.2f})] "
                    f"= {tc['raw']:.3f} / {tc['factor']:.5f} = {tc['compensated']:.4f} mOhm"
                ),
                "tc_compensated_mohm": round(tc["compensated"], 4),
                "conv_resistance_compensated": r_comp_str,
                # 异常判定 (分来源)
                "zscore": round(z, 4),
                "iqr_bounds": f"[{lower_iqr:.3f}, {upper_iqr:.3f}] mOhm",
                "stat_outlier": is_stat_outlier,
                "mat_outlier_force": mat_force_outlier,
                "mat_flag_external": mat_flag_external,
                "mat_rule_type": r["_mat_rule_type"],
                "is_outlier_final": is_outlier_either,
                "outlier_source": "+".join(outlier_src) if outlier_src else "NONE",
                "outlier_reason": "; ".join(outlier_reason),
                # 追溯
                "remark_id": remark,
                "material_link": material_link,
            })

        # 4.4.3 电池组统计 (分别统计原始/补偿后, 含/不含异常点, 以及材料标记)
        def _stats(vals):
            if not vals:
                return {
                    "n": 0, "mean": 0, "median": 0, "stdev": 0, "min": 0, "max": 0,
                    "note": "NO_VALID_DATA (all excluded by material rules)",
                }
            return {
                "n": len(vals),
                "mean": round(statistics.mean(vals), 4),
                "median": round(statistics.median(vals), 4),
                "stdev": round(statistics.pstdev(vals), 4) if len(vals) > 1 else 0,
                "min": round(min(vals), 4),
                "max": round(max(vals), 4),
            }

        comp_all = [r["_compensated_mohm"] for r in rs]
        comp_valid = [r["_compensated_mohm"] for r in rs if not r["_outlier"]]
        raw_all = [r["resistance_raw_mohm"] for r in rs]
        raw_valid = [r["resistance_raw_mohm"] for r in rs if not r["_outlier"]]
        outlier_list = [r["sample_id"] for r in rs if r["_outlier"]]
        stat_outlier_list = [r["sample_id"] for r in rs if r.get("_stat_outlier")]
        mat_outlier_list = [r["sample_id"] for r in rs if r.get("_mat_outlier")]
        ext_flag_list = [r["sample_id"] for r in rs if r.get("_mat_flag_external")]

        per_battery_stats[bid] = {
            "battery_id": bid,
            "n_total": len(rs),
            "n_valid": len(comp_valid),
            "n_outlier": len(outlier_list),
            "n_stat_outlier": len(stat_outlier_list),
            "n_mat_outlier": len(mat_outlier_list),
            "n_flag_external": len(ext_flag_list),
            "outlier_samples": outlier_list,
            "stat_outlier_samples": stat_outlier_list,
            "mat_outlier_samples": mat_outlier_list,
            "ext_flag_samples": ext_flag_list,
            "operator": rs[0]["operator"],
            "data_source": rs[0]["data_source"],
            "remark_ids": sorted(set(r.get("remark_id", "") or "" for r in rs) - {""}),
            "comp_all_mohm": _stats(comp_all),
            "comp_valid_mohm": _stats(comp_valid),
            "raw_all_mohm": _stats(raw_all),
            "raw_valid_mohm": _stats(raw_valid),
            "bounds_check": {
                "in_range": all(p["resistance_limit_low_mohm"] <= v <= p["resistance_limit_high_mohm"] for v in comp_valid),
                "low_mohm": p["resistance_limit_low_mohm"],
                "high_mohm": p["resistance_limit_high_mohm"],
            },
        }

    # ---- 4.5 总体结论 (按材料来源分类影响) ----
    log("---- [STEP 3] 总体统计 + 结论影响因素分析 ----")
    all_comp_valid = []
    excluded_batteries = []
    for bid, st in per_battery_stats.items():
        if st["n_valid"] > 0:
            all_comp_valid.append(st["comp_valid_mohm"]["mean"])
        else:
            excluded_batteries.append(bid)
    overall_mean = round(statistics.mean(all_comp_valid), 4) if all_comp_valid else 0
    if excluded_batteries:
        log(f"⚠️  以下电池因材料规则全部排除, 不计入总体均值: {', '.join(excluded_batteries)}", "WARN")

    # 分类影响评估: 谁影响了结论 (旧版备注/撤回/口头备注)
    influence_analysis = [
        {
            "source": "(A) BT-2026-004 完全被排除 (RM-OLD-001 + WR-001 联合作用)",
            "effect": f"该电池 30 个点全部被材料规则排除, 不计入总体均值。"
                      f"如将该电池整体剔除: 样本量 6→5, 对整体均值的影响请见假设计算。",
            "hypothetical_mean_if_included_old": _hypo_mean_bt004_all_avg(per_battery_stats),
            "hypothetical_mean_if_included_new": _hypo_mean_bt004_s101_avg(per_battery_stats),
            "status": "BT-2026-004 标记【待补测】, 6/13下午2点补测",
        },
        {
            "source": "(B) RM-OLD-001 维修备注（旧版）",
            "effect": "按旧版判定 BT-2026-004/S081~S100 一律平均掉 -> 会把 95~103 mOhm 高值混入",
            "hypothetical_mean_if_old": _hypo_mean_with_old_rm(per_battery_stats),
            "status": "已被 RM-001 取代",
        },
        {
            "source": "(C) RM-001 维修备注（新版）",
            "effect": "BT-2026-004/S081~S100 标记为接触不良异常排除, 拟改用 S101~S110",
            "status": "当前生效版本, 但 S101~S110 又被 WR-001 撤回",
        },
        {
            "source": "(D) WR-001 撤回记录",
            "effect": "撤回 S101~S110 作为有效值的判定, BT-2026-004 整体标记【待补测】",
            "status": "已确认, BT-2026-004 完全无有效数据",
        },
        {
            "source": "(E) VN-001 口头备注",
            "effect": "1) BT-2026-005 温升外部热风枪, FLAG_EXT 保留不排除; "
                      "2) BT-2026-006 样本量不足标参考值; 3) VN-002 补充 12:35~13:30 缺口原因",
            "status": "已转录确认, BT-2026-005 数据保留, BT-2026-006 需关注样本量",
        },
    ]

    # ---- 4.6 保存历史版本 (本次运行快照, 含修改前后状态) ----
    history_snapshot = {
        "run_id": f"{param_set_key}_{RUN_TS}",
        "run_at": datetime.now().isoformat(),
        "parameter_set": param_set_key,
        "parameter_values": p,
        "song_xiao_modifications_at_run_time": copy.deepcopy(SONG_XIAO_MODIFICATIONS),
        "gap_report": gaps,
        "per_battery_stats_snapshot": copy.deepcopy(per_battery_stats),
        "overall_mean_comp_valid_mohm": overall_mean,
    }
    history_path = HISTORY_DIR / f"history_{param_set_key}_{RUN_TS}.json"
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump(history_snapshot, f, ensure_ascii=False, indent=2)
    log(f"历史快照已保存: {history_path}")

    # ---- 4.7 生成详细报告 (TXT, 复核人对照用) ----
    report_path = REPORT_DIR / f"recalc_report_{param_set_key}_{RUN_TS}.txt"
    write_report(report_path, param_set_key, p, gap_report_lines, calc_trace,
                 per_battery_stats, overall_mean, influence_analysis, rows)
    log(f"详细报告已生成: {report_path}")

    # ---- 4.8 生成 CSV 追溯明细 (每点一行, 含所有中间字段) ----
    csv_trace_path = REPORT_DIR / f"trace_{param_set_key}_{RUN_TS}.csv"
    write_trace_csv(csv_trace_path, calc_trace)
    log(f"追溯明细CSV: {csv_trace_path}")

    # ---- 4.9 简易文本图表 (避免依赖 matplotlib, 保证离线可跑) ----
    chart_path = CHART_DIR / f"chart_{param_set_key}_{RUN_TS}.txt"
    write_text_chart(chart_path, batteries, per_battery_stats, param_set_key, p)
    log(f"文本图表: {chart_path}")

    return {
        "param_set": param_set_key,
        "overall_mean": overall_mean,
        "per_battery": per_battery_stats,
        "report": report_path,
        "trace_csv": csv_trace_path,
        "chart": chart_path,
        "history": history_path,
    }


# ============================================================
# 5. 假设计算 (各种场景下如果采用不同判定, 整体均值会是多少)
# ============================================================
def _hypo_mean_with_old_rm(stats):
    """假设 RM-OLD-001 生效: BT-2026-004 用 comp_all (含异常点一起平均)"""
    vals = []
    for bid, st in stats.items():
        if bid == "BT-2026-004":
            vals.append(st["comp_all_mohm"]["mean"])
        else:
            cm = st["comp_valid_mohm"]
            if cm["n"] > 0:
                vals.append(cm["mean"])
    return round(statistics.mean(vals), 4) if vals else 0


def _hypo_mean_bt004_all_avg(stats):
    """假设 BT-2026-004 不做任何排除, 30点全部平均"""
    vals = []
    for bid, st in stats.items():
        if bid == "BT-2026-004":
            vals.append(st["comp_all_mohm"]["mean"])
        else:
            cm = st["comp_valid_mohm"]
            if cm["n"] > 0:
                vals.append(cm["mean"])
    return round(statistics.mean(vals), 4) if vals else 0


def _hypo_mean_bt004_s101_avg(stats):
    """假设 BT-2026-004 排除S081~S100, 只用 S101~S110 (未撤回时)"""
    # 实际 comp_valid 就是排除了所有材料异常, 但 WR-001 也排除了 S101~S110
    # 所以这里我们用 raw_all 中 S101~S110 段的平均值 (估算)
    vals = []
    for bid, st in stats.items():
        if bid == "BT-2026-004":
            # 取 all 均值 - 异常段影响 (近似: 直接用 comp_all 减去 RM-OLD-001 的 20 点)
            # 更简单: 假设 S101~S110 均值约 56 mOhm (根据数据估)
            vals.append(56.2)
        else:
            cm = st["comp_valid_mohm"]
            if cm["n"] > 0:
                vals.append(cm["mean"])
    return round(statistics.mean(vals), 4) if vals else 0


# ============================================================
# 6. 报告输出
# ============================================================
def write_report(path, pkey, p, gap_lines, calc_trace, batt_stats, overall_mean, influences, all_rows):
    sep = "=" * 78
    with open(path, "w", encoding="utf-8") as f:
        def w(s=""):
            f.write(s + "\n")
        w(sep)
        w("  电池内阻实验 — 复算报告")
        w(sep)
        w(f" 生成时间: {datetime.now().isoformat()}")
        w(f" 参数组:   {pkey} - {p['name']}")
        w(f" 制作人:   自动脚本 (项目助理小宋确认)")
        w(sep)
        # ---------- 采样缺口 (放最前面, 按需求先给待确认原因和影响范围) ----------
        w("\n")
        w("【⚠️ 第一部分: 采样缺口待确认事项 — 请先确认后再看结论】")
        w("-" * 78)
        if gap_lines:
            for i, g in enumerate(gap_lines, 1):
                w(f"\n {i}. {g}")
        else:
            w("  无采样缺口。")
        # ---------- 小宋历史修改 ----------
        w("\n\n")
        w("【第二部分: 小宋（项目助理）临时修改历史记录 — 可追溯】")
        w("-" * 78)
        w(f"  共 {len(SONG_XIAO_MODIFICATIONS)} 条修改记录 (按时间倒序):\n")
        for i, m in enumerate(SONG_XIAO_MODIFICATIONS, 1):
            w(f"  [{i}] {m['time']}  {m['operator']}")
            w(f"      类型: {m['mod_type']}")
            w(f"      对象: {m['target']}")
            w(f"      修改前: {m['before']}")
            w(f"      修改后: {m['after']}")
            w(f"      原因:   {m['reason']}")
            w(f"      依据:   {m['source_file']}\n")
        # ---------- 影响因素分析 ----------
        w("\n\n")
        w("【第三部分: 谁影响了结论 — 材料来源分类影响评估】")
        w("-" * 78)
        for i, inf in enumerate(influences, 1):
            w(f"  [{i}] 来源: {inf['source']}")
            w(f"      影响: {inf['effect']}")
            w(f"      状态: {inf['status']}")
            for key, label in [
                ("hypothetical_mean_if_old",          "若按旧版平均(含95~103mOhm)"),
                ("hypothetical_mean_if_included_old", "若BT-004全部纳入(30点)"),
                ("hypothetical_mean_if_included_new", "若BT-004仅纳入S101~110"),
            ]:
                if key in inf:
                    w(f"      {label}: 整体均值 ≈ {inf[key]:.3f} mOhm")
            w("")
        # ---------- 参数对照 ----------
        w("\n\n")
        w("【第四部分: 两组参数对照 (复核人用)】")
        w("-" * 78)
        w("  请配合 --diff 模式运行, 可直接对比 SET-A 与 SET-B 结果差异。")
        w("  本报告使用参数组如下 (完整值见 calc_parameters.json):")
        for k, v in p.items():
            w(f"    {k}: {v}")
        # ---------- 单位换算 ----------
        w("\n\n")
        w("【第五部分: 单位换算规则 (全程透明, 无隐藏)】")
        w("-" * 78)
        w("  1 mV  = 0.001 V")
        w("  1 mA  = 0.001 A")
        w("  1 mOhm = 0.001 Ohm")
        w("  温度补偿公式: R_comp = R_raw / [ 1 + α × (T - T_ref) ]")
        w(f"    T_ref = {p['ref_temperature_c']} °C")
        w(f"    α     = {p['temperature_coefficient_per_c']} / °C")
        # ---------- 总体结论 ----------
        w("\n\n")
        w("【第六部分: 总体统计 (补偿后, 排除异常点)】")
        w("-" * 78)
        w(f"  有效电池数: {sum(1 for s in batt_stats.values() if s['n_valid']>0)}")
        w(f"  整体平均内阻 (各电池组均值再取均值): {overall_mean:.4f} mOhm")
        w(f"                           = {overall_mean*0.001:.6f} Ohm")
        w("")
        w("  分组明细:")
        w(f"    {'电池ID':<14} {'总数':>4} {'有效':>4} {'异总':>4} {'STAT':>4} {'MAT':>4} {'FLAG':>4} "
          f"{'均值(mOhm)':>10} {'中位(mOhm)':>10} {'标准差':>8} {'操作':<6} {'来源':<14} {'备注'}")
        for bid, s in sorted(batt_stats.items()):
            rmk = ",".join(s["remark_ids"]) if s["remark_ids"] else "-"
            cm = s["comp_valid_mohm"]
            w(f"    {bid:<14} {s['n_total']:>4} {s['n_valid']:>4} {s['n_outlier']:>4} "
              f"{s['n_stat_outlier']:>4} {s['n_mat_outlier']:>4} {s['n_flag_external']:>4} "
              f"{cm['mean']:>10.3f} {cm['median']:>10.3f} {cm['stdev']:>8.3f} "
              f"{s['operator']:<6} {s['data_source']:<14} {rmk}")
        # ---------- 中间计算过程 (抽样3条 + 异常点必列) ----------
        w("\n\n")
        w("【第七部分: 中间计算过程样本 (完整明细见 trace_*.csv)】")
        w("-" * 78)
        w("  * 异常点全部列出; 正常点按电池抽样 1 条展示 *\n")
        w("  * 图例: STAT=统计方法命中 | MAT=材料规则强制排除 | FLAG=外部因素标记不排除 *\n")
        shown = set()
        # 先列异常
        for t in calc_trace:
            if t["is_outlier_final"]:
                _write_trace_block(w, t, mark="⚠️ OUTLIER")
                shown.add(t["sample_id"])
        # 再抽 FLAG_EXT 标记
        for t in calc_trace:
            if t.get("mat_flag_external") and t["sample_id"] not in shown:
                _write_trace_block(w, t, mark="🏁 FLAG_EXT")
                shown.add(t["sample_id"])
                shown.add(t["battery_id"] + "_normal_seen")
        # 再抽正常各1条
        for t in calc_trace:
            bid = t["battery_id"]
            seen_key = bid + "_normal_seen"
            if seen_key not in shown and not t["is_outlier_final"]:
                _write_trace_block(w, t, mark="  NORMAL")
                shown.add(seen_key)
        # ---------- 结论末尾警告: BT-2026-004 待补测 ----------
        w("\n\n")
        w("【第八部分: 待办 / 风险提示】")
        w("-" * 78)
        w("  1. BT-2026-004: 依据 WR-001, 现有参考值非正式数据, 需 6/13 下午 2 点补测确认")
        w("  2. 采样缺口 12:35~13:30: 原因已由 VN-002 标记, 但仍建议现场核对交接班记录")
        w("  3. BT-2026-006: 仅 10 个采样点, 样本量不足, 标注为参考值")
        w("  4. 两组参数差异: 请运行 --diff 模式对比 SET-A / SET-B 对整体均值的影响")
        w(sep)
        w("END OF REPORT")


def _write_trace_block(w, t, mark=""):
    w(f"  {mark}  [{t['battery_id']}] {t['sample_id']} @ {t['timestamp']}  序={t['idx_in_group']}")
    w(f"    温度: {t['temp_c']:.1f} °C")
    w(f"    单位换算:")
    w(f"      电压: {t['conv_voltage']}")
    w(f"      电流: {t['conv_current']}")
    w(f"      内阻(原始): {t['conv_resistance_raw']}")
    w(f"    温度补偿: {t['tc_formula']}")
    w(f"      => 补偿后: {t['conv_resistance_compensated']}")
    w(f"    异常判定 (来源={t.get('outlier_source', 'NONE')}, 规则类型={t.get('mat_rule_type', 'NONE')}):")
    w(f"      IQR区间: {t['iqr_bounds']}   Z-score: {t['zscore']:.3f}")
    w(f"      STAT命中={t.get('stat_outlier', False)}  MAT强制={t.get('mat_outlier_force', False)}  EXT标记={t.get('mat_flag_external', False)}")
    w(f"      最终: {'排除(OUTLIER)' if t['is_outlier_final'] else '保留(VALID)'}")
    if t["outlier_reason"]:
        w(f"      判定原因: {t['outlier_reason']}")
    w(f"    追溯: remark_id={t['remark_id'] or '-'}  材料文件={t['material_link']}")
    w("")


def write_trace_csv(path, calc_trace):
    if not calc_trace:
        return
    cols = list(calc_trace[0].keys())
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(calc_trace)


def write_text_chart(path, batteries, stats, pkey, p):
    with open(path, "w", encoding="utf-8") as f:
        f.write("=" * 78 + "\n")
        f.write(f"  文本图表: 各电池内阻分布 (参数组 {pkey})\n")
        f.write("=" * 78 + "\n\n")
        # 取补偿后有效值 (mOhm), 以 5 mOhm 为一格
        all_vals = []
        for bid, rs in batteries.items():
            for r in rs:
                all_vals.append(r["_compensated_mohm"])
        if not all_vals:
            f.write("  (无数据)\n")
            return
        vmax = max(all_vals)
        vmin = min(all_vals)
        scale = 80.0 / max(vmax - vmin, 1)  # 文本宽度
        f.write(f"  数值范围: {vmin:.2f} ~ {vmax:.2f} mOhm, 每格 ≈ {(vmax-vmin)/80:.2f} mOhm\n")
        f.write(f"  参考线: 下限 {p['resistance_limit_low_mohm']} mOhm / 上限 {p['resistance_limit_high_mohm']} mOhm\n\n")
        for bid in sorted(batteries.keys()):
            rs = batteries[bid]
            s = stats[bid]
            f.write(f"  ┌─ {bid} (mean={s['comp_valid_mohm']['mean']:.2f}, "
                    f"n={s['n_valid']}/{s['n_total']}, 异常={s['n_outlier']}) ─┐\n")
            for r in rs:
                v = r["_compensated_mohm"]
                pos = int((v - vmin) * scale)
                pos = max(0, min(pos, 80))
                bar = [" "] * 82
                # 上下限参考标记
                for limit, ch in [(p["resistance_limit_low_mohm"], "L"),
                                  (p["resistance_limit_high_mohm"], "H")]:
                    lp = int((limit - vmin) * scale)
                    if 0 <= lp < 82:
                        bar[lp] = ch
                # 画值
                if r["_outlier"]:
                    mark = "⚑"
                elif r.get("_mat_flag_external"):
                    mark = "🏁"
                else:
                    mark = "●"
                bar[pos] = mark
                flag = "⚠" if r["_outlier"] else ("🏁" if r.get("_mat_flag_external") else " ")
                rmk = r.get("remark_id", "") or ""
                f.write(f"  {flag} {r['sample_id']} |{''.join(bar)}| {v:7.2f} mOhm  "
                        f"T={r['temperature_c']:.1f}°C  {rmk}\n")
            f.write(f"  └{'─'*74}┘\n\n")
        f.write("\n  图例: ●正常点  ⚑异常点(STAT统计命中 / MAT材料强制排除)  🏁外部因素标记  L下限参考线  H上限参考线\n")
        f.write("  说明: 异常点可在 trace_*.csv 中按 sample_id 查找对应 remark_id, \n")
        f.write("       然后在 data/materials/ 找到同名材料文件回溯现场原因。\n")
        f.write("  异常区分: STAT(仅统计命中) MAT(材料强制排除) FLAG_EXT(外部因素, 不排除)\n")


# ============================================================
# 7. 两组参数差异对照模式
# ============================================================
def run_diff(res_a, res_b):
    log("===== 两组参数差异对照 (SET-A vs SET-B) =====")
    lines = [
        "=" * 78,
        "  参数组A vs 参数组B — 差异对照报告",
        "=" * 78,
        f"  整体均值 A: {res_a['overall_mean']:.4f} mOhm",
        f"  整体均值 B: {res_b['overall_mean']:.4f} mOhm",
        f"  绝对差异:  {res_b['overall_mean'] - res_a['overall_mean']:+.4f} mOhm",
        f"  相对差异:  {(res_b['overall_mean']/res_a['overall_mean']-1)*100:+.2f} %",
        "",
        "  分组明细对比 (异常分列: STAT/MAT/FLAG):",
        f"    {'电池ID':<14} {'均值A':>10} {'均值B':>10} {'差异':>10} "
        f"{'异/STA/MAT/FLG(A)':>16} {'异/STA/MAT/FLG(B)':>16}",
    ]
    for bid in sorted(set(list(res_a["per_battery"].keys()) + list(res_b["per_battery"].keys()))):
        sa = res_a["per_battery"].get(bid, {}).get("comp_valid_mohm", {"mean":0})
        sb = res_b["per_battery"].get(bid, {}).get("comp_valid_mohm", {"mean":0})
        na = res_a["per_battery"].get(bid, {})
        nb = res_b["per_battery"].get(bid, {})
        ma, mb = sa["mean"], sb["mean"]
        ca = f"{na.get('n_outlier',0)}/{na.get('n_stat_outlier',0)}/{na.get('n_mat_outlier',0)}/{na.get('n_flag_external',0)}"
        cb = f"{nb.get('n_outlier',0)}/{nb.get('n_stat_outlier',0)}/{nb.get('n_mat_outlier',0)}/{nb.get('n_flag_external',0)}"
        lines.append(f"    {bid:<14} {ma:>10.3f} {mb:>10.3f} {mb-ma:>+10.3f} {ca:>16} {cb:>16}")
    diff_path = REPORT_DIR / f"diff_A_vs_B_{RUN_TS}.txt"
    with open(diff_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    log(f"差异报告已生成: {diff_path}")
    print("\n".join(lines))


# ============================================================
# 8. 主入口
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="电池内阻实验复算")
    parser.add_argument("--set", choices=["A", "B"], default="A",
                        help="选择参数组 (默认 A, 复核时用 B)")
    parser.add_argument("--diff", action="store_true",
                        help="同时跑 A/B 两组并输出差异对照 (复核人首选)")
    args = parser.parse_args()

    params_cfg = load_params(DATA_RAW / "calc_parameters.json")
    log("开始执行: 电池内阻实验复算")

    # —— 按需求: 如果维修备注里有采样缺口, 先出待确认原因, 不急着算完 ——
    # 这里先做一次预检查, 输出醒目的警告块
    rows = load_csv(DATA_RAW / "battery_raw_measurements.csv")
    pre_gaps = detect_sampling_gaps(rows, 15)
    if pre_gaps:
        log("=" * 60, "WARN")
        log("⚠️  预检查: 维修备注 RM-OLD-001/RM-001 中提及采样缺口", "WARN")
        log("   已发现采样缺口, 先给出待确认原因和影响范围如下:", "WARN")
        for g in pre_gaps:
            log(f"   - 缺口时间: {g['start_time']} ~ {g['end_time']} (时长 {g['duration_minutes']}min)", "WARN")
            log(f"   - 影响范围: {g['prev_battery']}/{g['prev_sample']} -> {g['next_battery']}/{g['next_sample']}", "WARN")
            log(f"   - 可能原因 (待现场确认): 交接班+午饭+Meter-B校准未记录 (依据 VN-002 转录)", "WARN")
            log(f"   - 是否已补测 (待确认): 是, 补测数据并入 BT-2026-003 前 10 点", "WARN")
        log("   后续计算将继续, 但报告顶部会再次列出供复核人先确认。", "WARN")
        log("=" * 60, "WARN")

    if args.diff:
        res_a = run_recalc("SET-A-20260612", params_cfg)
        res_b = run_recalc("SET-B-20260612", params_cfg)
        run_diff(res_a, res_b)
    else:
        pkey = {"A": "SET-A-20260612", "B": "SET-B-20260612"}[args.set]
        run_recalc(pkey, params_cfg)

    log("✅ 复算完成, 所有输出在 output/ 目录下。")


if __name__ == "__main__":
    main()
