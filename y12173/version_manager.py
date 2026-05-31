"""版本管理模块 - 处理样例导入和版本对比"""

import json
import hashlib
from pathlib import Path
from datetime import datetime


class VersionManager:
    def __init__(self):
        self.versions_dir = Path("versions")
        self.versions_dir.mkdir(exist_ok=True)
        self.index_file = self.versions_dir / "index.json"
        self._load_index()

    def _load_index(self):
        if self.index_file.exists():
            self.index = json.loads(self.index_file.read_text())
        else:
            self.index = []

    def _save_index(self):
        self.index_file.write_text(json.dumps(self.index, ensure_ascii=False, indent=2))

    def _generate_id(self, content):
        return hashlib.sha256(content.encode()).hexdigest()[:8]

    def import_file(self, file_path, name):
        content = Path(file_path).read_text()
        version_id = self._generate_id(content + datetime.now().isoformat())

        version = {
            "id": version_id,
            "name": name,
            "timestamp": datetime.now().isoformat(),
            "line_count": len([l for l in content.split("\n") if l.strip()]),
            "fix_count": 0,
            "source": file_path
        }

        version_file = self.versions_dir / f"{version_id}.txt"
        version_file.write_text(content)

        self.index.insert(0, version)
        self._save_index()

        version["content"] = content
        return version

    def get_version(self, name_or_id):
        for v in self.index:
            if v["id"] == name_or_id or v["name"] == name_or_id:
                return self._load_content(v)
        return None

    def get_latest(self):
        if not self.index:
            return None
        return self._load_content(self.index[0])

    def _load_content(self, version):
        version_file = self.versions_dir / f"{version['id']}.txt"
        version["content"] = version_file.read_text()
        from rhyme_checker import RhymeChecker
        checker = RhymeChecker()
        version["fix_count"] = len(checker.get_fixes(version["id"]))
        return version

    def get_history(self):
        return self.index

    def diff(self, v1, v2):
        lines1 = v1["content"].split("\n")
        lines2 = v2["content"].split("\n")

        diff = []
        max_lines = max(len(lines1), len(lines2))

        for i in range(max_lines):
            l1 = lines1[i] if i < len(lines1) else ""
            l2 = lines2[i] if i < len(lines2) else ""

            if l1 != l2:
                if not l1 and l2:
                    diff.append({
                        "type": "新增",
                        "line_num": i + 1,
                        "new": l2
                    })
                elif l1 and not l2:
                    diff.append({
                        "type": "删除",
                        "line_num": i + 1,
                        "old": l1
                    })
                else:
                    diff.append({
                        "type": "修改",
                        "line_num": i + 1,
                        "old": l1,
                        "new": l2
                    })

        return diff

    def update_fix_count(self, version_id, count):
        for v in self.index:
            if v["id"] == version_id:
                v["fix_count"] = count
                self._save_index()
                break
