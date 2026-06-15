from typing import Optional, Dict, List
from datetime import datetime
import json
import os
import uuid

from .models import ReviewResult, AudioFolder


class ReviewStore:
    def __init__(self, storage_path: str = "./data/reviews"):
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)
        self._index_path = os.path.join(storage_path, "index.json")
        self._load_index()

    def _load_index(self):
        if os.path.exists(self._index_path):
            with open(self._index_path, 'r', encoding='utf-8') as f:
                self._index = json.load(f)
        else:
            self._index = {}

    def _save_index(self):
        with open(self._index_path, 'w', encoding='utf-8') as f:
            json.dump(self._index, f, ensure_ascii=False, indent=2, default=str)

    def save(self, result: ReviewResult) -> None:
        review_path = os.path.join(self.storage_path, f"{result.review_id}.json")
        with open(review_path, 'w', encoding='utf-8') as f:
            json.dump(result.model_dump(), f, ensure_ascii=False, indent=2, default=str)

        self._index[result.review_id] = {
            "review_time": result.review_time.isoformat(),
            "status": result.status,
            "folder_path": result.folder_path,
            "annotation": result.annotation,
            "previous_review_id": result.previous_review_id,
            "delivery_list_version": result.delivery_list_version,
            "has_anomalies": len(result.anomalies) > 0
        }
        self._save_index()

    def get(self, review_id: str) -> Optional[ReviewResult]:
        review_path = os.path.join(self.storage_path, f"{review_id}.json")
        if not os.path.exists(review_path):
            return None
        with open(review_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return ReviewResult(**data)

    def list_by_folder(self, folder_path: str) -> List[Dict]:
        results = []
        for rid, info in self._index.items():
            if info["folder_path"] == folder_path:
                results.append({"review_id": rid, **info})
        results.sort(key=lambda x: x["review_time"], reverse=True)
        return results

    def get_previous(self, folder_path: str, exclude_id: str) -> Optional[str]:
        history = self.list_by_folder(folder_path)
        for h in history:
            if h["review_id"] != exclude_id:
                return h["review_id"]
        return None

    def get_index(self) -> Dict:
        return self._index


class FolderStore:
    def __init__(self, storage_path: str = "./data/folders"):
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)

    def save(self, folder: AudioFolder) -> None:
        folder_key = folder.folder_name.replace('/', '_')
        folder_path = os.path.join(self.storage_path, f"{folder_key}.json")
        with open(folder_path, 'w', encoding='utf-8') as f:
            json.dump(folder.model_dump(), f, ensure_ascii=False, indent=2, default=str)

    def get(self, folder_name: str) -> Optional[AudioFolder]:
        folder_key = folder_name.replace('/', '_')
        folder_path = os.path.join(self.storage_path, f"{folder_key}.json")
        if not os.path.exists(folder_path):
            return None
        with open(folder_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return AudioFolder(**data)


review_store = ReviewStore()
folder_store = FolderStore()
