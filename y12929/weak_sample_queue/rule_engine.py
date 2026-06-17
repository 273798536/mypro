import json
import hashlib
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

from .config import (
    RULES_FILE,
    REPLAY_LOG,
    GRAYSCALE_PASS_THRESHOLD,
    GRAYSCALE_REVIEW_THRESHOLD,
    MAX_TEXT_LENGTH,
)
from .sample_processor import WeakSample


@dataclass
class SafetyRule:
    rule_id: str
    name: str
    description: str
    rule_type: str
    pattern: str = ""
    weight: float = 0.0
    block_truncation: bool = False
    active: bool = True
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SafetyRule":
        return cls(**data)


class RuleEngine:
    def __init__(
        self,
        rules_file: Path = RULES_FILE,
        replay_log: Path = REPLAY_LOG,
        pass_threshold: float = GRAYSCALE_PASS_THRESHOLD,
        review_threshold: float = GRAYSCALE_REVIEW_THRESHOLD,
    ):
        self.rules_file = rules_file
        self.replay_log = replay_log
        self.pass_threshold = pass_threshold
        self.review_threshold = review_threshold
        self.rules_file.parent.mkdir(parents=True, exist_ok=True)
        self.replay_log.parent.mkdir(parents=True, exist_ok=True)

        if not self.rules_file.exists():
            self._init_default_rules()
        if not self.replay_log.exists():
            self._write_replay([])

    def _init_default_rules(self) -> None:
        defaults = [
            SafetyRule(
                rule_id="RULE-001",
                name="长文本截断拦截",
                description="样本文本超过最大长度阈值时进入人工审核，避免截断导致语义丢失",
                rule_type="length",
                pattern=str(MAX_TEXT_LENGTH),
                weight=-0.5,
                block_truncation=True,
                active=True,
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
            ),
            SafetyRule(
                rule_id="RULE-002",
                name="敏感词初筛",
                description="命中敏感词列表的样本降低灰度评分",
                rule_type="keyword",
                pattern="违规,赌博,色情",
                weight=-0.3,
                active=True,
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
            ),
            SafetyRule(
                rule_id="RULE-003",
                name="来源可信度加权",
                description="高可信来源样本自动提升灰度评分",
                rule_type="source",
                pattern="verified_partner,internal_tagging",
                weight=0.2,
                active=True,
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
            ),
        ]
        self._write_rules([r.to_dict() for r in defaults])

    def _read_rules(self) -> List[Dict[str, Any]]:
        with open(self.rules_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_rules(self, data: List[Dict[str, Any]]) -> None:
        with open(self.rules_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _read_replay(self) -> List[Dict[str, Any]]:
        with open(self.replay_log, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_replay(self, data: List[Dict[str, Any]]) -> None:
        with open(self.replay_log, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def list_rules(self) -> List[SafetyRule]:
        return [SafetyRule.from_dict(d) for d in self._read_rules()]

    def add_rule(self, rule: SafetyRule) -> SafetyRule:
        now = datetime.now().isoformat()
        rule.created_at = now
        rule.updated_at = now
        if not rule.rule_id:
            rule.rule_id = "RULE-" + hashlib.md5(now.encode()).hexdigest()[:6].upper()
        rules = self._read_rules()
        rules.append(rule.to_dict())
        self._write_rules(rules)
        return rule

    def update_rule(self, rule_id: str, updates: Dict[str, Any]) -> Optional[SafetyRule]:
        rules = self._read_rules()
        for i, r in enumerate(rules):
            if r["rule_id"] == rule_id:
                r.update(updates)
                r["updated_at"] = datetime.now().isoformat()
                rules[i] = r
                self._write_rules(rules)
                return SafetyRule.from_dict(r)
        return None

    def is_truncation_allowed(self, sample: WeakSample) -> bool:
        for rule in self.list_rules():
            if rule.active and rule.rule_type == "length" and rule.block_truncation:
                if len(sample.text) > int(rule.pattern):
                    return False
        return True

    def evaluate(self, sample: WeakSample) -> Dict[str, Any]:
        hits: List[Dict[str, Any]] = []
        evidence: List[str] = []
        base_score = 0.5

        for rule in self.list_rules():
            if not rule.active:
                continue

            hit = self._check_rule(rule, sample)
            if hit:
                hits.append({
                    "rule_id": rule.rule_id,
                    "rule_name": rule.name,
                    "weight": rule.weight,
                    "detail": hit,
                })
                base_score += rule.weight
                evidence.append(f"[{rule.rule_id}] {rule.name}: {hit} (权重 {rule.weight:+.2f})")

        base_score = max(0.0, min(1.0, base_score))

        return {
            "hits": hits,
            "grayscale_score": round(base_score, 4),
            "evidence": evidence,
        }

    def _check_rule(self, rule: SafetyRule, sample: WeakSample) -> Optional[str]:
        if rule.rule_type == "length":
            try:
                limit = int(rule.pattern)
                if len(sample.text) > limit:
                    return f"文本长度 {len(sample.text)} 超过阈值 {limit}"
            except ValueError:
                return None
        elif rule.rule_type == "keyword":
            keywords = [k.strip() for k in rule.pattern.split(",") if k.strip()]
            hit_words = [k for k in keywords if k in sample.text]
            if hit_words:
                return f"命中敏感词: {', '.join(hit_words)}"
        elif rule.rule_type == "source":
            trusted = [s.strip() for s in rule.pattern.split(",") if s.strip()]
            if sample.source in trusted:
                return f"来源 {sample.source} 属于可信白名单"
        return None

    def replay_evaluation(self, samples: List[WeakSample]) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        timestamp = datetime.now().isoformat()

        for sample in samples:
            before_score = sample.grayscale_score
            before_status = sample.status
            new_eval = self.evaluate(sample)
            delta = new_eval["grayscale_score"] - before_score

            results.append({
                "sample_id": sample.sample_id,
                "before_score": before_score,
                "after_score": new_eval["grayscale_score"],
                "score_delta": round(delta, 4),
                "before_status": before_status,
                "new_hits": new_eval["hits"],
                "new_evidence": new_eval["evidence"],
            })

        log_entry = {
            "timestamp": timestamp,
            "rules_snapshot": [r.to_dict() for r in self.list_rules()],
            "results": results,
        }
        replay_logs = self._read_replay()
        replay_logs.append(log_entry)
        self._write_replay(replay_logs)

        return results

    def list_replay_logs(self, limit: int = 10) -> List[Dict[str, Any]]:
        logs = self._read_replay()
        return logs[-limit:]
