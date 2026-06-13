from __future__ import annotations

from statistics import stdev
from typing import Any

from .types import AnomalyRecord, LogEntry, LogKind, ReplayParam


class AnomalyDetector:
    def __init__(self, cfg: dict[str, Any], thresholds_cfg: dict[str, Any]):
        self.cfg = cfg or {}
        self.thresholds = dict(thresholds_cfg)
        self.detect_tamper = bool(self.cfg.get("detect_threshold_tamper", True))
        self.isolate_bad = bool(self.cfg.get("isolate_bad_data", True))
        self.min_valid = int(self.cfg.get("min_consecutive_valid", 3))

    SAFETY_PARAMS = {
        "SAFETY_THRESHOLD_VELOCITY",
        "SAFETY_THRESHOLD_PRESSURE",
    }

    def analyze(self, entries: list[LogEntry]) -> list[AnomalyRecord]:
        anomalies: list[AnomalyRecord] = []
        anomalies.extend(self._check_version_mix(entries))
        anomalies.extend(self._check_withdraw_consistency(entries))
        anomalies.extend(self._check_safety_tamper(entries))
        anomalies.extend(self._check_outlier_params(entries))
        return anomalies

    def _check_version_mix(self, entries: list[LogEntry]) -> list[AnomalyRecord]:
        res = []
        data_lines = [e for e in entries if e.kind == LogKind.DATA]
        old_count = sum(1 for e in data_lines if e.version == "old")
        new_count = sum(1 for e in data_lines if e.version == "new")
        unmarked = sum(1 for e in data_lines if e.version == "unmarked")
        if old_count and new_count:
            res.append(AnomalyRecord(
                level="warning",
                category="version_mix",
                param_name=None,
                message="数据中同时存在旧版(V1)与新版(V2)日志，以最后出现的新版为准，旧版仅作参考",
                evidence={"old": old_count, "new": new_count, "unmarked": unmarked},
                impact="若新旧版参数含义不同，可能导致参数基线计算偏差",
            ))
        if old_count and not new_count:
            res.append(AnomalyRecord(
                level="warning",
                category="version_all_old",
                param_name=None,
                message="全部数据均为旧版(V1)格式，建议使用新版(V2)重采",
                evidence={"old": old_count},
                impact="部分新参数在旧版中不采集，结论可能缺项",
            ))
        return res

    def _check_withdraw_consistency(self, entries: list[LogEntry]) -> list[AnomalyRecord]:
        res = []
        withdraws = [e for e in entries if e.kind == LogKind.WITHDRAW]
        line_set = {e.line_no for e in entries}
        for w in withdraws:
            target = w.withdraw_target_line
            if target is None:
                res.append(AnomalyRecord(
                    level="warning",
                    category="withdraw_no_target",
                    param_name=None,
                    message=f"撤回记录未指定目标行号（第 {w.line_no} 行）",
                    evidence={"line_no": w.line_no, "raw": w.raw},
                    source_line=w.line_no,
                    impact="该撤回无法生效，请补录撤回目标行号",
                ))
                continue
            if target not in line_set:
                res.append(AnomalyRecord(
                    level="warning",
                    category="withdraw_target_missing",
                    param_name=None,
                    message=f"第 {w.line_no} 行撤回的目标行 {target} 不存在于日志中",
                    evidence={"line_no": w.line_no, "target": target},
                    source_line=w.line_no,
                    impact="撤回记录无效，需检查目标行号是否被误删",
                ))
        return res

    def _check_safety_tamper(self, entries: list[LogEntry]) -> list[AnomalyRecord]:
        if not self.detect_tamper:
            return []
        res = []
        by_param: dict[str, list[tuple[int, float]]] = {p: [] for p in self.SAFETY_PARAMS}
        for e in entries:
            if e.kind != LogKind.DATA:
                continue
            for p in self.SAFETY_PARAMS:
                if p in e.params:
                    by_param[p].append((e.line_no, e.params[p]))
        for p, seq in by_param.items():
            baseline = self.thresholds.get(p)
            if baseline is None or not seq:
                continue
            for ln, val in seq:
                delta_pct = abs(val - baseline) / baseline * 100 if baseline else 0.0
                if delta_pct > 1e-6:
                    res.append(AnomalyRecord(
                        level="error",
                        category="safety_threshold_tamper",
                        param_name=p,
                        message=f"{p} 与配置基线 {baseline} 不一致，当前为 {val}（偏离 {delta_pct:.2f}%），疑似被篡改",
                        evidence={"expected": baseline, "actual": val, "delta_pct": round(delta_pct, 4)},
                        source_line=ln,
                        impact="安全阈值被修改会直接影响结论判定，必须由权限人确认",
                    ))
        return res

    def _check_outlier_params(self, entries: list[LogEntry]) -> list[AnomalyRecord]:
        res = []
        by_param: dict[str, list[tuple[int, float, str]]] = {}
        for e in entries:
            if e.kind != LogKind.DATA:
                continue
            for name, val in e.params.items():
                by_param.setdefault(name, []).append((e.line_no, val, e.version or "unmarked"))
        for name, seq in by_param.items():
            if len(seq) < 5:
                continue
            values = sorted([s[1] for s in seq])
            n = len(values)
            q1 = values[n // 4]
            q3 = values[(3 * n) // 4]
            iqr = q3 - q1
            if iqr < 1e-9:
                try:
                    mu = sum(values) / len(values)
                    sigma = stdev(values)
                except Exception:
                    continue
                if sigma < 1e-9:
                    continue
                for ln, val, ver in seq:
                    z = (val - mu) / sigma
                    if abs(z) >= 2.5:
                        res.append(AnomalyRecord(
                            level="warning",
                            category="param_outlier",
                            param_name=name,
                            message=f"{name}={val} 为异常点（Z-score={z:.2f}，采用 2.5σ 判定），需确认是否为坏数据",
                            evidence={"value": val, "z_score": round(z, 3), "mean": round(mu, 4),
                                      "std": round(sigma, 4), "version": ver, "method": "zscore"},
                            source_line=ln,
                            impact="若为坏数据，会拉偏参数基线，建议使用撤回记录排除该行",
                        ))
                continue
            lo = q1 - 1.5 * iqr
            hi = q3 + 1.5 * iqr
            for ln, val, ver in seq:
                if val < lo or val > hi:
                    direction = "偏高" if val > hi else "偏低"
                    res.append(AnomalyRecord(
                        level="warning",
                        category="param_outlier",
                        param_name=name,
                        message=f"{name}={val} 为离群点（IQR 箱线法 {direction}，正常区间 [{lo:.2f}, {hi:.2f}]，Q1={q1}, Q3={q3}），需确认是否为坏数据",
                        evidence={"value": val, "q1": q1, "q3": q3, "iqr": round(iqr, 4),
                                  "lower": round(lo, 4), "upper": round(hi, 4),
                                  "version": ver, "method": "iqr"},
                        source_line=ln,
                        impact="若为坏数据，会拉偏参数基线，建议使用撤回记录排除该行",
                    ))
        return res
