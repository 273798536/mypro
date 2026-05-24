# 投标资料封版多源导入巡检 CLI

## 功能特性

- **init**: 初始化项目数据库和目录结构
- **import**: 多源导入（资质文件、报价版本、盖章扫描件、异常照片）
- **check**: 数据一致性检查和规则校验
- **fix**: 交互式修复异常数据
- **report**: 生成巡检报表（含原始行号追踪）
- **history**: 操作历史查询和版本对比
- **export**: 导出一致的事实数据

## 核心设计原则

1. **事实一致性**: 重复导入只更新同一条记录，不新增
2. **可追溯性**: 所有汇总数据可追溯到单条原始记录
3. **异常保留**: 坏数据不进汇总，但保留在失败列表
4. **权限控制**: 基于用户角色的操作权限拦截

## 快速开始

```bash
pip install -e .
bid-inspect init
bid-inspect import --type qualification data/qualification.xlsx
bid-inspect check
bid-inspect report
```
