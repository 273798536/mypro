# Web3 交易网络星图 — 说明文档

## 启动方式

```bash
# 在项目根目录启动任意静态文件服务器，例如：
python3 -m http.server 8080
# 或
npx serve -l 8080 .
```

然后在浏览器打开 `http://localhost:8080`。

无需安装任何依赖，Three.js 通过 CDN 加载。

## 样例数据位置

样例数据全部内嵌在 `index.html` 的 `<script>` 区域中，以 JS 变量形式存在：

- `NODES` — 节点数组（地址/合约），每个节点含 `id`、`label`、`originalLabel`、`type`、`version`、`mergeError`、`mergeNote`、`labelExpired`、`labelExpiredNote`、`balance` 字段
- `EDGES` — 边数组（交易），每条边含 `source`、`target`、`value`、`txCount`、`isCircular`、`circularNote`、`timeWindows`、`originalValue`、`version` 字段
- `TIME_WINDOWS` — 时间窗口定义数组，每个含 `id`、`label`、`range`、`start`、`end`

替换这些变量即可加载自己的数据。

## 地址合并错误的触发方法

样例数据中已预设了两处合并错误：

1. **`0xF1g2…3m4N`** — `mergeError: true`，`mergeNote` 说明该地址疑似与 `0xA1b2…3c4D` 为同一实体控制但未合并
2. **`0xJ7k8…9u0V`** — `mergeError: true`，`mergeNote` 说明被错误合并到 `0xC5d6…7g8H`，已回滚

在 3D 视图中，合并错误节点显示为粉紫色，外围带虚线环。侧栏「异常」标签页的「地址合并错误」区域列出详细信息，包括原始值和当前结论。

自行触发合并错误：将任意节点的 `mergeError` 设为 `true`，并在 `mergeNote` 中填写说明，刷新页面即可看到效果。

## 循环转账的触发方法

样例数据中预设了三组循环转账，对应 `isCircular: true` 的边：

1. Binance ↔ 未知合约（3 笔等额往返）
2. Vitalik ↔ 疑似关联地址（5 笔等额往返）
3. Router ↔ 小额钱包（2 笔 MEV 回款测试）

3D 视图中循环边以橙色线段和「⟳ 循环」文字标注。

## 标签过期的触发方法

样例中两个节点的 `labelExpired` 为 `true`：

1. **`0xE9f0…1k2L`** — Aave Lending Pool v1 标签已过期
2. **`0xG5h6…7o8P`** — OpenSea Seaport 标签未更新

过期节点在 3D 图中显示为灰色。侧栏「异常」→「标签过期」列出原始标签和当前结论。

## 标签缺失提示

当节点 `label` 为 `null` 且类型为合约时，侧栏「标签提示」标签页会给出可操作建议（如去 Etherscan 查看合约字节码、更新标签版本等）。这确保了不需要先手工清洗所有数据。

## 时间窗口与口径影响

底部时间轴可拖动或自动播放。切换时间窗口后：

- 3D 网络只显示该窗口内有交易的节点和边
- 侧栏「口径影响」标签页列出每个时间窗口的独有节点，标注当前窗口与近邻/远端窗口的差异
- 水印区域实时显示当前时间窗口、数据版本和帧号

## 截图标注

3D 视图左上角始终显示：

- 标题「Web3 交易网络星图」
- 当前时间窗口范围
- 数据版本
- 当前帧号

循环转账边自带文字「⟳ 循环」标注，节点旁边有地址/标签文字，不依赖颜色区分。

## 数据版本与原始值保留

所有节点和边都带有 `version` 字段。当版本低于当前 `DATA_VERSION` 时，侧栏以「v-stale」黄色徽标提示。异常条目中同时保留「原始值」和「当前结论」，方便复盘。
