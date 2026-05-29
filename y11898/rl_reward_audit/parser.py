import json
import csv
from typing import List, Dict, Any, Optional
from pathlib import Path

from .models import (
    Trajectory,
    Step,
    RewardItem,
    Action,
    ParsingResult,
    DataCorrection,
)


class TrajectoryParser:
    def __init__(self, auto_correct: bool = True, strict: bool = False):
        self.auto_correct = auto_correct
        self.strict = strict
        self.corrections: List[DataCorrection] = []
        self.errors: List[str] = []

    def parse_file(self, file_path: str) -> ParsingResult:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        self.corrections = []
        self.errors = []

        if path.suffix == ".json":
            return self._parse_json(path)
        elif path.suffix == ".csv":
            return self._parse_csv(path)
        else:
            raise ValueError(f"Unsupported file format: {path.suffix}")

    def _parse_json(self, path: Path) -> ParsingResult:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, list):
            return self._parse_trajectory_list(data)
        elif isinstance(data, dict):
            if "trajectories" in data:
                return self._parse_trajectory_list(data["trajectories"])
            else:
                return self._parse_trajectory_list([data])
        else:
            raise ValueError("Invalid JSON format")

    def _parse_csv(self, path: Path) -> ParsingResult:
        trajectories: Dict[str, Trajectory] = {}
        current_step_ids: Dict[str, int] = {}

        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                traj_id = row.get("trajectory_id", "default")

                if traj_id not in trajectories:
                    trajectories[traj_id] = Trajectory(
                        trajectory_id=traj_id,
                        metadata={},
                    )
                    current_step_ids[traj_id] = 0

                step = self._parse_step_from_csv_row(
                    row, traj_id, current_step_ids[traj_id]
                )
                trajectories[traj_id].steps.append(step)
                current_step_ids[traj_id] += 1

        return ParsingResult(
            trajectories=list(trajectories.values()),
            corrections=self.corrections,
            errors=self.errors,
        )

    def _parse_trajectory_list(self, data: List[Dict[str, Any]]) -> ParsingResult:
        trajectories = []

        for idx, traj_data in enumerate(data):
            traj_id = traj_data.get("trajectory_id", f"trajectory_{idx}")
            trajectory = Trajectory(trajectory_id=traj_id)
            trajectory.metadata = traj_data.get("metadata", {})

            steps_data = traj_data.get("steps", traj_data.get("transitions", []))
            for step_idx, step_data in enumerate(steps_data):
                step = self._parse_step(step_data, traj_id, step_idx)
                trajectory.steps.append(step)

            trajectories.append(trajectory)

        return ParsingResult(
            trajectories=trajectories,
            corrections=self.corrections,
            errors=self.errors,
        )

    def _parse_step(
        self, step_data: Dict[str, Any], traj_id: str, step_idx: int
    ) -> Step:
        step_id = step_data.get("step_id", step_idx)
        if step_id != step_idx:
            self._add_correction(
                field_name="step_id",
                step_id=step_idx,
                correction_type="field_inferred",
                message=f"步骤 {step_idx}: step_id 不连续，使用索引值",
                old_value=step_data.get("step_id"),
                new_value=step_idx,
            )
            step_id = step_idx

        state = self._get_field(
            step_data,
            "state",
            step_idx,
            default={},
            required=False,
        )

        action = self._parse_action(step_data, step_idx)
        reward_items = self._parse_reward_items(step_data, step_idx)
        done = self._get_field(
            step_data, "done", step_idx, default=False, required=False
        )

        if isinstance(done, str):
            done = done.lower() in ("true", "1", "yes")

        timestamp = step_data.get("timestamp")

        return Step(
            step_id=step_id,
            state=state,
            action=action,
            reward_items=reward_items,
            done=done,
            timestamp=timestamp,
            raw_data=step_data,
        )

    def _parse_step_from_csv_row(
        self, row: Dict[str, str], traj_id: str, step_idx: int
    ) -> Step:
        step_id = step_idx

        state = {}
        for key, value in row.items():
            if key.startswith("state_"):
                state[key[6:]] = self._parse_value(value)

        action_name = row.get("action")
        action_params = {}
        for key, value in row.items():
            if key.startswith("action_param_"):
                action_params[key[13:]] = self._parse_value(value)

        action = Action(name=action_name) if action_name else None
        if action:
            action.parameters = action_params

        reward_items = []
        reward_total = float(row.get("reward", 0)) if row.get("reward") else 0.0

        if reward_total != 0:
            reward_items.append(
                RewardItem(name="total_reward", value=reward_total, weight=1.0)
            )

        done = row.get("done", "False").lower() in ("true", "1", "yes")

        return Step(
            step_id=step_id,
            state=state,
            action=action,
            reward_items=reward_items,
            done=done,
            raw_data=row,
        )

    def _parse_action(
        self, step_data: Dict[str, Any], step_idx: int
    ) -> Optional[Action]:
        action_data = step_data.get("action")

        if action_data is None:
            if self.strict:
                self._add_error(f"步骤 {step_idx}: 缺少 action 字段")
            else:
                self._add_correction(
                    field_name="action",
                    step_id=step_idx,
                    correction_type="missing_field",
                    message=f"步骤 {step_idx}: action 字段缺失，设为 None",
                    old_value=None,
                    new_value=None,
                )
            return None

        if isinstance(action_data, str):
            return Action(name=action_data, parameters={})
        elif isinstance(action_data, dict):
            return Action(
                name=action_data.get("name", "unknown"),
                parameters=action_data.get("parameters", {}),
            )
        else:
            self._add_correction(
                field_name="action",
                step_id=step_idx,
                correction_type="type_conversion",
                message=f"步骤 {step_idx}: action 格式异常，转换为默认格式",
                old_value=str(action_data),
            )
            return Action(name=str(action_data), parameters={})

    def _parse_reward_items(
        self, step_data: Dict[str, Any], step_idx: int
    ) -> List[RewardItem]:
        reward_items = []

        if "reward_items" in step_data:
            items_data = step_data["reward_items"]
            if isinstance(items_data, list):
                for idx, item_data in enumerate(items_data):
                    reward_item = self._parse_reward_item(item_data, step_idx, idx)
                    if reward_item:
                        reward_items.append(reward_item)
            elif isinstance(items_data, dict):
                for name, value in items_data.items():
                    reward_items.append(
                        RewardItem(
                            name=name,
                            value=float(value),
                            weight=1.0,
                        )
                    )
        elif "rewards" in step_data:
            rewards_data = step_data["rewards"]
            if isinstance(rewards_data, dict):
                for name, value in rewards_data.items():
                    reward_items.append(
                        RewardItem(
                            name=name,
                            value=float(value),
                            weight=1.0,
                        )
                    )
        elif "reward" in step_data:
            reward_value = step_data["reward"]
            if isinstance(reward_value, (int, float)):
                reward_items.append(
                    RewardItem(
                        name="total_reward",
                        value=float(reward_value),
                        weight=1.0,
                    )
                )
            else:
                self._add_correction(
                    field_name="reward",
                    step_id=step_idx,
                    correction_type="type_conversion",
                    message=f"步骤 {step_idx}: reward 类型异常，设为 0",
                    old_value=str(reward_value),
                    new_value=0,
                )
        else:
            if not self.strict:
                self._add_correction(
                    field_name="reward",
                    step_id=step_idx,
                    correction_type="missing_field",
                    message=f"步骤 {step_idx}: 缺少奖励字段，设为 0",
                    old_value=None,
                    new_value=0,
                )

        return reward_items

    def _parse_reward_item(
        self, item_data: Any, step_idx: int, item_idx: int
    ) -> Optional[RewardItem]:
        if isinstance(item_data, dict):
            name = item_data.get("name", f"reward_{item_idx}")
            value = item_data.get("value", 0.0)
            weight = item_data.get("weight", 1.0)

            try:
                value = float(value)
                weight = float(weight)
            except (TypeError, ValueError):
                self._add_correction(
                    field_name=f"reward_items[{item_idx}]",
                    step_id=step_idx,
                    correction_type="type_conversion",
                    message=f"步骤 {step_idx}: 奖励项 {item_idx} 数值异常",
                    old_value=str(value),
                    new_value=0,
                )
                value = 0.0

            return RewardItem(
                name=name,
                value=value,
                weight=weight,
                metadata={k: v for k, v in item_data.items() if k not in ("name", "value", "weight")},
            )
        else:
            self._add_correction(
                field_name=f"reward_items[{item_idx}]",
                step_id=step_idx,
                correction_type="format_error",
                message=f"步骤 {step_idx}: 奖励项 {item_idx} 格式错误，跳过",
            )
            return None

    def _get_field(
        self,
        data: Dict[str, Any],
        field_name: str,
        step_idx: int,
        default: Any = None,
        required: bool = False,
    ) -> Any:
        if field_name in data:
            return data[field_name]

        if required:
            if self.strict:
                self._add_error(f"步骤 {step_idx}: 缺少必需字段 {field_name}")
            else:
                self._add_correction(
                    field_name=field_name,
                    step_id=step_idx,
                    correction_type="missing_field",
                    message=f"步骤 {step_idx}: 字段 {field_name} 缺失，使用默认值",
                    old_value=None,
                    new_value=default,
                )

        return default

    def _parse_value(self, value_str: str) -> Any:
        try:
            return int(value_str)
        except ValueError:
            pass
        try:
            return float(value_str)
        except ValueError:
            pass
        if value_str.lower() in ("true", "false"):
            return value_str.lower() == "true"
        return value_str

    def _add_correction(
        self,
        field_name: str,
        step_id: Optional[int],
        correction_type: str,
        message: str,
        old_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
    ):
        if self.auto_correct:
            self.corrections.append(
                DataCorrection(
                    field_name=field_name,
                    step_id=step_id,
                    correction_type=correction_type,
                    message=message,
                    old_value=old_value,
                    new_value=new_value,
                )
            )

    def _add_error(self, message: str):
        self.errors.append(message)
