## 1. 架构设计

```mermaid
flowchart TD
    "React 前端" --> "Express API"
    "Express API" --> "SQLite 数据库"
    "Express API" --> "归并引擎"
    "归并引擎" --> "SQLite 数据库"
    "Express API" --> "导出服务"
```

## 2. 技术说明

- 前端：React@18 + Tailwind CSS@3 + Vite + Zustand
- 初始化工具：vite-init
- 后端：Express@4 + TypeScript（ESM）
- 数据库：SQLite（better-sqlite3），文件存储
- 归并算法：名称相似度（Levenshtein）+ 坐标距离阈值

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 重定向到 /import |
| /import | 材料导入页：录入/粘贴会议纪要 |
| /merge | 归并操作页：分组、修改备注、重跑 |
| /summary | 摘要查看页：归并结果 + 导出 |

## 4. API 定义

### 4.1 条目管理

```
GET    /api/entries           获取所有条目
POST   /api/entries/batch     批量创建条目（导入纪要解析后）
PATCH  /api/entries/:id       修改单条条目（如改备注）
DELETE /api/entries/:id       删除条目
```

### 4.2 归并操作

```
POST   /api/merge/run         执行归并（重跑）
GET    /api/merge/groups      获取归并分组结果
PATCH  /api/merge/groups/:id  修改归并组（调整组成员/备注）
POST   /api/merge/ungroup     将条目从组中移出
POST   /api/merge/group       将条目归入某组
```

### 4.3 导出

```
GET    /api/export/csv        导出归并结果为 CSV
```

### 4.4 数据类型

```typescript
interface Entry {
  id: number
  name: string
  latitude: number
  longitude: number
  opinion: string
  source: string
  groupId: number | null
  createdAt: string
  updatedAt: string
}

interface MergeGroup {
  id: number
  mergedName: string
  mergedLatitude: number
  mergedLongitude: number
  remark: string
  createdAt: string
  updatedAt: string
  entries: Entry[]
}
```

## 5. 服务端架构

```mermaid
flowchart LR
    "Controller" --> "Service"
    "Service" --> "Repository"
    "Repository" --> "SQLite"
```

- Controller：路由处理、参数校验
- Service：归并算法、业务逻辑
- Repository：数据库 CRUD

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erdiagram
    Entry {
        int id PK
        string name
        float latitude
        float longitude
        string opinion
        string source
        int group_id FK
        datetime created_at
        datetime updated_at
    }
    MergeGroup {
        int id PK
        string merged_name
        float merged_latitude
        float merged_longitude
        string remark
        datetime created_at
        datetime updated_at
    }
    Entry ||--o| MergeGroup : "belongs_to"
```

### 6.2 数据定义语言

```sql
CREATE TABLE merge_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merged_name TEXT NOT NULL,
  merged_latitude REAL NOT NULL,
  merged_longitude REAL NOT NULL,
  remark TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  opinion TEXT NOT NULL,
  source TEXT NOT NULL,
  group_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES merge_groups(id)
);

CREATE INDEX idx_entries_group_id ON entries(group_id);
```

### 6.3 归并算法说明

1. 清除所有现有分组
2. 遍历所有条目，按名称相似度（Levenshtein 距离 ≤ 2）和坐标距离（≤ 200米）聚类
3. 每个聚类创建一个 MergeGroup，merged_name 取组内出现最多的名称，坐标取平均值
4. 名称相似度低但坐标极近（≤ 50米）的条目也归入同组（处理名称不一致情况）
5. 坐标偏移较大但名称一致的条目归入同组（标记异常）
