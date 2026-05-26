"""审计追踪模块 - 保留所有数据来源和修正痕迹"""

from __future__ import annotations

import json
import os
import hashlib
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any
from pathlib import Path


@dataclass
class AuditEntry:
    """单条审计记录"""
    timestamp: datetime
    action: str
    user: str
    details: Dict[str, Any]
    entry_hash: str = ""

    def __post_init__(self):
        if not self.entry_hash:
            self.entry_hash = self._calculate_hash()

    def _calculate_hash(self) -> str:
        """计算审计记录的哈希值，防止篡改"""
        data = json.dumps({
            "timestamp": self.timestamp.isoformat(),
            "action": self.action,
            "user": self.user,
            "details": self.details,
        }, sort_keys=True).encode('utf-8')
        return hashlib.sha256(data).hexdigest()[:16]

    def to_dict(self) -> Dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "action": self.action,
            "user": self.user,
            "details": self.details,
            "entry_hash": self.entry_hash,
        }


@dataclass
class ParameterVersion:
    """参数版本记录"""
    name: str
    version: str
    value: Any
    effective_from: datetime
    effective_to: Optional[datetime]
    reason: str = ""
    changed_by: str = ""

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "version": self.version,
            "value": self.value,
            "effective_from": self.effective_from.isoformat(),
            "effective_to": self.effective_to.isoformat() if self.effective_to else None,
            "reason": self.reason,
            "changed_by": self.changed_by,
        }


@dataclass
class CorrectionRecord:
    """修正记录 - 追踪每次数据修正"""
    correction_id: str
    timestamp: datetime
    field: str
    old_value: Any
    new_value: Any
    reason: str
    corrected_by: str
    trade_index: Optional[int] = None
    symbol: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "correction_id": self.correction_id,
            "timestamp": self.timestamp.isoformat(),
            "field": self.field,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "reason": self.reason,
            "corrected_by": self.corrected_by,
            "trade_index": self.trade_index,
            "symbol": self.symbol,
        }


class AuditTrail:
    """审计追踪管理器"""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.audit_file = os.path.join(output_dir, "audit_trail.jsonl")
        self.corrections_file = os.path.join(output_dir, "corrections.json")
        self.versions_file = os.path.join(output_dir, "parameter_versions.json")
        self.entries: List[AuditEntry] = []
        self.corrections: List[CorrectionRecord] = []
        self.parameter_versions: List[ParameterVersion] = []

        os.makedirs(output_dir, exist_ok=True)
        self._load_existing()

    def _load_existing(self):
        """加载已存在的审计记录"""
        if os.path.exists(self.audit_file):
            with open(self.audit_file, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        data = json.loads(line)
                        entry = AuditEntry(
                            timestamp=datetime.fromisoformat(data['timestamp']),
                            action=data['action'],
                            user=data['user'],
                            details=data['details'],
                            entry_hash=data.get('entry_hash', ''),
                        )
                        self.entries.append(entry)
                    except (json.JSONDecodeError, KeyError):
                        continue

        if os.path.exists(self.corrections_file):
            with open(self.corrections_file, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    for rec in data:
                        self.corrections.append(CorrectionRecord(
                            correction_id=rec['correction_id'],
                            timestamp=datetime.fromisoformat(rec['timestamp']),
                            field=rec['field'],
                            old_value=rec['old_value'],
                            new_value=rec['new_value'],
                            reason=rec['reason'],
                            corrected_by=rec['corrected_by'],
                            trade_index=rec.get('trade_index'),
                            symbol=rec.get('symbol'),
                        ))
                except (json.JSONDecodeError, KeyError):
                    pass

        if os.path.exists(self.versions_file):
            with open(self.versions_file, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    for ver in data:
                        self.parameter_versions.append(ParameterVersion(
                            name=ver['name'],
                            version=ver['version'],
                            value=ver['value'],
                            effective_from=datetime.fromisoformat(ver['effective_from']),
                            effective_to=datetime.fromisoformat(ver['effective_to']) if ver.get('effective_to') else None,
                            reason=ver.get('reason', ''),
                            changed_by=ver.get('changed_by', ''),
                        ))
                except (json.JSONDecodeError, KeyError):
                    pass

    def log_action(self, action: str, details: Dict[str, Any], user: str = "system") -> AuditEntry:
        """记录一个操作"""
        entry = AuditEntry(
            timestamp=datetime.now(),
            action=action,
            user=user,
            details=details,
        )
        self.entries.append(entry)
        self._append_audit_file(entry)
        return entry

    def _append_audit_file(self, entry: AuditEntry):
        """追加到审计文件"""
        with open(self.audit_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry.to_dict(), ensure_ascii=False) + '\n')

    def log_correction(
        self,
        field: str,
        old_value: Any,
        new_value: Any,
        reason: str,
        corrected_by: str = "system",
        trade_index: Optional[int] = None,
        symbol: Optional[str] = None,
    ) -> CorrectionRecord:
        """记录一次数据修正"""
        correction = CorrectionRecord(
            correction_id=f"CORR_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}",
            timestamp=datetime.now(),
            field=field,
            old_value=old_value,
            new_value=new_value,
            reason=reason,
            corrected_by=corrected_by,
            trade_index=trade_index,
            symbol=symbol,
        )
        self.corrections.append(correction)
        self._save_corrections()
        return correction

    def _save_corrections(self):
        """保存修正记录"""
        with open(self.corrections_file, 'w', encoding='utf-8') as f:
            json.dump([c.to_dict() for c in self.corrections], f, ensure_ascii=False, indent=2)

    def log_parameter_version(
        self,
        name: str,
        value: Any,
        version: Optional[str] = None,
        reason: str = "",
        changed_by: str = "system",
    ) -> ParameterVersion:
        """记录参数版本变更"""
        existing = [v for v in self.parameter_versions if v.name == name and v.effective_to is None]
        if existing:
            existing[0].effective_to = datetime.now()

        if version is None:
            version = f"v{len([v for v in self.parameter_versions if v.name == name]) + 1}"

        param_ver = ParameterVersion(
            name=name,
            version=version,
            value=value,
            effective_from=datetime.now(),
            effective_to=None,
            reason=reason,
            changed_by=changed_by,
        )
        self.parameter_versions.append(param_ver)
        self._save_versions()
        return param_ver

    def _save_versions(self):
        """保存参数版本"""
        with open(self.versions_file, 'w', encoding='utf-8') as f:
            json.dump([v.to_dict() for v in self.parameter_versions], f, ensure_ascii=False, indent=2)

    def get_summary(self) -> Dict:
        """获取审计追踪摘要"""
        return {
            "total_actions": len(self.entries),
            "total_corrections": len(self.corrections),
            "total_parameter_versions": len(self.parameter_versions),
            "actions_by_type": self._count_by_action(),
            "corrected_fields": self._count_corrected_fields(),
            "parameters_tracked": len(set(v.name for v in self.parameter_versions)),
        }

    def _count_by_action(self) -> Dict[str, int]:
        counts = {}
        for entry in self.entries:
            counts[entry.action] = counts.get(entry.action, 0) + 1
        return counts

    def _count_corrected_fields(self) -> Dict[str, int]:
        counts = {}
        for corr in self.corrections:
            counts[corr.field] = counts.get(corr.field, 0) + 1
        return counts

    def verify_integrity(self) -> List[Dict]:
        """验证审计记录完整性，检测是否被篡改"""
        violations = []
        for i, entry in enumerate(self.entries):
            expected_hash = AuditEntry(
                timestamp=entry.timestamp,
                action=entry.action,
                user=entry.user,
                details=entry.details,
            )._calculate_hash()
            if expected_hash != entry.entry_hash:
                violations.append({
                    "index": i,
                    "timestamp": entry.timestamp.isoformat(),
                    "action": entry.action,
                    "expected_hash": expected_hash,
                    "actual_hash": entry.entry_hash,
                    "issue": "哈希不匹配，记录可能被篡改",
                })
        return violations


def create_audit_trail(output_dir: str) -> AuditTrail:
    """创建审计追踪实例"""
    return AuditTrail(output_dir)
