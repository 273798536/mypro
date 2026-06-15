import json
import os
from pathlib import Path
from typing import Optional, Union
from . import ProcessingState


DEFAULT_DATA_DIR = Path(__file__).parent.parent / "qinfang_data"
STATE_FILE = "processing_state.json"


class StateManager:
    def __init__(self, data_dir: Optional[Union[str, Path]] = None):
        if data_dir is None:
            self.data_dir = DEFAULT_DATA_DIR
        else:
            self.data_dir = Path(data_dir)
        self.state: ProcessingState = ProcessingState()
        self._ensure_data_dir()

    def _ensure_data_dir(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)

    @property
    def state_path(self) -> Path:
        return self.data_dir / STATE_FILE

    def save(self):
        with open(self.state_path, "w", encoding="utf-8") as f:
            json.dump(self.state.to_dict(), f, ensure_ascii=False, indent=2)

    def load(self) -> ProcessingState:
        if self.state_path.exists():
            with open(self.state_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.state = ProcessingState.from_dict(data)
        else:
            self.state = ProcessingState()
        return self.state

    def reset(self):
        self.state = ProcessingState()
        self.save()
