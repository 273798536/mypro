# 组织切片批注导出系统

本地运行的组织切片病理批注、复核迭代、测序关联、统计报告一体化系统。SQLite + Python Flask 零外部依赖，同事从空目录拉下来即可跑。

## 核心需求对齐

| 用户场景 | 系统支持 |
|---|---|
| 导师只问"能不能用"，不问菜单 | `/api/export/blocked` 一键列出所有不能导出的记录 + 拦截原因 |
| 生态调查员解释边界不清 | 每条批注保存 `boundary_data.regions[].edge_notes` + 复核意见 + 照片对齐问题，三者互相印证 |
| 异常复核非一次性判断 | `reviews` 表支持多轮 `review_round`，历史永不覆盖，`is_active` 标记当前有效结论 |
| 测序补录后分组统计更新 | 新增测序结果自动触发 `recalculate_group_stats`，分组统计实时刷新 |
| 图表/画布/三维视图不靠颜色猜 | 雷达图每个维度附带文字解释、阈值说明、诊断结论；多边形区域附带边界段详细说明 |
| 月底转交导师看不能用的 | 报告顶部"导师重点关注"模块，按高/中/常规优先级列出被拦记录+处理建议 |
| 导师只看导出报告也能明白 | HTML报告含完整证据链：评分明细→复核轨迹→照片问题→下一步建议 |

## 快速开始（从零目录 5 步跑通）

### 1. 安装依赖

```bash
cd /path/to/project
pip install -r requirements.txt
```

### 2. 初始化本地数据库（示例数据已含边界不清案例）

```bash
python scripts/init_database.py
# 输出: 数据库初始化成功: ./data/histology.db
#       已加载示例数据: 5 张切片, 5 条批注, 6 条复核记录, 3 条测序结果
```

### 3. 一键跑完整流程演示（不启动Web服务）

```bash
python scripts/run_full_pipeline.py
```

该脚本依次执行 9 个步骤：
1. 初始化数据库
2. 系统诊断总览（导师视角看数字）
3. 列出所有边界不清的批注
4. 解释"标注边界 ↔ 复核意见 ↔ 显微照片"三者关系
5. 演示多轮迭代复核（非一次性判断）
6. 测序补录触发分组统计自动更新
7. 图表/画布附带明细文字解释的示例
8. 月底转交清单（只列不能用的）
9. 生成月底 `monthly_report_*.html` 报告

### 4. 启动 API 服务（如需 CURL/前端调用）

```bash
python app.py
# 访问: http://127.0.0.1:5000
```

### 5. 通过 CURL 逐步演示 API 调用

```bash
bash scripts/curl_examples.sh
# 交互式，每步按回车执行；共14个示例覆盖全流程
```

## 项目结构

```
.
├── app.py                      # Flask后端服务 + 报告生成逻辑
├── requirements.txt
├── data/
│   └── histology.db            # SQLite数据库（init后生成）
├── reports/                    # 生成的导出报告存放处
│   ├── export_report_*.json
│   ├── export_report_*.html
│   └── monthly_report_*.html
└── scripts/
    ├── init_database.py        # 库表结构 + 示例数据种子
    ├── run_full_pipeline.py    # 一键完整流程演示（纯本地）
    └── curl_examples.sh        # API调用curl示例（交互式）
```

## 数据模型核心表

| 表 | 作用 | 关键字段 |
|---|---|---|
| `tissue_slides` | 组织切片元信息 | slide_number, patient_id, stain_type, microscope_photo_url |
| `annotations` | 批注（含边界多边形） | boundary_data(JSON), boundary_quality_score, **boundary_clarity** (clear/moderate/unclear), confidence_score |
| `reviews` | 多轮复核记录 | annotation_id, review_round, review_result, **boundary_issue_detail**, **photo_alignment_issue**, suggestion, is_active |
| `sequencing_results` | 测序结果关联 | slide_id, gene_panel, mutation_data(JSON), quality_score |
| `slide_groups` + `slide_group_members` | 病例分组 | group_criteria, 分组成员 |
| `group_statistics` | 分组统计（测序补录后自动刷新） | stat_key, stat_value, calculated_at |
| `export_logs` | 导出操作审计 | export_status, block_reason, reviewer_note |

### `boundary_clarity` 判定规则

- ≥80分 → `clear`（边界清晰）
- 50-79分 → `moderate`（存在疑问）
- <50分 → **`unclear`（边界不清，触发拦截）**

复核时若 `approved` 且当前评分<80，系统自动提分至82+，避免历史低分误拦。

## 关键 API 速查

| Method | Endpoint | 用途 |
|---|---|---|
| GET | `/api/diagnostics/summary` | 导师快速看：总数、各状态数、清晰度分布 |
| GET | `/api/slides` | 所有切片列表。`?status=blocked` 只看被拦的；`?clarity=unclear` 筛选边界不清 |
| GET | `/api/slides/<id>` | 单切片详情：批注+复核历史+测序结果 |
| POST | `/api/annotations` | 生态调查员提交批注 |
| POST | `/api/annotations/<id>/reviews` | 病理医师提交复核意见（自动处理多轮迭代） |
| GET | `/api/annotations/<id>/reviews` | 查某批注完整复核轨迹 |
| POST | `/api/sequencing` | **补录测序结果 → 自动刷新统计 → 待定批注触发提醒** |
| GET | `/api/groups` | 分组列表+成员+统计（已自动同步最新数据） |
| POST | `/api/groups/<id>/recalc` | 手动强制刷新分组统计 |
| GET | `/api/export/blocked` | **月底转交导师用**：仅列出不能导出的+原因+优先级 |
| GET | `/api/export/check/<id>` | 单条批注导出检查：含雷达图数据+解释+完整证据链 |
| POST | `/api/export/report` | **生成完整导出报告**：HTML+JSON双格式 |

## 典型场景：边界不清的完整证据链

生态调查员被问"为什么这条不能导出？"时可展示：

1. **批注层客观证据**（`annotations.boundary_data`）：
   - 多边形具体坐标段（如 `[280,290]` 至 `[350,350]`）标注 `edge_notes`
   - `quality_flags` 记录"对焦不准""染色不均"等照片级问题

2. **复核意见与边界对应**（`reviews.boundary_issue_detail`）：
   - 明确引用坐标段 → 病理判定理由（如"核密度呈梯度变化，缺乏明确分界"）

3. **复核意见与照片对应**（`reviews.photo_alignment_issue`）：
   - 指明显微照片哪片区域有折叠/旋转偏差 → 建议重拍或配准

4. **迭代决策轨迹**（`reviews.review_round`）：
   - 第1轮驳回 → 补IHC → 第2轮pending → 补NGS → 第3轮approved_with_notes
   - 每轮独立保存，完整追溯决策信息逐步完整的过程

## 图表/视图的解释规范

- **雷达图**：5个维度（平滑度、对比度、跨尺度一致性、密度差、连续性）
  - 每项维度附：权重分、当前分、阈值(≥70合格)、诊断文字
  - 颜色（绿/橙/红）仅辅助，**文字解释为依据**
- **多边形画布**：区域列表含面积、细胞密度条、每段边界问题点
- **三维视图（规范）**：侧面板固定位置展示：
  - 视角坐标、Z轴切片厚度
  - 渲染所用抗体/染色说明
  - 观察者需注意的伪影区域高亮清单

不出现"仅以颜色区分含义、旁边无文字"的任何可视化元素。

## 月底转交导师报告内容

HTML报告打开即可见，无需登录：

1. **封面总览**：批注总数/可导出数/被拦数/比例
2. **导师重点关注**（最重要，放在顶部）：
   - 高优：≥2轮复核仍未决 → 建议 senior 医师介入
   - 中优：pending 等补充材料 → 提醒查测序/IHC进度
   - 常规：首轮驳回 → 标注员修正即可
   - 5项快速核对checklist
3. **拦截记录明细**（每条含完整证据链）：
   - 切片+批注基本信息
   - 边界质量雷达图（数据表+解释，非仅图）
   - 各轮复核完整轨迹
   - 关联测序结果
   - 下一步建议checklist
4. **可导出记录列表**（简版，非重点）

导师读完第2项即可明确本月哪些记录不能用、为什么。

## 重置与验证

```bash
# 重置数据库（删除+重建+种子数据）
python scripts/init_database.py

# 完整回归测试：不启动Web，直接跑全流程
python scripts/run_full_pipeline.py

# 启动后自检
curl http://127.0.0.1:5000/api/diagnostics/summary | python3 -m json.tool
curl http://127.0.0.1:5000/api/export/blocked | python3 -m json.tool
```

所有脚本无网络请求、无外部服务依赖，离线环境可直接运行。
