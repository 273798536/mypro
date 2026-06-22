import json
import os
import copy
from datetime import datetime


class RecordStatus:
    """记录状态枚举（用字符串比用数字好读，月底看也懂）"""
    ACTIVE = "active"          # 正常在用的
    WITHDRAWN = "withdrawn"    # 撤回的——做错了，撤回来，但留个底
    DRAFT = "draft"            # 草稿/临时备注——还没定稿
    LEGACY = "legacy"          # 旧版——以前的答案，现在不用了但还要留着
    SUPERSEDED = "superseded"  # 被新版本取代的


class DataStore:
    """课堂验算数据存储

    设计思路：
    - 每条记录都有版本号，改了就升版本，旧的不删
    - 撤回的记录打个标记，不会出现在正常列表里，但能查到
    - 临时备注（草稿）可以随手写，不影响正式记录
    - 所有改动都留时间戳，谁什么时候改的一清二楚

    数据结构（每条记录）:
    {
        "id": "唯一标识",
        "version": 2,
        "status": "active",
        "title": "题目名称",
        "equation": "y' = ...",
        "initial_condition": {"t0": 0, "y0": 1},
        "t_span": [0, 5],
        "method": "rk4",
        "dt": 0.01,
        "result": {...},
        "notes": "临时备注内容",
        "withdrawn_reason": "撤回原因（如果撤回了）",
        "created_at": "2024-01-01T10:00:00",
        "updated_at": "2024-01-01T11:00:00",
        "parent_id": "上一版的id（如果是改出来的）",
    }
    """

    def __init__(self, filepath=None):
        self.filepath = filepath or "classroom_records.json"
        self.records = []
        if os.path.exists(self.filepath):
            self.load()

    def load(self):
        """从 JSON 文件加载数据"""
        with open(self.filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.records = data.get("records", [])
        return self

    def save(self):
        """保存到 JSON 文件"""
        data = {
            "version": 1,
            "exported_at": datetime.now().isoformat(),
            "records": self.records,
        }
        with open(self.filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return self

    def add_record(self, record_data):
        """新增一条记录

        自动生成 id、创建时间、版本号
        """
        now = datetime.now().isoformat()
        record = {
            "id": self._gen_id(),
            "version": 1,
            "status": RecordStatus.ACTIVE,
            "created_at": now,
            "updated_at": now,
            "parent_id": None,
            **record_data,
        }
        self.records.append(record)
        return record

    def update_record(self, record_id, updates, create_new_version=True):
        """更新记录

        默认开新版本——旧的不去，新的来。这样能看到演变过程。
        如果 create_new_version=False，就直接原地改（慎用，一般只改备注）。
        """
        idx = self._find_index(record_id)
        if idx is None:
            raise ValueError(f"找不到记录 {record_id}")

        if create_new_version:
            old_record = self.records[idx]
            # 旧的标记为被取代
            old_record["status"] = RecordStatus.SUPERSEDED
            old_record["updated_at"] = datetime.now().isoformat()

            # 新版本
            new_record = copy.deepcopy(old_record)
            new_record["id"] = self._gen_id()
            new_record["version"] = old_record["version"] + 1
            new_record["status"] = RecordStatus.ACTIVE
            new_record["parent_id"] = old_record["id"]
            new_record["updated_at"] = datetime.now().isoformat()
            new_record.update(updates)
            self.records.append(new_record)
            return new_record
        else:
            self.records[idx].update(updates)
            self.records[idx]["updated_at"] = datetime.now().isoformat()
            return self.records[idx]

    def withdraw_record(self, record_id, reason=""):
        """撤回一条记录

        不是删除，是打个"撤回"标签。以后查得到，知道哪条做错了。
        """
        idx = self._find_index(record_id)
        if idx is None:
            raise ValueError(f"找不到记录 {record_id}")
        self.records[idx]["status"] = RecordStatus.WITHDRAWN
        self.records[idx]["withdrawn_reason"] = reason
        self.records[idx]["updated_at"] = datetime.now().isoformat()
        return self.records[idx]

    def add_note(self, record_id, note_text):
        """给一条记录加临时备注

        不升版本，就是随手写点东西。
        """
        idx = self._find_index(record_id)
        if idx is None:
            raise ValueError(f"找不到记录 {record_id}")
        if "notes" not in self.records[idx] or self.records[idx]["notes"] is None:
            self.records[idx]["notes"] = ""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        self.records[idx]["notes"] += f"\n[{timestamp}] {note_text}"
        self.records[idx]["updated_at"] = datetime.now().isoformat()
        return self.records[idx]

    def list_records(self, include_withdrawn=False, include_legacy=False,
                     include_superseded=False, include_drafts=False):
        """列出记录

        默认只看正常在用的。要考古就把参数打开。
        """
        allowed = {RecordStatus.ACTIVE}
        if include_withdrawn:
            allowed.add(RecordStatus.WITHDRAWN)
        if include_legacy:
            allowed.add(RecordStatus.LEGACY)
        if include_superseded:
            allowed.add(RecordStatus.SUPERSEDED)
        if include_drafts:
            allowed.add(RecordStatus.DRAFT)

        return [r for r in self.records if r["status"] in allowed]

    def get_record(self, record_id):
        """按 id 取单条记录"""
        for r in self.records:
            if r["id"] == record_id:
                return r
        return None

    def get_history(self, record_id):
        """看一条记录的所有历史版本

        顺着 parent_id 往回找，把祖宗十八代都挖出来。
        """
        history = []
        current = self.get_record(record_id)
        while current is not None:
            history.append(current)
            parent_id = current.get("parent_id")
            current = self.get_record(parent_id) if parent_id else None
        return history

    def find_by_title(self, keyword):
        """按标题关键字搜记录"""
        return [r for r in self.records if keyword in r.get("title", "")]

    def _find_index(self, record_id):
        for i, r in enumerate(self.records):
            if r["id"] == record_id:
                return i
        return None

    @staticmethod
    def _gen_id():
        """生成一个简单的 id——时间戳加随机数，够课堂用了"""
        import random
        return f"rec-{int(datetime.now().timestamp())}-{random.randint(1000, 9999)}"
