from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Tuple

from prompt_impact.ids import finding_id
from prompt_impact.models import (
    FINDING_EVAL_RESULT,
    FINDING_LEAKAGE,
    FINDING_PROMPT_REGRESSION,
    SEV_BLOCKER,
    SEV_INFO,
    SEV_WARN,
    STATUS_FAIL,
    STATUS_PASS,
    STATUS_PENDING,
    Annotation,
    EvalResult,
    EvalRun,
    Finding,
    ModelLogEntry,
    PromptVersion,
    SourceRef,
)

PASS_LABELS = {"correct", "pass", "ok", "right", "true"}
FAIL_LABELS = {"wrong", "fail", "incorrect", "bad", "false"}
PASS_SCORE = 0.5


def result_status(result: EvalResult) -> str:
    label = (result.label or "").strip().lower()
    if label in PASS_LABELS:
        return STATUS_PASS
    if label in FAIL_LABELS:
        return STATUS_FAIL
    if result.score is not None:
        return STATUS_PASS if result.score >= PASS_SCORE else STATUS_FAIL
    return STATUS_PENDING


def _severity_for(kind: str, status: str) -> str:
    if kind == FINDING_LEAKAGE and status == STATUS_FAIL:
        return SEV_BLOCKER
    if status == STATUS_FAIL:
        return SEV_WARN
    return SEV_INFO


def _prompt_lookup(prompts: List[PromptVersion]) -> Dict[str, PromptVersion]:
    return {p.id: p for p in prompts}


def _train_index(
    annotations: List[Annotation], model_logs: List[ModelLogEntry]
) -> Dict[str, List[SourceRef]]:
    index: Dict[str, List[SourceRef]] = defaultdict(list)
    for ann in annotations:
        if ann.split == "train":
            if ann.source:
                index[ann.sample_id].append(ann.source)
    for m in model_logs:
        if m.split == "train":
            if m.source:
                index[m.sample_id].append(m.source)
    return index


def _eval_index(eval_runs: List[EvalRun]) -> Dict[Tuple[str, str], List[Tuple[EvalRun, EvalResult]]]:
    idx: Dict[Tuple[str, str], List[Tuple[EvalRun, EvalResult]]] = defaultdict(list)
    for run in eval_runs:
        for r in run.results:
            idx[(run.prompt_version, r.sample_id)].append((run, r))
    return idx


def build_eval_findings(
    eval_runs: List[EvalRun], prompts: List[PromptVersion]
) -> List[Finding]:
    findings: List[Finding] = []
    pmap = _prompt_lookup(prompts)
    for run in eval_runs:
        for r in run.results:
            status = result_status(r)
            evidence: List[SourceRef] = []
            if r.source:
                evidence.append(r.source)
            if run.source:
                evidence.append(run.source)
            pv = pmap.get(run.prompt_version)
            if pv and pv.source:
                evidence.append(pv.source)
            fid = finding_id(FINDING_EVAL_RESULT, run.prompt_version, run.eval_run_id, r.sample_id)
            summary = f"评测结果 {r.sample_id}: {status} (score={r.score}, label={r.label or '-'})"
            findings.append(
                Finding(
                    id=fid,
                    kind=FINDING_EVAL_RESULT,
                    status=status,
                    severity=_severity_for(FINDING_EVAL_RESULT, status),
                    prompt_version=run.prompt_version,
                    eval_run_id=run.eval_run_id,
                    sample_key=r.sample_id,
                    summary=summary,
                    conclusion=summary,
                    evidence=evidence,
                )
            )
    return findings


def build_leakage_findings(
    eval_runs: List[EvalRun],
    annotations: List[Annotation],
    model_logs: List[ModelLogEntry],
) -> List[Finding]:
    train = _train_index(annotations, model_logs)
    findings: List[Finding] = []
    for run in eval_runs:
        seen_in_run = set()
        for r in run.results:
            if r.sample_id in seen_in_run:
                continue
            seen_in_run.add(r.sample_id)
            train_sources = train.get(r.sample_id)
            if not train_sources:
                continue
            evidence: List[SourceRef] = list(train_sources)
            if r.source:
                evidence.append(r.source)
            if run.source:
                evidence.append(run.source)
            fid = finding_id(FINDING_LEAKAGE, run.prompt_version, run.eval_run_id, r.sample_id)
            summary = (
                f"训练验证泄漏: 样本 {r.sample_id} 同时出现在训练集与验证评测 "
                f"({run.eval_run_id}, prompt={run.prompt_version})"
            )
            findings.append(
                Finding(
                    id=fid,
                    kind=FINDING_LEAKAGE,
                    status=STATUS_FAIL,
                    severity=SEV_BLOCKER,
                    prompt_version=run.prompt_version,
                    eval_run_id=run.eval_run_id,
                    sample_key=r.sample_id,
                    summary=summary,
                    conclusion="存在训练数据泄漏到验证集，需剔除该样本并重训/重评",
                    evidence=evidence,
                )
            )
    return findings


def build_regression_findings(
    eval_runs: List[EvalRun], prompts: List[PromptVersion]
) -> List[Finding]:
    pmap = _prompt_lookup(prompts)
    child_by_parent: Dict[str, List[PromptVersion]] = defaultdict(list)
    for p in prompts:
        if p.parent_version:
            child_by_parent[p.id].append(p)
    idx = _eval_index(eval_runs)
    findings: List[Finding] = []
    for p in prompts:
        if not p.parent_version:
            continue
        parent = pmap.get(p.parent_version)
        if parent is None:
            continue
        sample_ids = {
            sid for (pv, sid) in idx.keys() if pv in (p.id, parent.id)
        }
        for sid in sample_ids:
            child_hits = idx.get((p.id, sid), [])
            parent_hits = idx.get((parent.id, sid), [])
            if not child_hits or not parent_hits:
                continue
            child_run, child_r = child_hits[0]
            _, parent_r = parent_hits[0]
            c_status = result_status(child_r)
            p_status = result_status(parent_r)
            regressed = False
            if child_r.score is not None and parent_r.score is not None:
                regressed = child_r.score < parent_r.score
            elif c_status == STATUS_FAIL and p_status == STATUS_PASS:
                regressed = True
            if not regressed:
                continue
            evidence: List[SourceRef] = []
            if child_r.source:
                evidence.append(child_r.source)
            if parent_r.source:
                evidence.append(parent_r.source)
            if p.source:
                evidence.append(p.source)
            fid = finding_id(FINDING_PROMPT_REGRESSION, p.id, child_run.eval_run_id, sid)
            changed = ",".join(p.changed_fields) if p.changed_fields else "未声明"
            summary = (
                f"Prompt 回退: {parent.id} -> {p.id} 样本 {sid} 表现下降 "
                f"(parent={parent_r.score}/{parent_r.label}, child={child_r.score}/{child_r.label}, 改动字段={changed})"
            )
            findings.append(
                Finding(
                    id=fid,
                    kind=FINDING_PROMPT_REGRESSION,
                    status=STATUS_FAIL,
                    severity=SEV_WARN,
                    prompt_version=p.id,
                    eval_run_id=child_run.eval_run_id,
                    sample_key=sid,
                    summary=summary,
                    conclusion=f"版本 {p.id} 相对 {parent.id} 在样本 {sid} 上出现回退，需复核改动字段 {changed}",
                    evidence=evidence,
                )
            )
    return findings


def analyze(parsed) -> List[Finding]:
    findings: List[Finding] = []
    findings.extend(build_eval_findings(parsed.eval_runs, parsed.prompts))
    findings.extend(build_leakage_findings(parsed.eval_runs, parsed.annotations, parsed.model_logs))
    findings.extend(build_regression_findings(parsed.eval_runs, parsed.prompts))
    return findings
