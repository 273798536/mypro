import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from .models import PromptVersion


class PromptVersionImporter:
    def __init__(self, storage_dir: Optional[str] = None):
        if storage_dir is None:
            storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "versions")
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.versions: Dict[str, PromptVersion] = {}
        self._load_existing_versions()

    def _load_existing_versions(self) -> None:
        for file_path in self.storage_dir.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                version = PromptVersion(**data)
                self.versions[version.version_id] = version
            except Exception:
                continue

    def import_from_dict(self, data: Dict[str, Any]) -> PromptVersion:
        if "version_id" not in data or not data["version_id"]:
            data["version_id"] = f"v_{uuid.uuid4().hex[:8]}"
        if "created_at" not in data:
            data["created_at"] = datetime.now()
        elif isinstance(data["created_at"], str):
            data["created_at"] = datetime.fromisoformat(data["created_at"])

        version = PromptVersion(**data)
        self.versions[version.version_id] = version
        self._save_version(version)
        return version

    def import_from_json(self, file_path: str) -> List[PromptVersion]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"提示词版本文件不存在: {file_path}")

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, list):
            return [self.import_from_dict(item) for item in data]
        else:
            return [self.import_from_dict(data)]

    def import_from_text(self, prompt_text: str, version_name: str,
                         system_prompt: Optional[str] = None,
                         description: Optional[str] = None,
                         created_by: str = "import") -> PromptVersion:
        version_data = {
            "version_id": f"v_{uuid.uuid4().hex[:8]}",
            "version_name": version_name,
            "prompt_template": prompt_text,
            "system_prompt": system_prompt,
            "description": description,
            "created_by": created_by,
            "created_at": datetime.now(),
        }
        return self.import_from_dict(version_data)

    def _save_version(self, version: PromptVersion) -> None:
        file_path = self.storage_dir / f"{version.version_id}.json"
        data = version.model_dump()
        data["created_at"] = data["created_at"].isoformat()
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def get_version(self, version_id: str) -> Optional[PromptVersion]:
        return self.versions.get(version_id)

    def list_versions(self) -> List[PromptVersion]:
        return sorted(self.versions.values(), key=lambda v: v.created_at, reverse=True)

    def get_version_diff(self, version_id_1: str, version_id_2: str) -> Dict[str, Any]:
        v1 = self.get_version(version_id_1)
        v2 = self.get_version(version_id_2)

        if not v1 or not v2:
            raise ValueError("指定的版本不存在")

        changes = {
            "prompt_template_changed": v1.prompt_template != v2.prompt_template,
            "system_prompt_changed": v1.system_prompt != v2.system_prompt,
            "old_version": v1.model_dump(),
            "new_version": v2.model_dump(),
        }

        if v1.prompt_template != v2.prompt_template:
            changes["prompt_diff"] = {
                "old_length": len(v1.prompt_template),
                "new_length": len(v2.prompt_template),
                "length_change": len(v2.prompt_template) - len(v1.prompt_template),
            }

        return changes

    def delete_version(self, version_id: str) -> bool:
        if version_id in self.versions:
            del self.versions[version_id]
            file_path = self.storage_dir / f"{version_id}.json"
            if file_path.exists():
                file_path.unlink()
            return True
        return False
