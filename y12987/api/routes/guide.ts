import { Router, type Request, type Response } from 'express'

const router = Router()

const guideContent = {
  sections: [
    {
      title: '启动系统',
      steps: [
        {
          step: 1,
          title: '安装依赖',
          description: '在项目根目录执行 `npm install` 安装所有依赖包，包括 Express、better-sqlite3 等。',
        },
        {
          step: 2,
          title: '启动开发服务器',
          description: '执行 `npm run dev` 同时启动前端开发服务器和后端 API 服务器。后端默认监听 3001 端口。',
        },
        {
          step: 3,
          title: '验证服务状态',
          description: '访问 `/api/health` 端点，返回 `{ success: true }` 即表示后端服务正常运行。',
        },
      ],
    },
    {
      title: '导入数据',
      steps: [
        {
          step: 1,
          title: '数据库自动初始化',
          description: '首次启动时，系统自动在 `data/etl-topology.db` 创建 SQLite 数据库并建表，无需手动操作。',
        },
        {
          step: 2,
          title: '种子数据加载',
          description: '系统首次启动会自动填充示例 ETL 任务和依赖关系数据。如需自定义数据，可直接操作数据库文件。',
        },
        {
          step: 3,
          title: '确认数据就绪',
          description: '访问 `/api/tasks` 接口确认任务和依赖关系数据已正确加载。',
        },
      ],
    },
    {
      title: '查看异常',
      steps: [
        {
          step: 1,
          title: '查看拓扑看板',
          description: '在拓扑看板页查看 ETL 任务依赖关系图。节点按状态着色：绿色表示成功，红色表示失败，黄色表示运行中，灰色表示待执行。',
        },
        {
          step: 2,
          title: '定位异常节点',
          description: '失败状态的节点会以红色高亮显示，可直接在图上定位异常任务及其上下游依赖。',
        },
        {
          step: 3,
          title: '查看关联工单',
          description: '点击异常节点可查看关联的业务工单摘要，包括处理意见和变更历史，支持跳转至工单详情页。',
        },
        {
          step: 4,
          title: '版本对比',
          description: '在工单详情页可并排查看变更前后的结论字段，差异部分高亮显示，便于追踪变更影响。',
        },
      ],
    },
    {
      title: '导出结果',
      steps: [
        {
          step: 1,
          title: '导出拓扑数据',
          description: '拓扑数据通过 `/api/tasks` 接口获取，图表渲染、明细列表和导出使用同一数据源，确保一致性。',
        },
        {
          step: 2,
          title: '导出审计日志',
          description: '在审计日志页点击导出按钮，调用 `/api/audit-logs/export` 接口下载 CSV 格式的审计报告。支持按操作类型、操作人、时间范围筛选后导出。',
        },
        {
          step: 3,
          title: '确认导出内容',
          description: '导出的 CSV 文件包含操作 ID、操作类型、实体类型、实体 ID、操作人、操作时间、原因和数据快照等字段。',
        },
      ],
    },
  ],
}

router.get('/', (_req: Request, res: Response): void => {
  res.json({ success: true, data: guideContent })
})

export default router
