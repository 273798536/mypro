# 剧场返场曲异常提醒系统

只讲三件事：启动、重跑、查看 CSV 明细。

---

## 一、启动

### 1. 环境要求
- Node.js ≥ 18

### 2. 安装依赖
```bash
# 在项目根目录
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. 导入示例数据（首次启动推荐）
```bash
cd backend
npm run seed
# 输出：导入13条曲目，异常检测结果 { file_mismatch:X, alias_conflicts:X, ... }
```
示例数据中包含：文件名不匹配（告白气球、双截棍）、别名重复（菊花台 / 菊花）、来源缺失、授权备注等真实场景。

### 4. 启动服务
```bash
# 方式一：一键启动前后端（推荐）
npm run dev
# 后端: http://localhost:4000
# 前端: http://localhost:5173

# 方式二：分别启动
# 终端A：
cd backend && npm run dev
# 终端B：
cd frontend && npm run dev
```
打开浏览器访问 http://localhost:5173 即可。

---

## 二、重跑

重跑用于：新导入一批数据后、补了授权备注后、阿蓝临时改完判断后。

### 方式一：前端按钮（运营主管常用）
1. 顶部「重跑异常检测」按钮 —— 只做4类异常检测。
2. 顶部「全量重跑对齐」按钮 —— 文件名对齐 + 异常检测 + 授权对齐。
3. 顶部「授权备注对齐」按钮 —— 输入关键词（如 `团长授权加演`），批量对齐命中的曲目。

### 方式二：命令行（演出统筹阿蓝常用）
```bash
cd backend

# 完整重跑三步：异常检测 + 全量文件名对齐 + 授权备注对齐
npm run rerun

# 输出示例：
# [RERUN] ============ 重跑流程开始 ============
# [RERUN] 第1步：全量重新运行异常检测...
# [RERUN] 异常检测结果: { file_mismatch: 3, alias_conflicts: 1, ... }
# ...
```

### 重跑会做什么
1. **文件名对齐**：用已有文件名去匹配没有文件名的曲目（模糊匹配，唯一命中才对齐）。
2. **异常检测**：
   - `file_mismatch` 文件名缺失 / 与曲名疑似不匹配
   - `duplicate_alias` 别名重复 → 单独拎到「别名冲突」页
   - `source_missing` 来源字段为空（至少要保住来源+处理状态）
   - `program_order` 正场曲目缺演出顺序
3. **授权备注对齐**：补一条授权备注关键词后，自动补齐来源、改为已确认、尝试对齐文件名，并写入历史。

> 注意：重跑不会删数据，所有字段变更都会进入 `track_history`，下一班能看到阿蓝临时改判的全过程。

---

## 三、查看 CSV 明细

### 1. 前端一键导出
| 按钮 | 内容 | 场景 |
|---|---|---|
| 「导出全部CSV」 | 全量曲目（15列：ID、顺序、曲名、别名、文件名、返场、来源、状态、异常类型/详情、运营备注、授权备注、操作人、更新时间） | 演出统筹阿蓝最终清单 |
| 「导出异常CSV」 | 只导出有 open 异常的曲目 | 运营主管当日处理清单 |
| 「导出冲突CSV」 | 别名冲突明细（冲突别名、关联曲目、关联文件名、解决状态） | 单独拎出的重复别名结果 |
| 曲目详情抽屉 → 「导出历史CSV」 | 单条曲目的所有字段修改记录（原值→新值、原因、操作人、时间） | 下一班看阿蓝之前怎么改的 |

### 2. CSV 在磁盘上的位置
导出时浏览器会下载，**原始数据**的位置：
```
backend/data/theater_encore.db   # SQLite 数据库（所有明细都在这）
backend/data/uploads/             # 上传后60秒自动清理
```

### 3. 用 SQL 直接看明细（可选）
```bash
cd backend
sqlite3 data/theater_encore.db

-- 看所有异常（等价于导出异常CSV）
SELECT t.id, t.track_name, t.file_name, a.alert_type, a.alert_level, a.alert_detail
FROM tracks t JOIN anomaly_alerts a ON a.track_id = t.id
WHERE a.resolved = 0;

-- 看某首歌的全部修改历史（等价于导出该曲历史CSV）
SELECT field_name, old_value, new_value, change_reason, operator, created_at
FROM track_history WHERE track_id = 13 ORDER BY created_at DESC;

-- 看重复别名单独拎出来的清单
SELECT alias_name, track_ids, resolved FROM alias_conflicts;
```

### 4. 导入CSV注意事项
- 字段名前后不一也能识别：曲名/歌曲名/曲目/名称 都会识别成 `track_name`；文件名/音频文件 → `file_name`；返场曲/是否返场 → `is_encore`；授权备注 → `auth_remark`；备注/说明 → `remark`。
- 导入前请在「本次导入来源名」框里填清楚（如 `2026-06-15排练群截图整理`）—— 系统会把这个来源写进每条记录的 `source` 字段，**保住来源**。

---

## 关键数据表总览（数据库里的表）

| 表 | 作用 | 为什么有这张表 |
|---|---|---|
| `tracks` | 曲目主表 | 文件名、曲目表、最终清单的对齐基准 |
| `track_history` | 字段修改历史 | 阿蓝临时改判留痕，下一班不只看到最终结果 |
| `anomaly_alerts` | 异常提醒列表 | 四类异常单独记录，可逐条标记已解决 |
| `alias_conflicts` | 别名冲突单独拎出 | 不让别名重复的记录混进正常结果 |
| `import_sources` | CSV导入日志 | 每次导入的来源、字段映射、错误数 |

---

## 一键测试所有核心功能
```bash
cd backend
npm run test
# 会覆盖：CRUD、字段别名识别、异常检测、别名冲突、授权对齐、CSV导出等
```
