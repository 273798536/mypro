# 广告素材投放多源导入巡检工具

一个用于处理广告素材多源数据导入、脏记录检测和修复的CLI工具。支持素材ID、审核结果、花费日报和历史压缩包的导入巡检。

## 功能特性

- **多源数据导入**: 支持CSV和ZIP格式的素材ID、审核结果、花费日报、历史数据导入
- **脏记录检测**: 自动检测缺字段、跨日、改名、金额/数量冲突等问题
- **幂等性控制**: 相同请求ID重复导入只更新同一条记录，不会重复计数
- **权限系统**: 四种角色（录入、复核、主管、只读）的字段和动作权限控制
- **改名归因**: 同素材多平台改名后的效果归因汇总
- **完整审计**: 保留原始内容、处理意见和变更历史
- **导出功能**: 支持导出清洗后数据、脏记录清单和修改历史

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install

# 编译TypeScript
npm run build
```

### 2. 空库启动

```bash
# 初始化数据库（首次运行）
npm run dev -- init

# 或者使用编译后的版本
npm run build
node dist/index.js init
```

初始化后会自动创建默认管理员用户：
- 用户名: `admin`
- 角色: `manager`（拥有所有权限）

### 3. 准备样例数据

项目在 `examples/` 目录下提供了测试样例：

```
examples/
├── sample_material_ids.csv      # 素材ID样例
├── sample_audit_results.csv     # 审核结果样例
├── sample_cost_daily.csv        # 花费日报样例
└── dirty_data_example.csv       # 包含脏数据的样例
```

### 4. 主流程演示

```bash
# 1. 导入素材ID
npm run dev -- import -f examples/sample_material_ids.csv -s material_id

# 2. 导入审核结果
npm run dev -- import -f examples/sample_audit_results.csv -s audit_result

# 3. 导入花费日报
npm run dev -- import -f examples/sample_cost_daily.csv -s cost_daily

# 4. 查看数据状态
npm run dev -- view

# 5. 生成巡检报告
npm run dev -- report

# 6. 查看失败清单
npm run dev -- report --failed

# 7. 导出清洗后的数据
npm run dev -- export -t clean -o output/clean_records.csv
```

### 5. 制造异常场景

```bash
# 导入包含脏数据的文件
npm run dev -- import -f examples/dirty_data_example.csv -s cost_daily

# 检查脏记录
npm run dev -- check

# 查看详细报告（失败清单）
npm run dev -- report --failed
```

你会看到以下类型的脏记录：

| 行号 | 问题类型 | 说明 |
|------|----------|------|
| 2 | missing_field | 缺少素材名称 |
| 3 | name_change | 同一素材ID名称不一致 |
| 4 | cross_day | 日期格式无效 |
| 5 | amount_conflict | 花费与历史平均值差异过大 |
| 6 | quantity_conflict | 曝光量与历史平均值差异过大 |

### 6. 修复脏记录

```bash
# 查看单条记录详情（含关联脏记录）
npm run dev -- view -i <记录ID>

# 修复字段值
npm run dev -- fix -i <记录ID> -f material_name -v "正确的素材名称"

# 标记单个脏问题为已修复
npm run dev -- fix -d <脏记录ID>

# 查看变更历史
npm run dev -- history -i <记录ID>
```

### 7. 审核流程

```bash
# 复核角色审核通过
AD_INSPECT_USER=reviewer npm run dev -- approve -i <记录ID>

# 复核角色驳回
AD_INSPECT_USER=reviewer npm run dev -- reject -i <记录ID> -r "数据仍有问题"
```

### 8. 幂等性测试

```bash
# 第一次导入
npm run dev -- import -f examples/sample_cost_daily.csv -s cost_daily -r test-req-001

# 用相同的request_id再次导入（只会更新，不会新增）
npm run dev -- import -f examples/sample_cost_daily.csv -s cost_daily -r test-req-001

# 验证：记录数量不变
npm run dev -- view
```

### 9. 同素材改名归因

```bash
# 查看所有改名的素材
npm run dev -- alias --list

# 添加别名关联
npm run dev -- alias --add -c MAT001 -n "双11banner-新版本" -p 抖音

# 查看素材归因汇总
npm run dev -- alias --show MAT001
```

### 10. 临时补录

```bash
# 补录单条记录
npm run dev -- supplement \
  --material-id MAT999 \
  --material-name "临时补录素材" \
  --platform 抖音 \
  --date 2024-01-20 \
  --impressions 50000 \
  --clicks 1200 \
  --cost 800
```

## 权限系统

| 角色 | 可见字段 | 可执行操作 |
|------|----------|------------|
| **readonly** | 素材ID、名称、平台、日期、曝光、点击、花费、审核状态、状态 | view、report、export |
| **entry** (录入) | readonly所有 + 记录ID、来源、行号、审核原因、原始数据 | view、import、check、fix、report、export、history |
| **review** (复核) | entry所有 + 创建人、创建时间、更新时间 | entry所有 + approve、reject |
| **manager** (主管) | 全部字段（含request_id） | 所有操作 |

切换用户：
```bash
# 设置环境变量指定当前用户
export AD_INSPECT_USER=admin

# 创建新用户（需要manager权限）
npm run dev -- user --create -u entry_user -r entry
npm run dev -- user --create -u reviewer -r review
npm run dev -- user --create -u readonly_user -r readonly

# 查看所有用户
npm run dev -- user --list
```

## 命令参考

| 命令 | 说明 |
|------|------|
| `init` | 初始化数据库 |
| `init --reset` | 重置数据库（删除所有数据） |
| `import -f <文件> -s <来源>` | 导入数据 |
| `check` | 检查脏记录 |
| `fix -i <ID> -f <字段> -v <值>` | 修复记录字段 |
| `approve -i <ID>` | 审核通过 |
| `reject -i <ID> -r <原因>` | 驳回 |
| `report` | 生成巡检报告 |
| `report --failed` | 只显示失败清单 |
| `history -i <ID>` | 查看变更历史 |
| `export -t <类型> -o <文件>` | 导出数据 |
| `alias --list` | 列出改名素材 |
| `alias --add -c <标准ID> -n <别名> -p <平台>` | 添加别名 |
| `alias --show <ID>` | 查看素材归因 |
| `supplement` | 临时补录单条记录 |
| `user --list` | 列出用户 |
| `user --create -u <用户名> -r <角色>` | 创建用户 |
| `view` | 查看记录列表 |
| `view -i <ID>` | 查看单条记录详情 |

## 导出类型

| 类型 | 说明 |
|------|------|
| `clean` | 清洗后的记录（状态: fixed/approved/imported） |
| `dirty` | 脏记录清单（含原始行号、问题类型、处理建议） |
| `fixed` | 修改历史记录（原值、新值、修改人、原因、时间） |

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- tests/idempotency.test.ts
npm test -- tests/status.test.ts
npm test -- tests/permissions.test.ts
```

### 测试重点

1. **幂等性测试** (`idempotency.test.ts`)
   - 相同请求ID重复导入只更新不新增
   - 不同请求ID正确去重
   - 更新记录保留变更历史

2. **状态流转测试** (`status.test.ts`)
   - 新记录初始状态为pending
   - 脏记录检测后状态变为dirty
   - 修复后状态变为fixed
   - 审核后状态变为approved/rejected

3. **权限测试** (`permissions.test.ts`)
   - 各角色权限边界正确
   - 字段过滤正确应用

## 项目结构

```
.
├── src/
│   ├── index.ts              # CLI入口
│   ├── types.ts              # 类型定义
│   ├── config/
│   │   └── permissions.ts    # 权限配置
│   ├── db/
│   │   └── database.ts       # 数据库初始化和连接
│   └── services/
│       ├── userService.ts    # 用户服务
│       ├── recordService.ts  # 记录服务
│       ├── dirtyRecordService.ts  # 脏记录服务
│       ├── importService.ts  # 导入服务
│       ├── reportService.ts  # 报告服务
│       ├── exportService.ts  # 导出服务
│       └── aliasService.ts   # 别名归因服务
├── tests/                    # 测试用例
├── examples/                 # 样例数据
├── package.json
├── tsconfig.json
└── README.md
```

## 脏记录类型说明

| 类型 | 触发条件 | 处理建议 |
|------|----------|----------|
| `missing_field` | 必填字段为空 | 补充缺失字段 |
| `cross_day` | 日期格式无效 | 修正为YYYY-MM-DD格式 |
| `name_change` | 同一素材ID名称不同 | 添加别名关联或确认改名 |
| `amount_conflict` | 花费与历史均值差异>50% | 核对数据源准确性 |
| `quantity_conflict` | 曝光量与历史均值差异>50% | 核对数据源准确性 |
| `duplicate` | 唯一键重复 | 自动更新现有记录 |
