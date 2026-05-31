# 民乐谱库检索API

## 快速启动

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

打开浏览器访问：http://localhost:8000/docs

---

## 曲谱文件准备

### 扫描规范
1. **文件格式**：PDF（推荐）、JPG/PNG
2. **页码顺序**：按曲谱自然顺序扫描，不要打乱
3. **命名建议**：`曲名_调式_页数.pdf`，例如：`喜洋洋_C调_8页.pdf`

### 声部拆分建议
| 乐器声部 | 常见页码范围 | 备注 |
|---------|-------------|------|
| 二胡 | 1-2页 | 含I、II声部 |
| 琵琶 | 3-4页 | |
| 笛子 | 5页 | |
| 扬琴 | 6-7页 | |
| 打击乐 | 8页 | |

---

## 核心功能

### 1. 谱库索引
- `POST /scores` - 上传曲谱（自动检测调式缺失、重复文件）
- `GET /scores` - 曲谱列表
- `GET /scores/{id}` - 曲谱详情
- `GET /scores/{id}/download` - 下载文件

### 2. 标签检索
- `GET /scores/search` - 多条件检索
  - `keyword` - 曲名/作曲家
  - `key` - 调式（C调、G调等）
  - `instrument` - 乐器声部

### 3. 借阅历史
- `POST /borrow-records` - 登记借阅
- `GET /borrow-records` - 借阅记录
- `PUT /borrow-records/{id}/return` - 归还

### 4. 统计看板
- `GET /stats` - 调式缺失数量、待归还、乐器分布等

---

## 调式缺失复现与排查

### 复现步骤
1. 调用 `POST /scores`，`key` 字段留空
2. 响应中会返回：
   ```json
   {
     "success": false,
     "errors": [{
       "error_type": "key_missing",
       "field": "key",
       "message": "曲谱「xxx」调式缺失",
       "suggestion": "请填写调式，如：C调、G调、D调、F调等"
     }]
   }
   ```

### 批量排查调式缺失
1. 调用 `GET /stats`，查看「调式缺失」数量
2. 调用 `GET /scores`，遍历曲谱找出 `key` 为空的记录

---

## 扫描重页检测

上传声部分谱时，系统自动检测页码重叠：
- 错误示例：二胡声部填1-3页，琵琶声部也填2-4页
- 系统提示：「第2页重复：声部「二胡」与声部「琵琶」扫描重页」

---

## API 响应示例

### 成功上传（含警告）
```json
{
  "success": true,
  "score_id": 1,
  "warnings": [{
    "error_type": "instrument_unknown",
    "message": "声部「电子琴」不在常见民乐器列表",
    "suggestion": "常见民乐器包括：二胡、高胡、中胡..."
  }]
}
```
