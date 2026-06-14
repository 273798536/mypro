from typing import Dict, Any, List, Tuple, Optional
from collections import defaultdict
from models import (
    StudentRecord, CalcStep, BatchState,
    RECORD_STATUS_RAW, RECORD_STATUS_CLEAN,
    RECORD_STATUS_SORT_UNSTABLE, RECORD_STATUS_PROCESSED,
    RECORD_STATUS_EVIDENCE_NEEDED, BATCH_COMPLETED, BATCH_PARTIAL,
    new_record_id, _now_iso,
)


DEFAULT_PARAM_A = {
    "min_observations": 3,
    "tolerance": 0.15,
    "expected_transitions": {
        "粗心->审题": 0.25, "粗心->计算": 0.35, "粗心->概念": 0.20, "粗心->粗心": 0.20,
        "审题->粗心": 0.20, "审题->计算": 0.25, "审题->概念": 0.35, "审题->审题": 0.20,
        "计算->粗心": 0.30, "计算->审题": 0.20, "计算->概念": 0.20, "计算->计算": 0.30,
        "概念->粗心": 0.15, "概念->审题": 0.25, "概念->计算": 0.20, "概念->概念": 0.40,
    },
    "unit": "概率",
}

DEFAULT_PARAM_B = {
    "min_observations": 5,
    "tolerance": 0.10,
    "expected_transitions": {
        "粗心->审题": 0.20, "粗心->计算": 0.40, "粗心->概念": 0.15, "粗心->粗心": 0.25,
        "审题->粗心": 0.15, "审题->计算": 0.20, "审题->概念": 0.45, "审题->审题": 0.20,
        "计算->粗心": 0.35, "计算->审题": 0.15, "计算->概念": 0.15, "计算->计算": 0.35,
        "概念->粗心": 0.10, "概念->审题": 0.20, "概念->计算": 0.15, "概念->概念": 0.55,
    },
    "unit": "概率",
}


def _coerce_sequence(raw: Any) -> Tuple[List[str], List[str]]:
    issues = []
    if raw is None:
        issues.append("原始序列为空")
        return [], issues
    if isinstance(raw, str):
        parts = [p.strip() for p in raw.replace("，", ",").split(",") if p.strip()]
    elif isinstance(raw, list):
        parts = [str(p).strip() for p in raw if str(p).strip()]
    else:
        issues.append(f"无法识别的序列格式: {type(raw).__name__}")
        return [], issues
    allowed = {"粗心", "审题", "计算", "概念"}
    cleaned = []
    for i, p in enumerate(parts):
        if p not in allowed:
            issues.append(f"第{i+1}项'{p}'不在合法值域{{粗心,审题,计算,概念}}")
        else:
            cleaned.append(p)
    return cleaned, issues


def _check_sort_stability(payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    seq_raw = payload.get("sequence", payload.get("错题序列"))
    if isinstance(seq_raw, list):
        for idx, v in enumerate(seq_raw):
            if isinstance(v, str) and ("?" in v or "？" in v):
                return False, f"第{idx+1}项含占位符'{v}'"
    key = payload.get("student_id") or payload.get("学号") or ""
    ts = payload.get("timestamp") or payload.get("时间")
    if not key:
        return False, "缺少学号/student_id，无法稳定排序"
    if not ts:
        return False, "缺少时间戳，无法按顺序对齐"
    return True, None


def _count_transitions(seq: List[str]) -> Dict[str, int]:
    counts: Dict[str, int] = defaultdict(int)
    for i in range(len(seq) - 1):
        key = f"{seq[i]}->{seq[i+1]}"
        counts[key] += 1
    return dict(counts)


def _normalize(counts: Dict[str, int], steps: List[CalcStep], unit: str) -> Dict[str, float]:
    total = sum(counts.values())
    steps.append(CalcStep(
        name="汇总转移总数", value_before=None, value_after=total,
        unit_before=None, unit_after="次",
        note=f"共 {len(counts)} 种不同转移类型",
    ))
    probs = {}
    for k, v in counts.items():
        p = round(v / total, 4) if total else 0.0
        steps.append(CalcStep(
            name=f"概率归一化 {k}",
            value_before=v, value_after=p,
            unit_before="次", unit_after=unit,
            note=f"{v}/{total} = {p}",
        ))
        probs[k] = p
    return probs


def _compare(probs: Dict[str, float], expected: Dict[str, float], tolerance: float,
             steps: List[CalcStep], unit: str) -> Tuple[bool, List[str]]:
    deviations = []
    for k, exp in expected.items():
        obs = probs.get(k, 0.0)
        diff = round(abs(obs - exp), 4)
        steps.append(CalcStep(
            name=f"对照差异 {k}",
            value_before=obs, value_after=diff,
            unit_before=unit, unit_after="Δ" + unit,
            note=f"观测 {obs} vs 期望 {exp}，容差 {tolerance}",
        ))
        if diff > tolerance:
            deviations.append(f"{k}: |{obs}-{exp}|={diff}>{tolerance}")
    return len(deviations) == 0, deviations


def ingest_record(batch: BatchState, raw_source: str, raw_payload: Dict[str, Any]) -> StudentRecord:
    rid = new_record_id()
    rec = StudentRecord(
        record_id=rid,
        raw_source=raw_source,
        raw_payload=dict(raw_payload),
        status=RECORD_STATUS_RAW,
    )
    sort_ok, sort_reason = _check_sort_stability(raw_payload)
    if not sort_ok:
        rec.sort_unstable_reason = sort_reason
        rec.status = RECORD_STATUS_SORT_UNSTABLE
        rec.issues.append(f"排序不稳定: {sort_reason}")
    seq, seq_issues = _coerce_sequence(raw_payload.get("sequence", raw_payload.get("错题序列")))
    rec.issues.extend(seq_issues)
    if seq and sort_ok:
        rec.cleaned_payload = {"sequence": seq, **{k: v for k, v in raw_payload.items()
                                                   if k not in ("sequence", "错题序列")}}
        rec.sort_key = str(raw_payload.get("student_id") or raw_payload.get("学号") or "") + \
                       "|" + str(raw_payload.get("timestamp") or raw_payload.get("时间") or "")
        rec.status = RECORD_STATUS_CLEAN
    elif not seq:
        rec.status = RECORD_STATUS_EVIDENCE_NEEDED
        rec.issues.append("无合法错题序列，需补证据")
    rec.updated_at = _now_iso()
    batch.records[rid] = rec
    batch.add_event("ingest", f"{rid} source={raw_source} status={rec.status}")
    return rec


def process_record(rec: StudentRecord, params: Dict[str, Any], label: str, steps: List[CalcStep]) -> Dict[str, Any]:
    steps.append(CalcStep(
        name=f"参数集{label}加载",
        value_before=None, value_after={k: v for k, v in params.items() if k != "expected_transitions"},
        note=f"期望转移矩阵维度 {len(params.get('expected_transitions', {}))}",
    ))
    seq = rec.cleaned_payload["sequence"] if rec.cleaned_payload else []
    min_obs = params.get("min_observations", 0)
    short = len(seq) < min_obs
    steps.append(CalcStep(
        name="输入序列", value_before=None, value_after=seq,
        note=f"长度 {len(seq)}，最小要求 {min_obs}" + (" ⚠ 不足" if short else ""),
    ))
    if short:
        steps.append(CalcStep(
            name="证据不足判定",
            value_before=len(seq), value_after=min_obs,
            unit_before="条", unit_after="条",
            note=f"序列长度 {len(seq)} < 最小观测数 {min_obs}，仍继续计算以便回看",
        ))
    if len(seq) < 2:
        steps.append(CalcStep(
            name="转移计数", value_before=None, value_after={},
            unit_before=None, unit_after="次",
            note="序列不足2项，无转移对可计算",
        ))
        return {"passed": False, "need_evidence": True,
                "reason": "序列不足2项无法形成转移对",
                "probs": {}, "deviations": []}
    counts = _count_transitions(seq)
    steps.append(CalcStep(
        name="转移计数", value_before=None, value_after=counts,
        unit_before=None, unit_after="次",
        note=f"共 {sum(counts.values())} 次转移，{len(counts)} 种类型",
    ))
    probs = _normalize(counts, steps, params.get("unit", "概率"))
    ok, devs = _compare(probs, params.get("expected_transitions", {}),
                        params.get("tolerance", 0.1), steps, params.get("unit", "概率"))
    if short:
        devs.insert(0, f"长度{len(seq)}<{min_obs}")
    return {"passed": False if short else ok, "need_evidence": short,
            "probs": probs, "deviations": devs}


def run_batch(batch: BatchState) -> BatchState:
    param_a = batch.param_set_a or DEFAULT_PARAM_A
    param_b = batch.param_set_b or DEFAULT_PARAM_B
    processed, evidence = 0, 0
    for rec in batch.records.values():
        if rec.status == RECORD_STATUS_SORT_UNSTABLE:
            continue
        if rec.status in (RECORD_STATUS_EVIDENCE_NEEDED, RECORD_STATUS_RAW):
            if not rec.cleaned_payload:
                evidence += 1
                continue
        steps_a: List[CalcStep] = []
        steps_b: List[CalcStep] = []
        res_a = process_record(rec, param_a, "A", steps_a)
        res_b = process_record(rec, param_b, "B", steps_b)
        rec.calc_steps = steps_a + steps_b
        rec.result = {"param_set_a": res_a, "param_set_b": res_b}
        if res_a.get("need_evidence") or res_b.get("need_evidence"):
            rec.status = RECORD_STATUS_EVIDENCE_NEEDED
            rec.issues.append("至少一组参数判定需补证据")
            evidence += 1
        else:
            rec.status = RECORD_STATUS_PROCESSED
            processed += 1
        rec.updated_at = _now_iso()
    total_cleanable = sum(1 for r in batch.records.values()
                          if r.status not in (RECORD_STATUS_SORT_UNSTABLE, RECORD_STATUS_RAW))
    if total_cleanable > 0 and processed + evidence == total_cleanable:
        batch.status = BATCH_COMPLETED
    else:
        batch.status = BATCH_PARTIAL
    batch.add_event("run_batch", f"processed={processed} evidence_needed={evidence}")
    batch.touch()
    return batch
