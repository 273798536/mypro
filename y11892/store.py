from datetime import datetime
from typing import Dict, List, Optional
from models import (
    CallRecord, Agent, DispatchStrategyConfig,
    PendingConfirmationItem, StrategySupplementLog
)


class DataStore:
    def __init__(self):
        self.call_records: Dict[str, CallRecord] = {}
        self.agents: Dict[str, Agent] = {}
        self.strategies: Dict[str, DispatchStrategyConfig] = {}
        self.pending_confirmations: Dict[str, PendingConfirmationItem] = {}
        self.strategy_supplement_logs: List[StrategySupplementLog] = []
        self.data_version: str = "1.0.0"

    def add_call_record(self, call: CallRecord) -> None:
        self.call_records[call.call_id] = call

    def get_call_record(self, call_id: str) -> Optional[CallRecord]:
        return self.call_records.get(call_id)

    def get_all_calls(self) -> List[CallRecord]:
        return list(self.call_records.values())

    def add_agent(self, agent: Agent) -> None:
        self.agents[agent.agent_id] = agent

    def get_agent(self, agent_id: str) -> Optional[Agent]:
        return self.agents.get(agent_id)

    def get_all_agents(self) -> List[Agent]:
        return list(self.agents.values())

    def add_strategy(self, strategy: DispatchStrategyConfig) -> None:
        self.strategies[strategy.strategy_id] = strategy

    def get_strategy(self, strategy_id: str) -> Optional[DispatchStrategyConfig]:
        return self.strategies.get(strategy_id)

    def get_all_strategies(self) -> List[DispatchStrategyConfig]:
        return list(self.strategies.values())

    def get_active_strategy(self) -> Optional[DispatchStrategyConfig]:
        for s in self.strategies.values():
            if s.is_active:
                return s
        return None

    def add_pending_confirmation(self, item: PendingConfirmationItem) -> None:
        self.pending_confirmations[item.item_id] = item

    def get_pending_confirmations(self, confirmed: Optional[bool] = None) -> List[PendingConfirmationItem]:
        items = list(self.pending_confirmations.values())
        if confirmed is not None:
            items = [i for i in items if i.is_confirmed == confirmed]
        return items

    def confirm_pending_item(self, item_id: str, confirmed_by: str) -> bool:
        item = self.pending_confirmations.get(item_id)
        if item:
            item.is_confirmed = True
            item.confirmed_by = confirmed_by
            item.confirmed_time = datetime.now()
            return True
        return False

    def add_strategy_supplement_log(self, log: StrategySupplementLog) -> None:
        self.strategy_supplement_logs.append(log)
        self.data_version = f"{self.data_version.rsplit('.', 1)[0]}.{int(self.data_version.rsplit('.', 1)[1]) + 1}"

    def get_supplement_logs(self) -> List[StrategySupplementLog]:
        return self.strategy_supplement_logs

    def update_call_strategy(self, call_id: str, strategy: DispatchStrategyConfig) -> bool:
        call = self.call_records.get(call_id)
        if call:
            original_strategy = call.dispatch_strategy_used
            call.dispatch_strategy_used = strategy.strategy_type
            call.audit_log.append({
                "action": "strategy_updated",
                "original": original_strategy.value if original_strategy else None,
                "new": strategy.strategy_type.value,
                "strategy_id": strategy.strategy_id,
                "time": datetime.now().isoformat()
            })
            return True
        return False


store = DataStore()
