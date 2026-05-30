# 库存ABC动态分类系统

## 系统功能
本系统帮助供应链计划员高效完成库存ABC分类分析，特别针对新品冷启动、促销异常、退货冲击等特殊场景提供深度分析和可追溯性。

## 核心功能

### 1. 样例数据生成
- 包含10个SKU的完整业务数据
- SKU基础资料、毛利率、促销日历、销售历史
- 含新品、促销期、退货等真实业务场景

### 2. ABC分类分析
- 支持按毛利额/销售额/销量分类
- 动态阈值调整
- 异常数据自动检测
- 分类结果可追溯

### 3. 特殊场景分析

#### 新品冷启动
- 自动识别上架30天内的新品
- 按上架天数分阶段（导入期/观察期/成长期
- 销量趋势分析
- 分类建议

#### 促销异常分析
- 检测促销期间销量激增异常
- 促销效果评估
- 异常数据修正建议

#### 退货冲击分析
- 高退货率SKU识别
- 净销量自动调整
- 严重程度分级

### 4. 可追溯性
- 从分类结果反向追溯到：
  - ABC分类依据
  - 动态阈值设置
  - 异常记录
  - 人工调整历史

### 5. 人工修正留痕
- 分类调整记录
- 阈值调整记录
- 操作人、时间、原因完整记录

### 6. 报告导出
- ABC分类报告（Excel）
  - 分类结果
  - 分类汇总
  - 阈值说明
- 特殊场景分析报告
- SKU追溯详情报告
- 审计日志

## 文件结构

```
├── config.py              # 系统配置
├── sample_data.py         # 样例数据生成
├── abc_classifier.py     # ABC分类核心算法
├── special_cases.py      # 特殊场景分析
├── audit_log.py          # 审计日志
├── data_io.py           # 数据导入导出
├── cli.py              # 命令行界面
├── demo.py             # 演示脚本
├── requirements.txt      # 依赖包
├── data/              # 样例数据目录
│   └── sample_data.xlsx
└── output/            # 输出报告目录
└── logs/             # 日志目录
    └── audit_log.json
```

## 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 运行演示
```bash
python3 demo.py
```

### 3. 启动交互式界面
```bash
python3 cli.py
```

## 交互式界面菜单

1. **生成并加载样例数据** - 生成包含所有场景的样例数据
2. **从Excel导入数据** - 从外部Excel文件导入
3. **执行ABC分类分析** - 运行分类分析
4. **查看分类结果汇总** - 显示分类结果和汇总
5. **查看SKU详细追溯信息** - 单个SKU详细追溯
6. **特殊场景分析** - 新品/促销/退货分析
7. **调整分类阈值** - 动态调整ABC分类阈值
8. **人工调整分类结果** - 手动调整分类并记录
9. **查看审计日志** - 操作历史查询
10. **导出报告** - 导出Excel报告
0. **退出** - 退出系统

## 使用示例

### 完整流程
1. 生成样例数据
2. 执行ABC分类
3. 查看分类结果
4. 分析特殊场景
5. 追溯SKU详情
6. （可选）人工调整分类
7. 导出报告

## 配置说明

在 `config.py` 中可调整：

- `ABC_THRESHOLDS` - ABC分类阈值
- `NEW_PRODUCT_DAYS` - 新品判定天数
- `PROMOTION_SPIKE_THRESHOLD` - 促销激增阈值
- `RETURN_IMPACT_THRESHOLD` - 退货影响阈值
- `HISTORY_DAYS` - 历史数据分析天数

## 数据格式

Excel导入格式要求（4个工作表：

1. **SKU资料**
   - sku_id, sku_name, category, sub_category, launch_date, cost, status

2. **毛利率**
   - sku_id, base_price, promotion_price, gross_margin_pct

3. **促销日历**
   - promo_id, promo_name, start_date, end_date, sku_list, discount_pct, type

4. **销售历史**
   - date, sku_id, quantity, returns, is_promotion
