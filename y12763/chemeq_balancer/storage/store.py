"""
持久化存储层
============

默认使用 JSON 文件存储, 路径:
    - macOS/Linux: ~/.chemeq/store.json
    - Windows:     %APPDATA%/chemeq/store.json

也支持通过 set_default_storage_path() 指定自定义路径, 便于课题组共享。
"""

import os
import json
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Union

from ..models import DataStore, BatchReport, now_iso


def _default_path() -> Path:
    env_path = os.environ.get("CHEMEQ_STORE_PATH")
    if env_path:
        return Path(env_path).expanduser().resolve()
    home = Path.home()
    if os.name == "nt":
        base = Path(os.environ.get("APPDATA", home))
    else:
        base = home / ".config"
    return base / "chemeq" / "store.json"


_DEFAULT_PATH: Optional[Path] = None


def set_default_storage_path(path: Union[str, os.PathLike]) -> None:
    """设置全局默认存储路径"""
    global _DEFAULT_PATH
    _DEFAULT_PATH = Path(path).expanduser().resolve()


class StorageBackend(ABC):
    """存储后端抽象接口"""

    @abstractmethod
    def load(self) -> DataStore: ...

    @abstractmethod
    def save(self, store: DataStore) -> None: ...

    @abstractmethod
    def backup(self) -> str: ...


class JsonFileStorage(StorageBackend):
    """JSON 文件存储后端"""

    def __init__(self, path: Optional[Union[str, os.PathLike]] = None):
        if path is None:
            self.path = _DEFAULT_PATH or _default_path()
        else:
            self.path = Path(path).expanduser().resolve()

    def load(self) -> DataStore:
        if not self.path.exists():
            store = DataStore()
            self.save(store)
            return store
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                return DataStore.from_json(f.read())
        except (json.JSONDecodeError, KeyError, TypeError):
            backup = self.backup()
            store = DataStore()
            store.batches = []
            self.save(store)
            return store

    def save(self, store: DataStore) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        store.updated_at = now_iso()
        with open(self.path, "w", encoding="utf-8") as f:
            f.write(store.to_json(indent=2))

    def backup(self) -> str:
        if not self.path.exists():
            return ""
        backup_path = self.path.with_suffix(
            f".{now_iso().replace(':', '-').replace('.', '-')}.bak.json"
        )
        self.path.replace(backup_path)
        return str(backup_path)


_default_storage: Optional[JsonFileStorage] = None


def get_default_storage() -> JsonFileStorage:
    """获取全局默认存储实例"""
    global _default_storage
    if _default_storage is None:
        _default_storage = JsonFileStorage()
    return _default_storage
