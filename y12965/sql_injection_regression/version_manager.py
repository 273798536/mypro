import hashlib
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Tuple
from .config import RunConfig, SourceRef
from .models import MaterialVersion, MaterialType


class VersionManager:
    def __init__(self, config: RunConfig):
        self.config = config
        self._state_dir = config.output_dir / ".sql_regression_state"
        self._materials_dir = self._state_dir / "materials"
        self._versions_file = self._state_dir / "versions.json"
        self._idempotency_file = self._state_dir / "idempotency.json"

    def ensure_dirs(self):
        self._state_dir.mkdir(parents=True, exist_ok=True)
        self._materials_dir.mkdir(parents=True, exist_ok=True)
        if not self._versions_file.exists():
            self._versions_file.write_text(json.dumps([], indent=2, ensure_ascii=False))
        if not self._idempotency_file.exists():
            self._idempotency_file.write_text(json.dumps({}, indent=2, ensure_ascii=False))

    def _compute_file_hash(self, file_path: Path) -> str:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                hasher.update(chunk)
        return hasher.hexdigest()

    def _compute_content_hash(self, content: str) -> str:
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def _load_versions(self) -> List[MaterialVersion]:
        if not self._versions_file.exists():
            return []
        data = json.loads(self._versions_file.read_text(encoding="utf-8"))
        return [MaterialVersion(**item) for item in data]

    def _save_versions(self, versions: List[MaterialVersion]):
        data = [v.model_dump(mode="json") for v in versions]
        self._versions_file.write_text(json.dumps(data, indent=2, ensure_ascii=False))

    def _load_idempotency_map(self) -> Dict[str, str]:
        if not self._idempotency_file.exists():
            return {}
        return json.loads(self._idempotency_file.read_text(encoding="utf-8"))

    def _save_idempotency_map(self, idempotency_map: Dict[str, str]):
        self._idempotency_file.write_text(
            json.dumps(idempotency_map, indent=2, ensure_ascii=False)
        )

    def register_material(
        self,
        file_path: Path,
        material_type: MaterialType,
        source_ref: SourceRef,
        metadata: Optional[Dict] = None,
        content_override: Optional[str] = None,
    ) -> Tuple[MaterialVersion, bool]:
        content_hash = (
            self._compute_content_hash(content_override)
            if content_override is not None
            else self._compute_file_hash(file_path)
        )

        idempotency_map = self._load_idempotency_map()
        cache_key = f"{material_type.value}:{file_path.name}:{content_hash}"

        if not self.config.force_reimport and cache_key in idempotency_map:
            existing_version_id = idempotency_map[cache_key]
            versions = self._load_versions()
            for v in versions:
                if v.version_id == existing_version_id:
                    return v, False

        version_id = f"mat_{uuid.uuid4().hex[:12]}"
        stored_path = self._materials_dir / f"{version_id}_{file_path.name}"

        if content_override is not None:
            stored_path.write_text(content_override, encoding="utf-8")
        else:
            stored_path.write_bytes(file_path.read_bytes())

        version = MaterialVersion(
            version_id=version_id,
            material_hash=content_hash,
            file_name=file_path.name,
            imported_at=datetime.now(),
            material_type=material_type,
            source_ref=source_ref,
            metadata=metadata or {},
        )

        versions = self._load_versions()
        versions.append(version)
        self._save_versions(versions)

        idempotency_map[cache_key] = version_id
        self._save_idempotency_map(idempotency_map)

        return version, True

    def list_all_versions(self) -> List[MaterialVersion]:
        return sorted(
            self._load_versions(),
            key=lambda v: v.imported_at,
            reverse=True,
        )

    def get_version(self, version_id: str) -> Optional[MaterialVersion]:
        for v in self._load_versions():
            if v.version_id == version_id:
                return v
        return None

    def get_material_content(self, version_id: str) -> Optional[str]:
        version = self.get_version(version_id)
        if not version:
            return None

        stored_path = self._materials_dir / f"{version_id}_{version.file_name}"
        if stored_path.exists():
            return stored_path.read_text(encoding="utf-8", errors="replace")
        return None

    def get_material_path(self, version_id: str) -> Optional[Path]:
        version = self.get_version(version_id)
        if not version:
            return None

        stored_path = self._materials_dir / f"{version_id}_{version.file_name}"
        return stored_path if stored_path.exists() else None

    def find_versions_by_type(self, material_type: MaterialType) -> List[MaterialVersion]:
        return [v for v in self._load_versions() if v.material_type == material_type]

    def find_version_by_file(self, file_name: str) -> Optional[MaterialVersion]:
        versions = self._load_versions()
        for v in sorted(versions, key=lambda x: x.imported_at, reverse=True):
            if v.file_name == file_name:
                return v
        return None

    def check_idempotency(self, file_path: Path, material_type: MaterialType) -> Optional[MaterialVersion]:
        content_hash = self._compute_file_hash(file_path)
        cache_key = f"{material_type.value}:{file_path.name}:{content_hash}"
        idempotency_map = self._load_idempotency_map()

        if cache_key in idempotency_map:
            return self.get_version(idempotency_map[cache_key])
        return None

    def create_source_ref(
        self,
        file_path: Path,
        line_number: Optional[int] = None,
        sheet_name: Optional[str] = None,
        image_name: Optional[str] = None,
        note: Optional[str] = None,
        raw_content: Optional[str] = None,
    ) -> SourceRef:
        return SourceRef(
            file_name=file_path.name,
            line_number=line_number,
            sheet_name=sheet_name,
            image_name=image_name,
            note=note,
            raw_content=raw_content,
        )
