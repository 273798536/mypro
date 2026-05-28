# 课程先修图检查CLI

教务老师维护课程先修关系的命令行工具——快速发现循环依赖、替代课冲突、学期超载。

## 安装

```bash
npm install
npm run build
```

## 快速开始

```bash
# 导入样例数据（含故意引入的异常）
node dist/cli/index.js import --sample

# 执行检查
node dist/cli/index.js check

# 查看拓扑排序和循环
node dist/cli/index.js topology

# 解释某门课程的先修链
node dist/cli/index.js explain CS301

# 解释两门课之间的路径
node dist/cli/index.js explain --path CS101-CS301

# 导出报告（html/json/text）
node dist/cli/index.js export --format html

# 查看操作历史
node dist/cli/index.js history

# 查看当前数据
node dist/cli/index.js list courses
```

## 命令一览

| 命令 | 说明 |
|------|------|
| `import --sample` | 导入含异常的样例数据 |
| `import --clean` | 导入干净的样例数据 |
| `import --file <path>` | 从JSON文件导入 |
| `check` | 执行完整检查 |
| `topology` | 拓扑排序 + 循环定位 |
| `explain <courseId>` | 解释课程先修链和异常 |
| `explain --path A-B` | 解释两门课之间的先修路径 |
| `explain --all-paths A-B` | 列出所有可能路径 |
| `explain --anomaly <id>` | 解释指定异常详情 |
| `export --format html\|json\|text` | 导出检查报告 |
| `history` | 查看操作历史 |
| `list courses` | 查看当前数据 |

## 检测能力

### 循环依赖
- 自动检测有向图中的所有环
- 标出涉及的课程和路径
- 🔴 ERROR 级别，不影响正常课程排序

### 替代课冲突
- 循环替代（A替代B，B又替代A）
- 重复替代
- 先修要求不匹配
- 学期安排不匹配

### 学期超载
- 学分超载
- 先修顺序错误
- 重复修读
- 学期安排冲突
- 课程跨学期冲突

## 数据来源追踪

每条数据都带有 `source` 字段，记录数据来源。所有操作通过 `history` 命令可追溯。

## 测试

```bash
npm test
```
