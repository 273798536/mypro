#!/usr/bin/env python3
"""
贝叶斯先验批量验算工具
- 批量验算贝叶斯先验分布参数，记录每步中间过程
- 追踪参数变更历史（谁改的、为什么改、影响什么）
- 两组参数逐项对照比较
- 已处理/待补证据状态管理
- 生成可沟通的Markdown报告
"""

import json
import math
import hashlib
import os
import sys
import argparse
import copy
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional, Any


HISTORY_DIR = ".bayesian_history"


@dataclass
class CalcStep:
    step_no: int
    description: str
    expression: str
    input_values: dict
    result: Any
    unit_before: Optional[str] = None
    unit_after: Optional[str] = None
    note: Optional[str] = None


@dataclass
class ChangeRecord:
    timestamp: str
    field_name: str
    old_value: Any
    new_value: Any
    source_line: str
    operator: str
    reason: str
    impact_scope: str


@dataclass
class PriorItem:
    name: str
    distribution: str
    params: dict
    unit: str = ""
    source: str = ""
    source_line: str = ""
    status: str = "needs_evidence"
    notes: list = field(default_factory=list)
    evidence: str = ""
    screenshots: list = field(default_factory=list)
    change_history: list = field(default_factory=list)
    calc_steps: list = field(default_factory=list)
    summary_stats: dict = field(default_factory=dict)
    _original_params: Optional[dict] = None

    def __post_init__(self):
        if self._original_params is None:
            self._original_params = copy.deepcopy(self.params)


@dataclass
class BatchRun:
    run_id: str
    timestamp: str
    operator: str
    parameter_set_name: str
    items: list = field(default_factory=list)
    run_notes: list = field(default_factory=list)
    meta: dict = field(default_factory=dict)


def _now_iso():
    return datetime.now().isoformat(timespec="seconds")


def _short_hash(s: str):
    return hashlib.md5(s.encode()).hexdigest()[:8]


def _safe_float(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


class BayesianEngine:

    @staticmethod
    def verify_beta(item: PriorItem) -> list:
        steps = []
        a = _safe_float(item.params.get("alpha"))
        b = _safe_float(item.params.get("beta"))
        n = 1

        steps.append(CalcStep(
            step_no=n, description="读取先验参数",
            expression="alpha, beta",
            input_values={"alpha": a, "beta": b},
            result={"alpha": a, "beta": b},
            note="确认参数非负"
        ))
        n += 1

        valid = a > 0 and b > 0
        steps.append(CalcStep(
            step_no=n, description="参数合法性检验",
            expression="alpha > 0 AND beta > 0",
            input_values={"alpha": a, "beta": b},
            result=valid,
            note="Beta分布要求 alpha > 0, beta > 0"
        ))
        n += 1

        if not valid:
            steps.append(CalcStep(
                step_no=n, description="验算终止",
                expression="—",
                input_values={},
                result="INVALID_PARAMS",
                note="参数不合法，无法继续计算"
            ))
            return steps

        total = a + b
        mean = a / total
        var = (a * b) / (total ** 2 * (total + 1))

        steps.append(CalcStep(
            step_no=n, description="计算先验均值",
            expression="mean = alpha / (alpha + beta)",
            input_values={"alpha": a, "beta": b, "alpha+beta": total},
            result=mean,
            unit_after=item.unit or "概率"
        ))
        n += 1

        steps.append(CalcStep(
            step_no=n, description="计算先验方差",
            expression="var = alpha*beta / ((alpha+beta)^2 * (alpha+beta+1))",
            input_values={"alpha": a, "beta": b, "alpha+beta": total, "alpha+beta+1": total + 1},
            result=var,
            unit_after=item.unit + "²" if item.unit else "概率²"
        ))
        n += 1

        std = math.sqrt(var)
        steps.append(CalcStep(
            step_no=n, description="计算先验标准差",
            expression="std = sqrt(var)",
            input_values={"var": var},
            result=std,
            unit_after=item.unit or "概率"
        ))
        n += 1

        if a > 1 and b > 1:
            mode = (a - 1) / (total - 2)
            steps.append(CalcStep(
                step_no=n, description="计算先验众数（α>1, β>1时存在）",
                expression="mode = (alpha-1) / (alpha+beta-2)",
                input_values={"alpha-1": a - 1, "alpha+beta-2": total - 2},
                result=mode,
                unit_after=item.unit or "概率"
            ))
            n += 1
        else:
            mode = None
            steps.append(CalcStep(
                step_no=n, description="众数不存在（需要 alpha>1 且 beta>1）",
                expression="—",
                input_values={"alpha": a, "beta": b},
                result=None,
                note="先验在边界处取极值"
            ))
            n += 1

        concentration = total
        steps.append(CalcStep(
            step_no=n, description="计算先验浓度（等效样本量）",
            expression="concentration = alpha + beta",
            input_values={"alpha": a, "beta": b},
            result=concentration,
            note="浓度越大先验越强，等效于更多历史观测"
        ))
        n += 1

        if concentration < 2:
            prior_type = "无信息先验"
        elif concentration < 10:
            prior_type = "弱信息先验"
        else:
            prior_type = "信息先验"

        steps.append(CalcStep(
            step_no=n, description="判断先验信息量",
            expression="concentration < 2 → 无信息; < 10 → 弱信息; else → 信息先验",
            input_values={"concentration": concentration},
            result=prior_type,
            note=f"浓度={concentration:.2f}"
        ))
        n += 1

        try:
            import scipy.stats as st
            lo, hi = st.beta.ppf([0.025, 0.975], a, b)
            steps.append(CalcStep(
                step_no=n, description="计算95%可信区间（scipy精确计算）",
                expression="Beta.ppf([0.025, 0.975], alpha, beta)",
                input_values={"alpha": a, "beta": b},
                result={"2.5%": lo, "97.5%": hi},
                unit_after=item.unit or "概率"
            ))
            n += 1
            ci = (lo, hi)
        except ImportError:
            approx_lo = max(0, mean - 1.96 * std)
            approx_hi = min(1, mean + 1.96 * std)
            steps.append(CalcStep(
                step_no=n, description="计算95%可信区间（正态近似，未安装scipy）",
                expression="mean ± 1.96 * std",
                input_values={"mean": mean, "std": std},
                result={"2.5% (近似)": approx_lo, "97.5% (近似)": approx_hi},
                unit_after=item.unit or "概率",
                note="近似值，边界截断至[0,1]；安装scipy可得精确值"
            ))
            n += 1
            ci = (approx_lo, approx_hi)

        mean_conc_a = mean * concentration
        mean_conc_b = (1 - mean) * concentration
        steps.append(CalcStep(
            step_no=n, description="参数化转换：均值-浓度 → (α, β)",
            expression="alpha = mean * concentration; beta = (1-mean) * concentration",
            input_values={"mean": mean, "concentration": concentration},
            result={"alpha": mean_conc_a, "beta": mean_conc_b},
            unit_before="均值+浓度", unit_after="alpha+beta",
            note="另一种参数化方式，便于先验 elicitation"
        ))
        n += 1

        item.summary_stats = {
            "mean": mean, "variance": var, "std": std,
            "mode": mode, "concentration": concentration,
            "prior_type": prior_type, "ci_95": list(ci)
        }

        return steps

    @staticmethod
    def verify_normal(item: PriorItem) -> list:
        steps = []
        mu = _safe_float(item.params.get("mu"))
        sigma = _safe_float(item.params.get("sigma"))
        n = 1

        steps.append(CalcStep(
            step_no=n, description="读取先验参数",
            expression="mu, sigma",
            input_values={"mu": mu, "sigma": sigma},
            result={"mu": mu, "sigma": sigma}
        ))
        n += 1

        valid = sigma > 0
        steps.append(CalcStep(
            step_no=n, description="参数合法性检验",
            expression="sigma > 0",
            input_values={"sigma": sigma},
            result=valid,
            note="正态分布要求 sigma > 0"
        ))
        n += 1

        if not valid:
            steps.append(CalcStep(
                step_no=n, description="验算终止",
                expression="—",
                input_values={},
                result="INVALID_PARAMS"
            ))
            return steps

        var = sigma ** 2
        steps.append(CalcStep(
            step_no=n, description="计算方差",
            expression="var = sigma^2",
            input_values={"sigma": sigma},
            result=var,
            unit_after=(item.unit + "²") if item.unit else ""
        ))
        n += 1

        ci_lo = mu - 1.96 * sigma
        ci_hi = mu + 1.96 * sigma
        steps.append(CalcStep(
            step_no=n, description="计算95%可信区间",
            expression="mu ± 1.96 * sigma",
            input_values={"mu": mu, "sigma": sigma},
            result={"2.5%": ci_lo, "97.5%": ci_hi},
            unit_after=item.unit
        ))
        n += 1

        precision = 1.0 / var
        steps.append(CalcStep(
            step_no=n, description="计算精度（方差的倒数）",
            expression="precision = 1 / sigma^2",
            input_values={"sigma": sigma, "var": var},
            result=precision,
            unit_after=(item.unit + "^(-2)") if item.unit else "",
            note="精度参数化在贝叶斯推断中常用"
        ))
        n += 1

        prior_type = "弱信息先验" if sigma > 10 * abs(mu) else ("信息先验" if sigma < abs(mu) else "中等信息先验")
        steps.append(CalcStep(
            step_no=n, description="判断先验信息量",
            expression="sigma vs |mu| 的相对大小",
            input_values={"sigma": sigma, "|mu|": abs(mu)},
            result=prior_type
        ))
        n += 1

        sigma_sq_from_var = _safe_float(item.params.get("sigma_sq"))
        if sigma_sq_from_var > 0:
            converted_sigma = math.sqrt(sigma_sq_from_var)
            steps.append(CalcStep(
                step_no=n, description="单位换算：sigma² → sigma",
                expression="sigma = sqrt(sigma_sq)",
                input_values={"sigma_sq": sigma_sq_from_var},
                result=converted_sigma,
                unit_before="方差", unit_after="标准差",
                note="从方差参数化转换到标准差参数化"
            ))
            n += 1

        item.summary_stats = {
            "mean": mu, "variance": var, "std": sigma,
            "precision": precision, "prior_type": prior_type,
            "ci_95": [ci_lo, ci_hi]
        }

        return steps

    @staticmethod
    def verify_gamma(item: PriorItem) -> list:
        steps = []
        shape = _safe_float(item.params.get("shape"))
        rate = _safe_float(item.params.get("rate"))
        scale = _safe_float(item.params.get("scale"))
        n = 1

        if rate <= 0 and scale > 0:
            rate = 1.0 / scale
            steps.append(CalcStep(
                step_no=n, description="参数化转换：scale → rate",
                expression="rate = 1 / scale",
                input_values={"scale": scale},
                result=rate,
                unit_before="尺度", unit_after="率",
                note="Gamma分布两种参数化：shape-rate 和 shape-scale"
            ))
            n += 1
        elif rate <= 0:
            rate = 1.0

        steps.append(CalcStep(
            step_no=n, description="读取先验参数",
            expression="shape, rate",
            input_values={"shape": shape, "rate": rate},
            result={"shape": shape, "rate": rate}
        ))
        n += 1

        valid = shape > 0 and rate > 0
        steps.append(CalcStep(
            step_no=n, description="参数合法性检验",
            expression="shape > 0 AND rate > 0",
            input_values={"shape": shape, "rate": rate},
            result=valid
        ))
        n += 1

        if not valid:
            steps.append(CalcStep(
                step_no=n, description="验算终止",
                expression="—",
                input_values={},
                result="INVALID_PARAMS"
            ))
            return steps

        mean = shape / rate
        var = shape / (rate ** 2)
        std = math.sqrt(var)

        steps.append(CalcStep(
            step_no=n, description="计算先验均值",
            expression="mean = shape / rate",
            input_values={"shape": shape, "rate": rate},
            result=mean,
            unit_after=item.unit
        ))
        n += 1

        steps.append(CalcStep(
            step_no=n, description="计算先验方差",
            expression="var = shape / rate^2",
            input_values={"shape": shape, "rate": rate},
            result=var,
            unit_after=(item.unit + "²") if item.unit else ""
        ))
        n += 1

        if shape >= 1:
            mode = (shape - 1) / rate
            steps.append(CalcStep(
                step_no=n, description="计算先验众数（shape≥1时存在）",
                expression="mode = (shape-1) / rate",
                input_values={"shape-1": shape - 1, "rate": rate},
                result=mode,
                unit_after=item.unit
            ))
        else:
            mode = 0.0
            steps.append(CalcStep(
                step_no=n, description="众数在0处（shape<1时）",
                expression="mode = 0",
                input_values={"shape": shape},
                result=0.0,
                unit_after=item.unit
            ))
        n += 1

        cv = std / mean if mean != 0 else float('inf')
        steps.append(CalcStep(
            step_no=n, description="计算变异系数",
            expression="CV = std / mean",
            input_values={"std": std, "mean": mean},
            result=cv,
            note=f"CV={cv:.4f}；CV越小先验越集中"
        ))
        n += 1

        item.summary_stats = {
            "mean": mean, "variance": var, "std": std,
            "mode": mode, "cv": cv, "shape": shape, "rate": rate
        }

        return steps

    @staticmethod
    def verify_lognormal(item: PriorItem) -> list:
        steps = []
        mu = _safe_float(item.params.get("mu_log"))
        sigma = _safe_float(item.params.get("sigma_log"))
        n = 1

        steps.append(CalcStep(
            step_no=n, description="读取先验参数（对数尺度）",
            expression="mu_log, sigma_log",
            input_values={"mu_log": mu, "sigma_log": sigma},
            result={"mu_log": mu, "sigma_log": sigma}
        ))
        n += 1

        valid = sigma > 0
        steps.append(CalcStep(
            step_no=n, description="参数合法性检验",
            expression="sigma_log > 0",
            input_values={"sigma_log": sigma},
            result=valid
        ))
        n += 1

        if not valid:
            steps.append(CalcStep(
                step_no=n, description="验算终止",
                expression="—",
                input_values={},
                result="INVALID_PARAMS"
            ))
            return steps

        mean_natural = math.exp(mu + sigma ** 2 / 2)
        steps.append(CalcStep(
            step_no=n, description="计算自然尺度均值",
            expression="mean = exp(mu + sigma^2/2)",
            input_values={"mu": mu, "sigma": sigma, "sigma^2/2": sigma**2/2},
            result=mean_natural,
            unit_after=item.unit,
            note="对数正态分布的均值不等于exp(mu)"
        ))
        n += 1

        var_natural = (math.exp(sigma ** 2) - 1) * math.exp(2 * mu + sigma ** 2)
        std_natural = math.sqrt(var_natural)
        steps.append(CalcStep(
            step_no=n, description="计算自然尺度标准差",
            expression="std = sqrt((exp(sigma^2)-1) * exp(2*mu+sigma^2))",
            input_values={"mu": mu, "sigma": sigma},
            result=std_natural,
            unit_after=item.unit
        ))
        n += 1

        median = math.exp(mu)
        steps.append(CalcStep(
            step_no=n, description="计算中位数",
            expression="median = exp(mu)",
            input_values={"mu": mu},
            result=median,
            unit_after=item.unit,
            note="对数正态的中位数=exp(mu)，均值>中位数（右偏）"
        ))
        n += 1

        item.summary_stats = {
            "mean": mean_natural, "variance": var_natural, "std": std_natural,
            "median": median, "mu_log": mu, "sigma_log": sigma
        }

        return steps

    @staticmethod
    def verify_dirichlet(item: PriorItem) -> list:
        steps = []
        alphas = item.params.get("alphas", [])
        alpha_sum = sum(_safe_float(a) for a in alphas)
        n = 1

        steps.append(CalcStep(
            step_no=n, description="读取Dirichlet先验参数",
            expression="alphas, sum(alphas)",
            input_values={"alphas": alphas, "sum": alpha_sum},
            result={"alphas": alphas, "concentration": alpha_sum}
        ))
        n += 1

        valid = all(_safe_float(a) > 0 for a in alphas) and alpha_sum > 0
        steps.append(CalcStep(
            step_no=n, description="参数合法性检验",
            expression="all(alpha_i > 0) AND sum > 0",
            input_values={"alphas": alphas},
            result=valid
        ))
        n += 1

        if not valid:
            steps.append(CalcStep(
                step_no=n, description="验算终止",
                expression="—",
                input_values={},
                result="INVALID_PARAMS"
            ))
            return steps

        means = [_safe_float(a) / alpha_sum for a in alphas]
        variances = [_safe_float(a) * (alpha_sum - _safe_float(a)) / (alpha_sum ** 2 * (alpha_sum + 1)) for a in alphas]

        steps.append(CalcStep(
            step_no=n, description="计算各分量先验均值",
            expression="mean_i = alpha_i / sum(alphas)",
            input_values={"alphas": alphas, "sum": alpha_sum},
            result={"means": means}
        ))
        n += 1

        steps.append(CalcStep(
            step_no=n, description="计算各分量先验方差",
            expression="var_i = alpha_i*(S-alpha_i) / (S^2*(S+1))",
            input_values={"alphas": alphas, "S": alpha_sum},
            result={"variances": variances}
        ))
        n += 1

        item.summary_stats = {
            "means": means, "variances": variances,
            "concentration": alpha_sum, "k": len(alphas)
        }

        return steps

    @staticmethod
    def verify(item: PriorItem) -> PriorItem:
        dist = item.distribution.lower().strip()
        engines = {
            "beta": BayesianEngine.verify_beta,
            "normal": BayesianEngine.verify_normal,
            "gamma": BayesianEngine.verify_gamma,
            "lognormal": BayesianEngine.verify_lognormal,
            "dirichlet": BayesianEngine.verify_dirichlet,
        }
        handler = engines.get(dist)
        if handler is None:
            item.calc_steps = [CalcStep(
                step_no=1, description=f"不支持的分布类型: {item.distribution}",
                expression="—", input_values={},
                result="UNSUPPORTED_DISTRIBUTION",
                note=f"支持: {', '.join(engines.keys())}"
            )]
            item.summary_stats = {"error": f"Unsupported distribution: {item.distribution}"}
        else:
            item.calc_steps = handler(item)
        return item


class HistoryManager:

    def __init__(self, base_dir: str = "."):
        self.base = Path(base_dir) / HISTORY_DIR
        self.base.mkdir(parents=True, exist_ok=True)

    def _run_path(self, run_id: str) -> Path:
        return self.base / f"{run_id}.json"

    def save_run(self, run: BatchRun):
        data = self._serialize_run(run)
        path = self._run_path(run.run_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_run(self, run_id: str) -> Optional[BatchRun]:
        path = self._run_path(run_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return self._deserialize_run(data)

    def list_runs(self) -> list:
        runs = []
        for p in sorted(self.base.glob("*.json")):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                runs.append({
                    "run_id": data.get("run_id", p.stem),
                    "timestamp": data.get("timestamp", ""),
                    "operator": data.get("operator", ""),
                    "parameter_set_name": data.get("parameter_set_name", ""),
                    "item_count": len(data.get("items", []))
                })
            except (json.JSONDecodeError, KeyError):
                continue
        return runs

    def add_note(self, run_id: str, item_name: str, note: str, operator: str = ""):
        run = self.load_run(run_id)
        if run is None:
            return False
        for item in run.items:
            if isinstance(item, PriorItem) and item.name == item_name:
                item.notes.append({"text": note, "timestamp": _now_iso(), "operator": operator})
                break
            elif isinstance(item, dict) and item.get("name") == item_name:
                item.setdefault("notes", []).append({"text": note, "timestamp": _now_iso(), "operator": operator})
                break
        self.save_run(run)
        return True

    def add_screenshot_ref(self, run_id: str, item_name: str, ref: str, description: str = ""):
        run = self.load_run(run_id)
        if run is None:
            return False
        for item in run.items:
            if isinstance(item, PriorItem) and item.name == item_name:
                item.screenshots.append({"ref": ref, "description": description, "timestamp": _now_iso()})
                break
            elif isinstance(item, dict) and item.get("name") == item_name:
                item.setdefault("screenshots", []).append({"ref": ref, "description": description, "timestamp": _now_iso()})
                break
        self.save_run(run)
        return True

    def record_change(self, run_id: str, item_name: str, field_name: str,
                      old_value, new_value, source_line: str = "",
                      operator: str = "", reason: str = "", impact_scope: str = ""):
        run = self.load_run(run_id)
        if run is None:
            return False
        entry = {
            "timestamp": _now_iso(), "field_name": field_name,
            "old_value": old_value, "new_value": new_value,
            "source_line": source_line, "operator": operator,
            "reason": reason, "impact_scope": impact_scope
        }
        for item in run.items:
            if isinstance(item, PriorItem) and item.name == item_name:
                item.change_history.append(entry)
                break
            elif isinstance(item, dict) and item.get("name") == item_name:
                item.setdefault("change_history", []).append(entry)
                break
        self.save_run(run)
        return True

    def _serialize_run(self, run: BatchRun) -> dict:
        items = []
        for item in run.items:
            if isinstance(item, PriorItem):
                d = {
                    "name": item.name,
                    "distribution": item.distribution,
                    "params": item.params,
                    "unit": item.unit,
                    "source": item.source,
                    "source_line": item.source_line,
                    "status": item.status,
                    "notes": item.notes,
                    "evidence": item.evidence,
                    "screenshots": item.screenshots,
                    "change_history": item.change_history,
                    "calc_steps": [
                        {
                            "step_no": s.step_no,
                            "description": s.description,
                            "expression": s.expression,
                            "input_values": s.input_values,
                            "result": s.result,
                            "unit_before": s.unit_before,
                            "unit_after": s.unit_after,
                            "note": s.note
                        } for s in item.calc_steps
                    ],
                    "summary_stats": item.summary_stats,
                    "original_params": item._original_params
                }
            else:
                d = item
            items.append(d)
        return {
            "run_id": run.run_id,
            "timestamp": run.timestamp,
            "operator": run.operator,
            "parameter_set_name": run.parameter_set_name,
            "items": items,
            "run_notes": run.run_notes,
            "meta": run.meta
        }

    def _deserialize_run(self, data: dict) -> BatchRun:
        items = []
        for item_data in data.get("items", []):
            calc_steps = []
            for s in item_data.get("calc_steps", []):
                calc_steps.append(CalcStep(
                    step_no=s.get("step_no", 0),
                    description=s.get("description", ""),
                    expression=s.get("expression", ""),
                    input_values=s.get("input_values", {}),
                    result=s.get("result"),
                    unit_before=s.get("unit_before"),
                    unit_after=s.get("unit_after"),
                    note=s.get("note")
                ))
            item = PriorItem(
                name=item_data.get("name", ""),
                distribution=item_data.get("distribution", ""),
                params=item_data.get("params", {}),
                unit=item_data.get("unit", ""),
                source=item_data.get("source", ""),
                source_line=item_data.get("source_line", ""),
                status=item_data.get("status", "needs_evidence"),
                notes=item_data.get("notes", []),
                evidence=item_data.get("evidence", ""),
                screenshots=item_data.get("screenshots", []),
                change_history=item_data.get("change_history", []),
                calc_steps=calc_steps,
                summary_stats=item_data.get("summary_stats", {})
            )
            item._original_params = item_data.get("original_params", copy.deepcopy(item.params))
            items.append(item)
        return BatchRun(
            run_id=data.get("run_id", ""),
            timestamp=data.get("timestamp", ""),
            operator=data.get("operator", ""),
            parameter_set_name=data.get("parameter_set_name", ""),
            items=items,
            run_notes=data.get("run_notes", []),
            meta=data.get("meta", {})
        )


class ParameterComparator:

    @staticmethod
    def compare(run_a: BatchRun, run_b: BatchRun) -> dict:
        items_a = {item.name: item for item in run_a.items}
        items_b = {item.name: item for item in run_b.items}
        all_names = sorted(set(items_a.keys()) | set(items_b.keys()))

        results = []
        for name in all_names:
            ia = items_a.get(name)
            ib = items_b.get(name)
            entry = {"name": name, "only_in": None, "param_diffs": [], "result_diffs": []}

            if ia is None:
                entry["only_in"] = "B"
                entry["item_b"] = _item_summary(ib)
                results.append(entry)
                continue
            if ib is None:
                entry["only_in"] = "A"
                entry["item_a"] = _item_summary(ia)
                results.append(entry)
                continue

            entry["item_a"] = _item_summary(ia)
            entry["item_b"] = _item_summary(ib)

            if ia.distribution != ib.distribution:
                entry["param_diffs"].append({
                    "field": "distribution",
                    "value_a": ia.distribution,
                    "value_b": ib.distribution,
                    "impact": "分布类型不同，所有统计量不可直接比较"
                })

            common_keys = set(ia.params.keys()) & set(ib.params.keys())
            for k in sorted(common_keys):
                va = _safe_float(ia.params.get(k), None)
                vb = _safe_float(ib.params.get(k), None)
                if va is None or vb is None:
                    if ia.params.get(k) != ib.params.get(k):
                        entry["param_diffs"].append({
                            "field": k,
                            "value_a": ia.params.get(k),
                            "value_b": ib.params.get(k),
                            "impact": "参数值不同"
                        })
                elif not math.isclose(va, vb, rel_tol=1e-9):
                    delta = vb - va
                    pct = (delta / va * 100) if va != 0 else float('inf')
                    entry["param_diffs"].append({
                        "field": k,
                        "value_a": va,
                        "value_b": vb,
                        "delta": delta,
                        "pct_change": round(pct, 2),
                        "impact": f"参数{k}变化{pct:+.2f}%，影响该先验的全部统计量"
                    })

            only_a = set(ia.params.keys()) - set(ib.params.keys())
            only_b = set(ib.params.keys()) - set(ia.params.keys())
            for k in sorted(only_a):
                entry["param_diffs"].append({"field": k, "value_a": ia.params[k], "value_b": None, "impact": f"仅A组有参数{k}"})
            for k in sorted(only_b):
                entry["param_diffs"].append({"field": k, "value_a": None, "value_b": ib.params[k], "impact": f"仅B组有参数{k}"})

            stats_a = ia.summary_stats
            stats_b = ib.summary_stats
            for stat_key in sorted(set(stats_a.keys()) & set(stats_b.keys())):
                sa = stats_a.get(stat_key)
                sb = stats_b.get(stat_key)
                if isinstance(sa, (int, float)) and isinstance(sb, (int, float)):
                    if not math.isclose(sa, sb, rel_tol=1e-9):
                        delta = sb - sa
                        entry["result_diffs"].append({
                            "stat": stat_key,
                            "value_a": sa,
                            "value_b": sb,
                            "delta": delta
                        })
                elif isinstance(sa, list) and isinstance(sb, list):
                    for i, (va, vb) in enumerate(zip(sa, sb)):
                        if isinstance(va, (int, float)) and isinstance(vb, (int, float)) and not math.isclose(va, vb, rel_tol=1e-9):
                            label = stat_key + f"[{i}]"
                            entry["result_diffs"].append({"stat": label, "value_a": va, "value_b": vb, "delta": vb - va})

            results.append(entry)
        return {"run_a": run_a.parameter_set_name, "run_b": run_b.parameter_set_name, "comparisons": results}


def _item_summary(item: PriorItem) -> dict:
    return {
        "distribution": item.distribution,
        "params": item.params,
        "unit": item.unit,
        "source": item.source,
        "source_line": item.source_line,
        "status": item.status,
        "summary_stats": item.summary_stats,
        "change_count": len(item.change_history),
        "note_count": len(item.notes),
        "screenshot_count": len(item.screenshots)
    }


class StatusTracker:

    @staticmethod
    def overview(run: BatchRun) -> dict:
        items = sorted(run.items, key=lambda x: x.name)
        processed = []
        needs_evidence = []
        for item in items:
            entry = {
                "name": item.name,
                "distribution": item.distribution,
                "source": item.source,
                "source_line": item.source_line,
                "evidence": item.evidence,
                "change_count": len(item.change_history),
                "note_count": len(item.notes),
                "screenshot_count": len(item.screenshots)
            }
            if item.status == "processed":
                processed.append(entry)
            else:
                needs_evidence.append(entry)
        return {
            "total": len(items),
            "processed_count": len(processed),
            "needs_evidence_count": len(needs_evidence),
            "processed": processed,
            "needs_evidence": needs_evidence
        }

    @staticmethod
    def mark(run: BatchRun, item_name: str, status: str, evidence: str = "") -> bool:
        for item in run.items:
            if item.name == item_name:
                item.status = status
                if evidence:
                    item.evidence = evidence
                return True
        return False


class MarkdownReporter:

    @staticmethod
    def generate_run_report(run: BatchRun) -> str:
        lines = []
        lines.append(f"# 贝叶斯先验批量验算报告")
        lines.append("")
        lines.append(f"| 字段 | 值 |")
        lines.append(f"|---|---|")
        lines.append(f"| 运行ID | {run.run_id} |")
        lines.append(f"| 时间 | {run.timestamp} |")
        lines.append(f"| 操作人 | {run.operator} |")
        lines.append(f"| 参数集 | {run.parameter_set_name} |")
        lines.append(f"| 先验项数 | {len(run.items)} |")
        lines.append("")

        overview = StatusTracker.overview(run)
        lines.append("## 状态总览")
        lines.append("")
        lines.append(f"- ✅ 已处理: {overview['processed_count']}")
        lines.append(f"- ⏳ 待补证据: {overview['needs_evidence_count']}")
        lines.append("")

        if overview["needs_evidence"]:
            lines.append("### 待补证据清单")
            lines.append("")
            lines.append("| 先验名称 | 分布 | 来源 | 来源行 | 已有证据 |")
            lines.append("|---|---|---|---|---|")
            for e in overview["needs_evidence"]:
                lines.append(f"| {e['name']} | {e['distribution']} | {e['source']} | {e['source_line']} | {e['evidence'] or '—'} |")
            lines.append("")

        for item in sorted(run.items, key=lambda x: x.name):
            lines.append(f"## {item.name}")
            lines.append("")
            lines.append(f"- **分布**: {item.distribution}")
            params_str = ", ".join(f"{k}={v}" for k, v in item.params.items())
            lines.append(f"- **参数**: {params_str}")
            lines.append(f"- **单位**: {item.unit or '—'}")
            lines.append(f"- **来源**: {item.source or '—'}")
            lines.append(f"- **来源行**: {item.source_line or '—'}")
            lines.append(f"- **状态**: {'✅ 已处理' if item.status == 'processed' else '⏳ 待补证据'}")
            lines.append("")

            if item.summary_stats:
                lines.append("### 汇总统计量")
                lines.append("")
                lines.append("| 统计量 | 值 |")
                lines.append("|---|---|")
                for k, v in item.summary_stats.items():
                    if isinstance(v, float):
                        lines.append(f"| {k} | {v:.6f} |")
                    elif isinstance(v, list):
                        formatted = ", ".join(f"{x:.6f}" if isinstance(x, float) else str(x) for x in v)
                        lines.append(f"| {k} | [{formatted}] |")
                    else:
                        lines.append(f"| {k} | {v} |")
                lines.append("")

            if item.calc_steps:
                lines.append("### 计算过程")
                lines.append("")
                for step in item.calc_steps:
                    lines.append(f"**步骤 {step.step_no}**: {step.description}")
                    lines.append(f"- 公式: `{step.expression}`")
                    if step.input_values:
                        inputs = ", ".join(f"{k}={v}" for k, v in step.input_values.items())
                        lines.append(f"- 输入: {inputs}")
                    result = step.result
                    if isinstance(result, float):
                        lines.append(f"- 结果: {result:.6f}")
                    elif isinstance(result, dict):
                        for rk, rv in result.items():
                            if isinstance(rv, float):
                                lines.append(f"- {rk}: {rv:.6f}")
                            else:
                                lines.append(f"- {rk}: {rv}")
                    else:
                        lines.append(f"- 结果: {result}")
                    if step.unit_before or step.unit_after:
                        lines.append(f"- 单位: {step.unit_before or '—'} → {step.unit_after or '—'}")
                    if step.note:
                        lines.append(f"- 备注: {step.note}")
                    lines.append("")

            if item.change_history:
                lines.append("### 变更历史")
                lines.append("")
                lines.append("| 时间 | 字段 | 旧值 | 新值 | 操作人 | 原因 | 影响范围 | 来源行 |")
                lines.append("|---|---|---|---|---|---|---|---|")
                for ch in item.change_history:
                    ts = ch.get("timestamp", "") if isinstance(ch, dict) else getattr(ch, "timestamp", "")
                    fn = ch.get("field_name", "") if isinstance(ch, dict) else getattr(ch, "field_name", "")
                    ov = ch.get("old_value", "") if isinstance(ch, dict) else getattr(ch, "old_value", "")
                    nv = ch.get("new_value", "") if isinstance(ch, dict) else getattr(ch, "new_value", "")
                    op = ch.get("operator", "") if isinstance(ch, dict) else getattr(ch, "operator", "")
                    rs = ch.get("reason", "") if isinstance(ch, dict) else getattr(ch, "reason", "")
                    im = ch.get("impact_scope", "") if isinstance(ch, dict) else getattr(ch, "impact_scope", "")
                    sl = ch.get("source_line", "") if isinstance(ch, dict) else getattr(ch, "source_line", "")
                    lines.append(f"| {ts} | {fn} | {ov} | {nv} | {op} | {rs} | {im} | {sl} |")
                lines.append("")

            if item.notes:
                lines.append("### 备注")
                lines.append("")
                for note in item.notes:
                    if isinstance(note, dict):
                        ts = note.get("timestamp", "")
                        op = note.get("operator", "")
                        txt = note.get("text", "")
                        lines.append(f"- [{ts}] {op}: {txt}")
                    else:
                        lines.append(f"- {note}")
                lines.append("")

            if item.screenshots:
                lines.append("### 旧版本截图/附件")
                lines.append("")
                for ss in item.screenshots:
                    if isinstance(ss, dict):
                        ref = ss.get("ref", "")
                        desc = ss.get("description", "")
                        ts = ss.get("timestamp", "")
                        lines.append(f"- [{ts}] {ref} — {desc}")
                    else:
                        lines.append(f"- {ss}")
                lines.append("")

        if run.run_notes:
            lines.append("## 运行级备注")
            lines.append("")
            for rn in run.run_notes:
                if isinstance(rn, dict):
                    ts = rn.get("timestamp", "")
                    op = rn.get("operator", "")
                    txt = rn.get("text", "")
                    lines.append(f"- [{ts}] {op}: {txt}")
                else:
                    lines.append(f"- {rn}")
            lines.append("")

        return "\n".join(lines)

    @staticmethod
    def generate_comparison_report(comparison: dict, run_a: BatchRun, run_b: BatchRun) -> str:
        lines = []
        lines.append("# 贝叶斯先验参数对照报告")
        lines.append("")
        lines.append(f"| 字段 | A组 | B组 |")
        lines.append(f"|---|---|---|")
        lines.append(f"| 参数集 | {comparison['run_a']} | {comparison['run_b']} |")
        lines.append(f"| 时间 | {run_a.timestamp} | {run_b.timestamp} |")
        lines.append(f"| 操作人 | {run_a.operator} | {run_b.operator} |")
        lines.append(f"| 先验项数 | {len(run_a.items)} | {len(run_b.items)} |")
        lines.append("")

        for comp in comparison["comparisons"]:
            name = comp["name"]
            lines.append(f"## {name}")
            lines.append("")

            if comp["only_in"]:
                lines.append(f"> ⚠️ 该先验仅存在于 **{comp['only_in']}组**")
                lines.append("")
                if comp.get("item_a"):
                    lines.append(f"A组: {comp['item_a']['distribution']}({comp['item_a']['params']})")
                if comp.get("item_b"):
                    lines.append(f"B组: {comp['item_b']['distribution']}({comp['item_b']['params']})")
                lines.append("")
                continue

            lines.append("### 参数对照")
            lines.append("")
            if comp["param_diffs"]:
                lines.append("| 参数 | A组值 | B组值 | 变化量 | 变化率 | 影响 |")
                lines.append("|---|---|---|---|---|---|")
                for d in comp["param_diffs"]:
                    va = d.get("value_a", "—")
                    vb = d.get("value_b", "—")
                    delta = d.get("delta", "—")
                    pct = d.get("pct_change", "—")
                    impact = d.get("impact", "")
                    if isinstance(delta, float):
                        delta = f"{delta:+.6f}"
                    if isinstance(pct, (int, float)):
                        pct = f"{pct:+.2f}%"
                    if isinstance(va, float):
                        va = f"{va:.6f}"
                    if isinstance(vb, float):
                        vb = f"{vb:.6f}"
                    lines.append(f"| {d['field']} | {va} | {vb} | {delta} | {pct} | {impact} |")
            else:
                lines.append("*参数完全一致*")
            lines.append("")

            lines.append("### 统计量差异")
            lines.append("")
            if comp["result_diffs"]:
                lines.append("| 统计量 | A组值 | B组值 | 差异 |")
                lines.append("|---|---|---|---|")
                for d in comp["result_diffs"]:
                    va = d["value_a"]
                    vb = d["value_b"]
                    delta = d["delta"]
                    if isinstance(va, float):
                        va = f"{va:.6f}"
                    if isinstance(vb, float):
                        vb = f"{vb:.6f}"
                    if isinstance(delta, float):
                        delta = f"{delta:+.6f}"
                    lines.append(f"| {d['stat']} | {va} | {vb} | {delta} |")
            else:
                lines.append("*统计量完全一致*")
            lines.append("")

        return "\n".join(lines)

    @staticmethod
    def generate_status_report(run: BatchRun) -> str:
        lines = []
        lines.append("# 先验验算状态报告")
        lines.append("")
        lines.append(f"参数集: **{run.parameter_set_name}** | 运行ID: {run.run_id} | 时间: {run.timestamp}")
        lines.append("")

        overview = StatusTracker.overview(run)
        lines.append(f"## 总览: {overview['processed_count']}/{overview['total']} 已处理")
        lines.append("")

        lines.append("### 已处理 ✅")
        lines.append("")
        if overview["processed"]:
            lines.append("| 先验名称 | 分布 | 来源 | 来源行 | 变更次数 | 备注 |")
            lines.append("|---|---|---|---|---|---|")
            for e in overview["processed"]:
                lines.append(f"| {e['name']} | {e['distribution']} | {e['source']} | {e['source_line']} | {e['change_count']} | {e['note_count']} |")
        else:
            lines.append("*暂无*")
        lines.append("")

        lines.append("### 待补证据 ⏳")
        lines.append("")
        if overview["needs_evidence"]:
            lines.append("| 先验名称 | 分布 | 来源 | 来源行 | 已有证据 | 截图 |")
            lines.append("|---|---|---|---|---|---|")
            for e in overview["needs_evidence"]:
                lines.append(f"| {e['name']} | {e['distribution']} | {e['source']} | {e['source_line']} | {e['evidence'] or '—'} | {e['screenshot_count']} |")
        else:
            lines.append("*全部已处理*")
        lines.append("")

        return "\n".join(lines)


def load_params(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_run(params_data: dict) -> BatchRun:
    meta = params_data.get("run_meta", {})
    items = []
    for p in params_data.get("priors", []):
        item = PriorItem(
            name=p.get("name", ""),
            distribution=p.get("distribution", ""),
            params=p.get("params", {}),
            unit=p.get("unit", ""),
            source=p.get("source", ""),
            source_line=p.get("source_line", ""),
            status=p.get("status", "needs_evidence"),
            notes=p.get("notes", []),
            evidence=p.get("evidence", ""),
            screenshots=p.get("screenshots", [])
        )
        items.append(item)

    run_id = _short_hash(
        meta.get("parameter_set_name", "") + _now_iso()
    )
    return BatchRun(
        run_id=run_id,
        timestamp=_now_iso(),
        operator=meta.get("operator", ""),
        parameter_set_name=meta.get("parameter_set_name", "未命名"),
        items=items,
        run_notes=meta.get("run_notes", []),
        meta=meta
    )


def cmd_run(args):
    params_data = load_params(args.params)
    run = build_run(params_data)

    for item in run.items:
        BayesianEngine.verify(item)

    hist = HistoryManager(args.history_dir)
    hist.save_run(run)

    reporter = MarkdownReporter()
    report = reporter.generate_run_report(run)

    output_path = args.output or f"bayesian_report_{run.run_id}.md"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"验算完成 | 运行ID: {run.run_id}")
    print(f"报告已写入: {output_path}")
    print(f"历史已保存: {args.history_dir}/{HISTORY_DIR}/{run.run_id}.json")

    overview = StatusTracker.overview(run)
    print(f"状态: {overview['processed_count']} 已处理 / {overview['needs_evidence_count']} 待补证据 / {overview['total']} 总计")


def cmd_compare(args):
    hist = HistoryManager(args.history_dir)

    if args.run_id_a and args.run_id_b:
        run_a = hist.load_run(args.run_id_a)
        run_b = hist.load_run(args.run_id_b)
        if run_a is None:
            print(f"错误: 找不到运行 {args.run_id_a}", file=sys.stderr)
            sys.exit(1)
        if run_b is None:
            print(f"错误: 找不到运行 {args.run_id_b}", file=sys.stderr)
            sys.exit(1)
    elif args.params_a and args.params_b:
        data_a = load_params(args.params_a)
        data_b = load_params(args.params_b)
        run_a = build_run(data_a)
        run_b = build_run(data_b)
        for item in run_a.items:
            BayesianEngine.verify(item)
        for item in run_b.items:
            BayesianEngine.verify(item)
        hist.save_run(run_a)
        hist.save_run(run_b)
    else:
        print("错误: 需要 --run-id-a/b 或 --params-a/b", file=sys.stderr)
        sys.exit(1)

    comparison = ParameterComparator.compare(run_a, run_b)
    reporter = MarkdownReporter()
    report = reporter.generate_comparison_report(comparison, run_a, run_b)

    output_path = args.output or f"bayesian_compare_{_short_hash(_now_iso())}.md"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report)

    diff_count = sum(1 for c in comparison["comparisons"] if c["param_diffs"] or c["result_diffs"])
    print(f"对照完成 | 有差异的先验: {diff_count}/{len(comparison['comparisons'])}")
    print(f"报告已写入: {output_path}")


def cmd_status(args):
    hist = HistoryManager(args.history_dir)
    run = hist.load_run(args.run_id)
    if run is None:
        print(f"错误: 找不到运行 {args.run_id}", file=sys.stderr)
        sys.exit(1)

    if args.mark:
        parts = args.mark.split("=", 1)
        if len(parts) != 2:
            print("错误: --mark 格式为 名称=状态", file=sys.stderr)
            sys.exit(1)
        name, status = parts
        evidence = args.evidence or ""
        ok = StatusTracker.mark(run, name, status, evidence)
        if not ok:
            print(f"错误: 找不到先验项 '{name}'", file=sys.stderr)
            sys.exit(1)
        hist.save_run(run)
        print(f"已更新: {name} → {status}")

    reporter = MarkdownReporter()
    report = reporter.generate_status_report(run)

    output_path = args.output or f"bayesian_status_{run.run_id}.md"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report)

    overview = StatusTracker.overview(run)
    print(f"状态报告已写入: {output_path}")
    print(f"✅ {overview['processed_count']} 已处理 | ⏳ {overview['needs_evidence_count']} 待补证据 | 共 {overview['total']} 项")


def cmd_history(args):
    hist = HistoryManager(args.history_dir)
    runs = hist.list_runs()
    if not runs:
        print("暂无历史记录")
        return
    print(f"{'运行ID':<12} {'时间':<22} {'操作人':<10} {'参数集':<25} {'项数'}")
    print("-" * 85)
    for r in runs:
        print(f"{r['run_id']:<12} {r['timestamp']:<22} {r['operator']:<10} {r['parameter_set_name']:<25} {r['item_count']}")


def cmd_note(args):
    hist = HistoryManager(args.history_dir)
    ok = hist.add_note(args.run_id, args.item_name, args.text, args.operator)
    if ok:
        print(f"备注已添加: {args.item_name}")
    else:
        print(f"错误: 找不到运行 {args.run_id} 或先验项 {args.item_name}", file=sys.stderr)
        sys.exit(1)


def cmd_screenshot(args):
    hist = HistoryManager(args.history_dir)
    ok = hist.add_screenshot_ref(args.run_id, args.item_name, args.ref, args.description)
    if ok:
        print(f"截图/附件已记录: {args.item_name} → {args.ref}")
    else:
        print(f"错误: 找不到运行 {args.run_id} 或先验项 {args.item_name}", file=sys.stderr)
        sys.exit(1)


def cmd_change(args):
    hist = HistoryManager(args.history_dir)
    ok = hist.record_change(
        args.run_id, args.item_name, args.field,
        args.old_value, args.new_value,
        args.source_line, args.operator, args.reason, args.impact
    )
    if ok:
        print(f"变更已记录: {args.item_name}.{args.field}: {args.old_value} → {args.new_value}")
    else:
        print(f"错误: 找不到运行 {args.run_id} 或先验项 {args.item_name}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="贝叶斯先验批量验算工具",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = parser.add_subparsers(dest="command")

    p_run = sub.add_parser("run", help="执行批量验算")
    p_run.add_argument("--params", required=True, help="参数文件路径 (JSON)")
    p_run.add_argument("--output", help="报告输出路径 (默认自动生成)")
    p_run.add_argument("--history-dir", default=".", help="历史记录存储目录 (默认当前目录)")

    p_cmp = sub.add_parser("compare", help="两组参数对照")
    p_cmp.add_argument("--params-a", help="A组参数文件路径")
    p_cmp.add_argument("--params-b", help="B组参数文件路径")
    p_cmp.add_argument("--run-id-a", help="A组历史运行ID")
    p_cmp.add_argument("--run-id-b", help="B组历史运行ID")
    p_cmp.add_argument("--output", help="报告输出路径")
    p_cmp.add_argument("--history-dir", default=".", help="历史记录存储目录")

    p_st = sub.add_parser("status", help="查看/更新验算状态")
    p_st.add_argument("--run-id", required=True, help="运行ID")
    p_st.add_argument("--mark", help="标记状态: 名称=状态 (processed/needs_evidence)")
    p_st.add_argument("--evidence", help="补充证据说明")
    p_st.add_argument("--output", help="报告输出路径")
    p_st.add_argument("--history-dir", default=".", help="历史记录存储目录")

    p_hist = sub.add_parser("history", help="查看历史运行")
    p_hist.add_argument("--history-dir", default=".", help="历史记录存储目录")

    p_note = sub.add_parser("note", help="为先验项添加备注")
    p_note.add_argument("--run-id", required=True)
    p_note.add_argument("--item-name", required=True, help="先验项名称")
    p_note.add_argument("--text", required=True, help="备注内容")
    p_note.add_argument("--operator", default="", help="操作人")
    p_note.add_argument("--history-dir", default=".", help="历史记录存储目录")

    p_ss = sub.add_parser("screenshot", help="记录旧版本截图/附件引用")
    p_ss.add_argument("--run-id", required=True)
    p_ss.add_argument("--item-name", required=True)
    p_ss.add_argument("--ref", required=True, help="截图/附件路径或URL")
    p_ss.add_argument("--description", default="", help="描述")
    p_ss.add_argument("--history-dir", default=".", help="历史记录存储目录")

    p_chg = sub.add_parser("change", help="记录参数变更")
    p_chg.add_argument("--run-id", required=True)
    p_chg.add_argument("--item-name", required=True)
    p_chg.add_argument("--field", required=True, help="变更字段名")
    p_chg.add_argument("--old-value", required=True, help="旧值")
    p_chg.add_argument("--new-value", required=True, help="新值")
    p_chg.add_argument("--source-line", default="", help="来源行")
    p_chg.add_argument("--operator", default="", help="操作人")
    p_chg.add_argument("--reason", default="", help="变更原因")
    p_chg.add_argument("--impact", default="", help="影响范围")
    p_chg.add_argument("--history-dir", default=".", help="历史记录存储目录")

    args = parser.parse_args()

    if args.command == "run":
        cmd_run(args)
    elif args.command == "compare":
        cmd_compare(args)
    elif args.command == "status":
        cmd_status(args)
    elif args.command == "history":
        cmd_history(args)
    elif args.command == "note":
        cmd_note(args)
    elif args.command == "screenshot":
        cmd_screenshot(args)
    elif args.command == "change":
        cmd_change(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
