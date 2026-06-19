# 代码审查指标看板

## 一、启动

进入 backend 目录，启动服务：

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

浏览器打开 http://localhost:8000 即可查看看板。

材料放在 `backend/data/` 目录下，支持三类文件：
- 版本说明（文件名含 version 或 "说明"）
- 审查记录（文件名含 review、"审查" 或 "记录"）
- 口头说明（文件名含 oral 或 "口头"）

## 二、重跑

修改或新增 `backend/data/` 下的 Markdown 文件后，点看板右上角 **「🔄 重跑」** 按钮，数据会重新解析加载。

也可通过 API 重跑：

```bash
curl -X POST http://localhost:8000/api/reload
```

## 三、查看Markdown报告

点看板右上角 **「📄 查看Markdown报告」** 按钮，弹窗中显示当前筛选条件下的完整报告，可点 **「⬇️ 下载」** 保存为 .md 文件。

报告内容与屏幕数字完全一致，包含：
- 筛选口径
- 总体指标
- 影响结论的关键样本
- 版本变更记录（选了版本对比时）
- 样本明细

也可通过 API 直接获取：

```bash
curl "http://localhost:8000/api/report?versions=v1.1"
```
