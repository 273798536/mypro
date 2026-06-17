from __future__ import annotations

import dataclasses
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from prompt_impact.errors import ActionableError

PROMPT = "prompt"
MODEL_LOG = "model_log"
ANNOTATION = "annotation"
EVAL_RUN = "eval_run"

FINDING_EVAL_RESULT = "eval_result"
FINDING_PROMPT_REGRESSION = "prompt_regression"
FINDING_LEAKAGE = "training_validation_leakage"

STATUS_PASS = "pass"
STATUS_FAIL = "fail"
STATUS_PENDING = "pending_confirmation"
STATUS_RESOLVED = "resolved"

SEV_INFO = "info"
SEV_WARN = "warn"
SEV_BLOCKER = "blocker"


@dataclass
class SourceRef:
    path: str
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    material_key: Optional[str] = None
    note: str = ""

    def to_dict(self) -> dict:
        return dataclasses.asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "SourceRef":
        return cls(**{k: d.get(k) for k in ("path", "line_start", "line_end", "material_key", "note")})

    def render(self) -> str:
        loc = self.path
        if self.line_start is not None:
            loc += f"#L{self.line_start}"
            if self.line_end and self.line_end != self.line_start:
                loc += f"-L{self.line_end}"
        return loc


@dataclass
class PromptVersion:
    prompt_id: str
    version: str
    parent_version: Optional[str] = None
    changed_fields: List[str] = field(default_factory=list)
    system: str = ""
    template: str = ""
    created_at: str = ""
    source: Optional[SourceRef] = None

    @property
    def id(self) -> str:
        return f"{self.prompt_id}@{self.version}"

    def to_dict(self) -> dict:
        d = dataclasses.asdict(self)
        d["id"] = self.id
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "PromptVersion":
        src = d.get("source")
        return cls(
            prompt_id=d.get("prompt_id", ""),
            version=d.get("version", ""),
            parent_version=d.get("parent_version"),
            changed_fields=d.get("changed_fields", []),
            system=d.get("system", ""),
            template=d.get("template", ""),
            created_at=d.get("created_at", ""),
            source=SourceRef.from_dict(src) if src else None,
        )


@dataclass
class ModelLogEntry:
    run_id: str
    prompt_version: str
    sample_id: str
    split: str = ""
    score: Optional[float] = None
    ts: str = ""
    source: Optional[SourceRef] = None

    def to_dict(self) -> dict:
        return dataclasses.asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "ModelLogEntry":
        src = d.get("source")
        return cls(
            run_id=d.get("run_id", ""),
            prompt_version=d.get("prompt_version", ""),
            sample_id=d.get("sample_id", ""),
            split=d.get("split", ""),
            score=d.get("score"),
            ts=d.get("ts", ""),
            source=SourceRef.from_dict(src) if src else None,
        )


@dataclass
class Annotation:
    annotation_id: str
    sample_id: str
    split: str = ""
    label: str = ""
    batch: str = ""
    annotator: str = ""
    source: Optional[SourceRef] = None

    def to_dict(self) -> dict:
        return dataclasses.asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Annotation":
        src = d.get("source")
        return cls(
            annotation_id=d.get("annotation_id", ""),
            sample_id=d.get("sample_id", ""),
            split=d.get("split", ""),
            label=d.get("label", ""),
            batch=d.get("batch", ""),
            annotator=d.get("annotator", ""),
            source=SourceRef.from_dict(src) if src else None,
        )


@dataclass
class EvalResult:
    sample_id: str
    score: Optional[float] = None
    label: str = ""
    expected: str = ""
    got: str = ""
    source: Optional[SourceRef] = None

    def to_dict(self) -> dict:
        return dataclasses.asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "EvalResult":
        src = d.get("source")
        return cls(
            sample_id=d.get("sample_id", ""),
            score=d.get("score"),
            label=d.get("label", ""),
            expected=d.get("expected", ""),
            got=d.get("got", ""),
            source=SourceRef.from_dict(src) if src else None,
        )


@dataclass
class EvalRun:
    eval_run_id: str
    prompt_version: str
    dataset: str = ""
    started_at: str = ""
    train_run_id: str = ""
    results: List[EvalResult] = field(default_factory=list)
    source: Optional[SourceRef] = None

    def to_dict(self) -> dict:
        return {
            "eval_run_id": self.eval_run_id,
            "prompt_version": self.prompt_version,
            "dataset": self.dataset,
            "started_at": self.started_at,
            "train_run_id": self.train_run_id,
            "results": [r.to_dict() for r in self.results],
            "source": self.source.to_dict() if self.source else None,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "EvalRun":
        src = d.get("source")
        return cls(
            eval_run_id=d.get("eval_run_id", ""),
            prompt_version=d.get("prompt_version", ""),
            dataset=d.get("dataset", ""),
            started_at=d.get("started_at", ""),
            train_run_id=d.get("train_run_id", ""),
            results=[EvalResult.from_dict(r) for r in d.get("results", [])],
            source=SourceRef.from_dict(src) if src else None,
        )


@dataclass
class Material:
    kind: str
    source_path: str
    material_key: str
    fingerprint: str
    ingested_at: str = ""
    versions: List[str] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return dataclasses.asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Material":
        return cls(
            kind=d.get("kind", ""),
            source_path=d.get("source_path", ""),
            material_key=d.get("material_key", ""),
            fingerprint=d.get("fingerprint", ""),
            ingested_at=d.get("ingested_at", ""),
            versions=list(d.get("versions", [])),
            summary=dict(d.get("summary", {})),
        )


@dataclass
class Finding:
    id: str
    kind: str
    status: str
    severity: str = SEV_INFO
    prompt_version: str = ""
    eval_run_id: str = ""
    sample_key: str = ""
    summary: str = ""
    conclusion: str = ""
    evidence: List[SourceRef] = field(default_factory=list)
    first_seen_run: str = ""
    last_updated_run: str = ""
    last_run_id: str = ""
    resolved: bool = False

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "status": self.status,
            "severity": self.severity,
            "prompt_version": self.prompt_version,
            "eval_run_id": self.eval_run_id,
            "sample_key": self.sample_key,
            "summary": self.summary,
            "conclusion": self.conclusion,
            "evidence": [e.to_dict() for e in self.evidence],
            "first_seen_run": self.first_seen_run,
            "last_updated_run": self.last_updated_run,
            "last_run_id": self.last_run_id,
            "resolved": self.resolved,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Finding":
        return cls(
            id=d.get("id", ""),
            kind=d.get("kind", ""),
            status=d.get("status", ""),
            severity=d.get("severity", SEV_INFO),
            prompt_version=d.get("prompt_version", ""),
            eval_run_id=d.get("eval_run_id", ""),
            sample_key=d.get("sample_key", ""),
            summary=d.get("summary", ""),
            conclusion=d.get("conclusion", ""),
            evidence=[SourceRef.from_dict(e) for e in d.get("evidence", [])],
            first_seen_run=d.get("first_seen_run", ""),
            last_updated_run=d.get("last_updated_run", ""),
            last_run_id=d.get("last_run_id", ""),
            resolved=d.get("resolved", False),
        )


@dataclass
class ProcessingStep:
    step: str
    description: str
    input_material_keys: List[str] = field(default_factory=list)
    at: str = ""

    def to_dict(self) -> dict:
        return dataclasses.asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "ProcessingStep":
        return cls(
            step=d.get("step", ""),
            description=d.get("description", ""),
            input_material_keys=list(d.get("input_material_keys", [])),
            at=d.get("at", ""),
        )


@dataclass
class TraceRecord:
    finding_id: str
    sources: List[SourceRef] = field(default_factory=list)
    processing: List[ProcessingStep] = field(default_factory=list)
    complete: bool = True
    gaps: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "finding_id": self.finding_id,
            "sources": [s.to_dict() for s in self.sources],
            "processing": [p.to_dict() for p in self.processing],
            "complete": self.complete,
            "gaps": self.gaps,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "TraceRecord":
        return cls(
            finding_id=d.get("finding_id", ""),
            sources=[SourceRef.from_dict(s) for s in d.get("sources", [])],
            processing=[ProcessingStep.from_dict(p) for p in d.get("processing", [])],
            complete=d.get("complete", True),
            gaps=list(d.get("gaps", [])),
        )


@dataclass
class RunManifest:
    run_id: str
    started_at: str
    finished_at: str
    input_dir: str
    output_dir: str
    material_fingerprints: Dict[str, str] = field(default_factory=dict)
    counts: Dict[str, int] = field(default_factory=dict)
    changed_findings: List[str] = field(default_factory=list)
    new_findings: List[str] = field(default_factory=list)
    resolved_findings: List[str] = field(default_factory=list)
    errors: List[ActionableError] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "run_id": self.run_id,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "input_dir": self.input_dir,
            "output_dir": self.output_dir,
            "material_fingerprints": self.material_fingerprints,
            "counts": self.counts,
            "changed_findings": self.changed_findings,
            "new_findings": self.new_findings,
            "resolved_findings": self.resolved_findings,
            "errors": [e.to_dict() for e in self.errors],
        }


@dataclass
class Report:
    run_id: str
    generated_at: str
    gate_decision: str
    summary: Dict[str, Any]
    findings: List[Finding] = field(default_factory=list)
    errors: List[ActionableError] = field(default_factory=list)
    manifest: Optional[RunManifest] = None

    def to_dict(self) -> dict:
        return {
            "run_id": self.run_id,
            "generated_at": self.generated_at,
            "gate_decision": self.gate_decision,
            "summary": self.summary,
            "findings": [f.to_dict() for f in self.findings],
            "errors": [e.to_dict() for e in self.errors],
            "manifest": self.manifest.to_dict() if self.manifest else None,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Report":
        return cls(
            run_id=d.get("run_id", ""),
            generated_at=d.get("generated_at", ""),
            gate_decision=d.get("gate_decision", ""),
            summary=dict(d.get("summary", {})),
            findings=[Finding.from_dict(f) for f in d.get("findings", [])],
            errors=[ActionableError.from_dict(e) for e in d.get("errors", [])],
            manifest=None,
        )


@dataclass
class HistoryEntry:
    run_id: str
    at: str
    action: str
    finding_id: str
    before: Optional[str] = None
    after: Optional[str] = None
    note: str = ""

    def to_dict(self) -> dict:
        return dataclasses.asdict(self)
