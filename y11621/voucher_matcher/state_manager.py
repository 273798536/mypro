import json
import os
from dataclasses import asdict
from datetime import datetime
from typing import List, Optional

from .models import (
    AppState, BankFlow, Invoice, Contract, MatchRecord, HistoryEntry,
    MatchStatus, DataSource
)

STATE_FILE = os.path.expanduser("~/.voucher_matcher_state.json")


class StateManager:
    def __init__(self, state_file: str = STATE_FILE):
        self.state_file = state_file
        self.state: AppState = AppState()
        self.load()

    def load(self) -> None:
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._deserialize(data)
            except (json.JSONDecodeError, KeyError):
                self.state = AppState()
        else:
            self.state = AppState()

    def save(self) -> None:
        self.state.last_updated = datetime.now().isoformat()
        os.makedirs(os.path.dirname(self.state_file), exist_ok=True)
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(self._serialize(), f, ensure_ascii=False, indent=2)

    def _serialize(self) -> dict:
        return {
            "bank_flows": [asdict(f) for f in self.state.bank_flows],
            "invoices": [asdict(i) for i in self.state.invoices],
            "contracts": [asdict(c) for c in self.state.contracts],
            "matches": [asdict(m) for m in self.state.matches],
            "history": [asdict(h) for h in self.state.history],
            "last_updated": self.state.last_updated,
        }

    def _deserialize(self, data: dict) -> None:
        self.state.bank_flows = [
            self._deserialize_bank_flow(f) for f in data.get("bank_flows", [])
        ]
        self.state.invoices = [
            self._deserialize_invoice(i) for i in data.get("invoices", [])
        ]
        self.state.contracts = [
            self._deserialize_contract(c) for c in data.get("contracts", [])
        ]
        self.state.matches = [
            self._deserialize_match(m) for m in data.get("matches", [])
        ]
        self.state.history = [
            self._deserialize_history(h) for h in data.get("history", [])
        ]
        self.state.last_updated = data.get("last_updated", datetime.now().isoformat())

    def _deserialize_bank_flow(self, data: dict) -> BankFlow:
        if isinstance(data.get("source"), str):
            data["source"] = DataSource(data["source"])
        return BankFlow(**data)

    def _deserialize_invoice(self, data: dict) -> Invoice:
        if isinstance(data.get("source"), str):
            data["source"] = DataSource(data["source"])
        return Invoice(**data)

    def _deserialize_contract(self, data: dict) -> Contract:
        if isinstance(data.get("source"), str):
            data["source"] = DataSource(data["source"])
        return Contract(**data)

    def _deserialize_match(self, data: dict) -> MatchRecord:
        if isinstance(data.get("status"), str):
            data["status"] = MatchStatus(data["status"])
        if data.get("sources") and isinstance(data["sources"], list):
            data["sources"] = [
                DataSource(s) if isinstance(s, str) else s
                for s in data["sources"]
            ]
        return MatchRecord(**data)

    def _deserialize_history(self, data: dict) -> HistoryEntry:
        if isinstance(data.get("source"), str):
            data["source"] = DataSource(data["source"])
        return HistoryEntry(**data)

    def add_bank_flow(self, flow: BankFlow) -> None:
        self.state.bank_flows.append(flow)
        self.save()

    def add_invoice(self, invoice: Invoice) -> None:
        self.state.invoices.append(invoice)
        self.save()

    def add_contract(self, contract: Contract) -> None:
        self.state.contracts.append(contract)
        self.save()

    def add_match(self, match: MatchRecord) -> None:
        self.state.matches.append(match)
        self.save()

    def update_match(self, match: MatchRecord) -> None:
        for i, m in enumerate(self.state.matches):
            if m.id == match.id:
                self.state.matches[i] = match
                break
        self.save()

    def add_history(self, entry: HistoryEntry) -> None:
        self.state.history.append(entry)
        self.save()

    def get_match_by_id(self, match_id: str) -> Optional[MatchRecord]:
        for m in self.state.matches:
            if m.id == match_id:
                return m
        return None

    def get_bank_flow_by_id(self, flow_id: str) -> Optional[BankFlow]:
        for f in self.state.bank_flows:
            if f.id == flow_id:
                return f
        return None

    def get_invoice_by_id(self, invoice_id: str) -> Optional[Invoice]:
        for i in self.state.invoices:
            if i.id == invoice_id:
                return i
        return None

    def get_contract_by_id(self, contract_id: str) -> Optional[Contract]:
        for c in self.state.contracts:
            if c.id == contract_id:
                return c
        return None

    def get_history_for_record(self, record_id: str) -> List[HistoryEntry]:
        return [h for h in self.state.history if h.record_id == record_id]

    def get_matches_by_status(self, status: str) -> List[MatchRecord]:
        return [m for m in self.state.matches if m.status.value == status]

    def clear_all(self) -> None:
        self.state = AppState()
        self.save()

    def clear_matches(self) -> None:
        self.state.matches = []
        self.state.history = []
        self.save()
