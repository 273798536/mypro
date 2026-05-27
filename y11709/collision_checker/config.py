from __future__ import annotations

import json
import csv
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Set, Tuple, Dict, Optional


@dataclass
class LayerRule:
    layer_a: str
    layer_b: str
    can_collide: bool

    def to_tuple(self) -> Tuple[str, str]:
        return tuple(sorted([self.layer_a, self.layer_b]))


@dataclass
class ExceptionPair:
    id_a: str
    id_b: str
    reason: str = ""
    scene_id: str = ""

    def to_tuple(self) -> Tuple[str, str]:
        return tuple(sorted([self.id_a, self.id_b]))


@dataclass
class CheckerConfig:
    layer_rules: List[LayerRule] = field(default_factory=list)
    exception_pairs: List[ExceptionPair] = field(default_factory=list)
    source_history: Dict[str, List[str]] = field(default_factory=dict)

    def add_layer_rule(self, layer_a: str, layer_b: str, can_collide: bool):
        existing = None
        for rule in self.layer_rules:
            if rule.to_tuple() == tuple(sorted([layer_a, layer_b])):
                existing = rule
                break

        if existing:
            existing.can_collide = can_collide
        else:
            self.layer_rules.append(LayerRule(layer_a, layer_b, can_collide))

    def add_exception_pair(
        self, id_a: str, id_b: str, reason: str = "", scene_id: str = ""
    ):
        existing = None
        for pair in self.exception_pairs:
            if pair.to_tuple() == tuple(sorted([id_a, id_b])) and pair.scene_id == scene_id:
                existing = pair
                break

        if existing:
            existing.reason = reason
        else:
            self.exception_pairs.append(ExceptionPair(id_a, id_b, reason, scene_id))

    def get_layer_collision_matrix(self) -> Dict[Tuple[str, str], bool]:
        matrix = {}
        for rule in self.layer_rules:
            matrix[rule.to_tuple()] = rule.can_collide
        return matrix

    def get_exception_set(self, scene_id: Optional[str] = None) -> Set[Tuple[str, str]]:
        exceptions = set()
        for pair in self.exception_pairs:
            if scene_id is None or pair.scene_id == scene_id:
                exceptions.add(pair.to_tuple())
        return exceptions

    def add_source_history(self, source: str, note: str):
        if source not in self.source_history:
            self.source_history[source] = []
        self.source_history[source].append(note)

    def to_dict(self) -> dict:
        return {
            "layer_rules": [
                {
                    "layer_a": r.layer_a,
                    "layer_b": r.layer_b,
                    "can_collide": r.can_collide,
                }
                for r in self.layer_rules
            ],
            "exception_pairs": [
                {
                    "id_a": p.id_a,
                    "id_b": p.id_b,
                    "reason": p.reason,
                    "scene_id": p.scene_id,
                }
                for p in self.exception_pairs
            ],
            "source_history": self.source_history,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "CheckerConfig":
        config = cls()
        for r in data.get("layer_rules", []):
            config.add_layer_rule(r["layer_a"], r["layer_b"], r["can_collide"])
        for p in data.get("exception_pairs", []):
            config.add_exception_pair(
                p.get("id_a", ""),
                p.get("id_b", ""),
                p.get("reason", ""),
                p.get("scene_id", ""),
            )
        config.source_history = data.get("source_history", {})
        return config


def load_config_from_json(filepath: Path) -> CheckerConfig:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return CheckerConfig.from_dict(data)


def save_config_to_json(config: CheckerConfig, filepath: Path):
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(config.to_dict(), f, indent=2, ensure_ascii=False)


def load_exception_pairs_from_csv(filepath: Path) -> List[ExceptionPair]:
    pairs = []
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pairs.append(
                ExceptionPair(
                    id_a=row.get("id_a", ""),
                    id_b=row.get("id_b", ""),
                    reason=row.get("reason", ""),
                    scene_id=row.get("scene_id", ""),
                )
            )
    return pairs


def load_layer_rules_from_csv(filepath: Path) -> List[LayerRule]:
    rules = []
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rules.append(
                LayerRule(
                    layer_a=row.get("layer_a", ""),
                    layer_b=row.get("layer_b", ""),
                    can_collide=row.get("can_collide", "true").lower() == "true",
                )
            )
    return rules
