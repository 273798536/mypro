import json
from datetime import datetime

from database import db_session, STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_PASSED, STATUS_FAILED


WEIGHING_PRECISION_THRESHOLD = 0.0001
SPECTRUM_OVERLAP_THRESHOLD = 0.85
TEMPERATURE_TOLERANCE = 0.5


def _describe_weighing_issue(value, unit):
    if value is None:
        return {
            "title": "称量数据缺失",
            "description": "该样品未填写作称量结果，无法判断投料量是否符合处方要求。",
            "suggestion": "请补录称样重量及单位后重新提交复核。",
        }
    if unit is None or unit.strip() == "":
        return {
            "title": "称量单位漏填",
            "description": (
                f"已记录称量数值 {value}，但未标注单位（如 mg、g）。"
                "缺少单位会导致无法判断实际投料量是否合规。"
            ),
            "suggestion": "请补填称量单位，通常为 mg（毫克）。",
        }
    unit_norm = unit.strip().lower()
    if unit_norm in ("mg", "毫克"):
        value_mg = float(value)
    elif unit_norm in ("g", "克"):
        value_mg = float(value) * 1000
    else:
        return {
            "title": "称量单位不规范",
            "description": (
                f"记录的单位为「{unit}」，不属于常用单位（mg/g），"
                "无法据此评估称量精度是否满足药典要求。"
            ),
            "suggestion": "请将称量单位统一为 mg 或 g 后复核。",
        }

    required_precision_mg = value_mg * 0.001
    candidates = [
        (100, "100 mg"),
        (10, "10 mg"),
        (1, "1 mg"),
        (0.1, "0.1 mg"),
        (0.01, "0.01 mg"),
        (0.001, "0.001 mg"),
        (0.0001, "0.0001 mg"),
    ]
    required_readable = "0.0001 mg"
    for threshold, label in candidates:
        if threshold <= required_precision_mg:
            required_readable = label
            break

    str_val = ("%g" % value).rstrip("0").rstrip(".")
    if "." in str_val:
        decimals = len(str_val.split(".")[1])
    else:
        decimals = 0
    if unit_norm in ("mg", "毫克"):
        actual_readable_mg = 1 / (10 ** decimals) if decimals > 0 else 1.0
    else:
        actual_readable_mg = 1000 / (10 ** decimals) if decimals > 0 else 1000.0
    if actual_readable_mg < 0.001:
        actual_readable = f"{actual_readable_mg:.4f} mg"
    elif actual_readable_mg < 1:
        actual_readable = f"{actual_readable_mg:.3f} mg"
    else:
        actual_readable = f"{actual_readable_mg:.1f} mg"

    return {
        "title": "称量精度不足",
        "description": (
            f"当前称样量为 {value} {unit}（约 {value_mg:.3f} mg）。"
            f"按照中国药典「精密称定」的要求，称量结果应准确至所取重量的千分之一，"
            f"即天平至少需可读至 {required_readable}。"
            f"但根据当前记录的小数位数，实际只能读到 {actual_readable}，低于要求。"
            "精度不足会直接影响溶出度计算结果的可信度。"
        ),
        "suggestion": f"请使用可读精度不低于 {required_readable} 的天平重新称量，或在备注中说明已采取的减量法等称量过程。",
    }


def _check_weighing_precision(weighing_value, weighing_unit):
    if weighing_value is None:
        return False, _describe_weighing_issue(None, None)
    if weighing_unit is None or str(weighing_unit).strip() == "":
        return False, _describe_weighing_issue(weighing_value, "")
    unit_norm = str(weighing_unit).strip().lower()
    value = float(weighing_value)
    if unit_norm in ("mg", "毫克"):
        value_mg = value
    elif unit_norm in ("g", "克"):
        value_mg = value * 1000
    else:
        return False, _describe_weighing_issue(value, weighing_unit)

    required_mg = value_mg * 0.001

    str_val = ("%g" % value).rstrip("0").rstrip(".")
    if "." in str_val:
        decimals = len(str_val.split(".")[1])
    else:
        decimals = 0

    if unit_norm in ("mg", "毫克"):
        smallest_readable_mg = 1 / (10 ** decimals) if decimals > 0 else 1.0
    else:
        smallest_readable_mg = 1000 / (10 ** decimals) if decimals > 0 else 1000.0

    if smallest_readable_mg > required_mg and smallest_readable_mg > required_mg * 1.01:
        return False, _describe_weighing_issue(value, weighing_unit)
    return True, None


def _check_spectrum_overlap(spectrum_data, time_points, dissolution_data):
    findings = []
    if not spectrum_data:
        return findings
    try:
        spectra = json.loads(spectrum_data) if isinstance(spectrum_data, str) else spectrum_data
    except Exception:
        findings.append({
            "finding_type": "spectrum",
            "severity": "warning",
            "title": "谱图数据格式异常",
            "description": "导入的紫外/液相谱图数据无法解析，无法执行谱峰重叠度自动判定。",
            "suggestion": "请人工核对谱图文件后在复核意见中记录结论。",
            "field_ref": "spectrum_data",
        })
        return findings
    if not isinstance(spectra, list) or len(spectra) == 0:
        return findings

    main_peaks_rt = []
    for idx, spec in enumerate(spectra):
        tp_raw = time_points[idx] if (time_points and idx < len(time_points)) else None
        if tp_raw is not None:
            tp_label = f"第{tp_raw} min"
        else:
            tp_label = f"第{idx + 1}个时间点"
        peaks = spec.get("peaks", [])
        if not peaks:
            continue

        main_peak = max(peaks, key=lambda p: float(p.get("area", 0)))
        main_rt = float(main_peak.get("retention_time", 0))
        if main_rt > 0:
            main_peaks_rt.append((tp_label, main_rt, float(main_peak.get("area", 0))))

        if len(peaks) >= 2:
            sorted_peaks = sorted(peaks, key=lambda p: float(p.get("retention_time", 0)))
            for pi in range(len(sorted_peaks) - 1):
                p_left = sorted_peaks[pi]
                p_right = sorted_peaks[pi + 1]
                rt_l = float(p_left.get("retention_time", 0))
                rt_r = float(p_right.get("retention_time", 0))
                area_l = float(p_left.get("area", 0))
                area_r = float(p_right.get("area", 0))
                if rt_l <= 0 or rt_r <= 0:
                    continue
                distance = rt_r - rt_l
                avg_rt = (rt_l + rt_r) / 2
                resolution = 2 * distance / (avg_rt * 0.05) if avg_rt > 0 else 999
                actual_rsd = distance / avg_rt if avg_rt > 0 else 0
                if actual_rsd < 0.01:
                    overlap_ratio = min(area_l, area_r) / max(area_l, area_r) if max(area_l, area_r) > 0 else 0
                    findings.append({
                        "finding_type": "spectrum_overlap",
                        "severity": "error",
                        "title": "同一时间点内谱峰严重重叠",
                        "description": (
                            f"{tp_label}的色谱图中，保留时间 {rt_l:.2f} min（峰面积 {area_l:.0f}）与"
                            f"{rt_r:.2f} min（峰面积 {area_r:.0f}）两峰相邻，"
                            f"相对保留差仅 {actual_rsd * 100:.1f}%，"
                            f"峰面积重叠比例约 {overlap_ratio * 100:.0f}%。"
                            "相邻峰无法准确积分各自含量，会直接影响该时间点溶出度的计算结果。"
                        ),
                        "suggestion": "建议优化色谱条件（延长运行时间、调整流动相比例或更换色谱柱）以改善分离度后重新测定。",
                        "field_ref": "spectrum_data",
                        "raw_value": f"tp={tp_label}, RT1={rt_l}, RT2={rt_r}, overlap={overlap_ratio:.2f}",
                    })
                elif actual_rsd < 0.025 and area_l > 0 and area_r > 0:
                    findings.append({
                        "finding_type": "spectrum_overlap",
                        "severity": "warning",
                        "title": "同一时间点内谱峰部分重叠",
                        "description": (
                            f"{tp_label}的色谱图中，保留时间 {rt_l:.2f} min 与 {rt_r:.2f} min 两处峰位置接近，"
                            "存在部分重叠风险，需人工确认积分是否准确。"
                        ),
                        "suggestion": "请人工核对峰纯度与积分参数，必要时采用二极管阵列检测或质谱确认。",
                        "field_ref": "spectrum_data",
                    })

    if len(main_peaks_rt) >= 3:
        rts = [rt for _, rt, _ in main_peaks_rt]
        mean_rt = sum(rts) / len(rts)
        if mean_rt > 0:
            max_diff = max(abs(rt - mean_rt) for rt in rts)
            rsd = max_diff / mean_rt
            if rsd > 0.02:
                worst_tp, worst_rt, _ = max(main_peaks_rt, key=lambda x: abs(x[1] - mean_rt))
                findings.append({
                    "finding_type": "spectrum_drift",
                    "severity": "warning",
                    "title": "主成分峰保留时间漂移过大",
                    "description": (
                        f"各时间点主成分峰平均保留时间为 {mean_rt:.2f} min，"
                        f"但 {worst_tp} 的主成分峰出现在 {worst_rt:.2f} min，"
                        f"相对偏差约 {rsd * 100:.1f}%，超过 2% 的允许范围。"
                        "保留时间漂移提示色谱系统不稳定，可能影响峰识别准确性。"
                    ),
                    "suggestion": "请检查色谱柱状态、流动相配制及系统适用性，确认柱压与柱温稳定后重新进样。",
                    "field_ref": "spectrum_data",
                    "raw_value": f"mean_rt={mean_rt:.2f}, worst_rt={worst_rt:.2f}, rsd={rsd:.3f}",
                })
    return findings


def _check_temperature_curve(sample_id, expected_temp):
    findings = []
    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT time_min, temperature_c, is_anomaly, anomaly_note FROM temperature_curves WHERE sample_id = ? ORDER BY time_min",
            (sample_id,),
        )
        rows = c.fetchall()
    if not rows:
        findings.append({
            "finding_type": "temperature",
            "severity": "warning",
            "title": "温度曲线缺失",
            "description": "未找到该样品对应的温度监控记录，无法确认溶出过程温度是否恒定。",
            "suggestion": "请补录各时间点的溶出杯温度数据。",
            "field_ref": "temperature_curves",
        })
        return findings
    expected = float(expected_temp) if expected_temp else 37.0
    anomalies = []
    for row in rows:
        t = row["time_min"]
        temp = row["temperature_c"]
        diff = abs(temp - expected)
        if diff > TEMPERATURE_TOLERANCE:
            anomalies.append((t, temp, diff))
    if anomalies:
        worst = max(anomalies, key=lambda x: x[2])
        findings.append({
            "finding_type": "temperature",
            "severity": "error",
            "title": "溶出温度超出允许范围",
            "description": (
                f"设定温度为 {expected:.1f} ℃，但在第 {worst[0]:.0f} min 时测得温度为 {worst[1]:.1f} ℃，"
                f"偏差 {worst[2]:.1f} ℃，超过 ±{TEMPERATURE_TOLERANCE} ℃ 的允许范围。"
                f"共发现 {len(anomalies)} 个异常温度点。温度波动会显著影响药物溶出速率。"
            ),
            "suggestion": "请检查溶出仪水浴循环和温度探头校准，确认温控系统正常后重新实验。",
            "field_ref": "temperature_curves",
            "raw_value": f"expected={expected}, worst={worst[1]}@{worst[0]}min",
        })
    return findings


def _check_missing_fields(sample):
    findings = []
    required = [
        ("product_name", "样品名称"),
        ("batch_number", "生产批号"),
        ("test_date", "试验日期"),
        ("analyst", "试验人员"),
        ("medium", "溶出介质"),
        ("temperature", "设定温度"),
        ("rotation_speed", "转速"),
    ]
    missing = []
    for field, label in required:
        val = sample[field]
        if val is None or (isinstance(val, str) and val.strip() == ""):
            missing.append(label)
    if missing:
        findings.append({
            "finding_type": "missing_field",
            "severity": "warning",
            "title": "基础信息不完整",
            "description": "以下必填项未填写：" + "、".join(missing) + "。这些信息是报告归档和追溯的必要字段。",
            "suggestion": "请在系统中补全上述字段后再提交复核。",
            "field_ref": ",".join(f for f, _ in required if sample.get(f) in (None, "")),
        })
    if sample.get("fill_remark"):
        findings.append({
            "finding_type": "remark",
            "severity": "info",
            "title": "含补录备注",
            "description": "该条记录包含补录说明：" + sample["fill_remark"] + "。请复核人员确认补录内容的真实性与合规性。",
            "suggestion": "请核对原始记录后在复核意见中签字确认。",
            "field_ref": "fill_remark",
        })
    if sample.get("old_format"):
        findings.append({
            "finding_type": "format",
            "severity": "info",
            "title": "来源于旧版记录表",
            "description": "本条数据从旧版 Excel 模板导入，字段映射可能与现行规范存在差异，请留意字段含义是否一致。",
            "suggestion": "请与原始记录逐一核对关键字段。",
            "field_ref": "old_format",
        })
    return findings


def run_sample_review(sample_id):
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM dissolution_samples WHERE id = ?", (sample_id,))
        sample = dict(c.fetchone())

    all_findings = []

    ok, issue = _check_weighing_precision(sample.get("weighing_value"), sample.get("weighing_unit"))
    if not ok and issue:
        all_findings.append({
            "finding_type": "weighing_precision",
            "severity": "error",
            "title": issue["title"],
            "description": issue["description"],
            "suggestion": issue["suggestion"],
            "field_ref": "weighing_value,weighing_unit",
            "raw_value": f"value={sample.get('weighing_value')}, unit={sample.get('weighing_unit')}",
        })

    def _parse_json(v):
        if v is None:
            return None
        if isinstance(v, (list, dict)):
            return v
        try:
            return json.loads(v)
        except Exception:
            return None

    all_findings.extend(_check_spectrum_overlap(
        _parse_json(sample.get("spectrum_data")),
        _parse_json(sample.get("time_points")),
        _parse_json(sample.get("dissolution_data")),
    ))

    all_findings.extend(_check_temperature_curve(sample_id, sample.get("temperature")))

    all_findings.extend(_check_missing_fields(sample))

    now = datetime.now().isoformat(timespec="seconds")
    with db_session() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM review_findings WHERE sample_id = ?", (sample_id,))
        for f in all_findings:
            c.execute(
                """INSERT INTO review_findings
                   (sample_id, finding_type, severity, title, description, field_ref, raw_value, suggestion, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (sample_id, f["finding_type"], f.get("severity", "warning"), f["title"],
                 f["description"], f.get("field_ref"), f.get("raw_value"), f.get("suggestion"), now),
            )
        has_error = any(f["severity"] == "error" for f in all_findings)
        new_status = STATUS_FAILED if has_error else (STATUS_IN_PROGRESS if all_findings else STATUS_PASSED)
        c.execute(
            "UPDATE dissolution_samples SET review_status = ?, reviewed_at = ? WHERE id = ?",
            (new_status, now, sample_id),
        )
    return all_findings, new_status


def run_batch_review(batch_id):
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT id FROM dissolution_samples WHERE batch_id = ?", (batch_id,))
        sample_ids = [row["id"] for row in c.fetchall()]
    results = []
    for sid in sample_ids:
        findings, status = run_sample_review(sid)
        results.append({"sample_id": sid, "status": status, "findings_count": len(findings)})
    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT review_status, COUNT(*) as cnt FROM dissolution_samples WHERE batch_id = ? GROUP BY review_status",
            (batch_id,),
        )
        stats = {row["review_status"]: row["cnt"] for row in c.fetchall()}
    if stats.get(STATUS_FAILED, 0) > 0:
        overall = STATUS_FAILED
    elif stats.get(STATUS_PENDING, 0) + stats.get(STATUS_IN_PROGRESS, 0) > 0:
        overall = STATUS_IN_PROGRESS
    else:
        overall = STATUS_PASSED
    with db_session() as conn:
        c = conn.cursor()
        c.execute("UPDATE dissolution_batches SET overall_status = ? WHERE id = ?", (overall, batch_id))
    return {"batch_id": batch_id, "overall_status": overall, "samples": results}
