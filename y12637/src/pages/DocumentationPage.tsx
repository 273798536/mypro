export default function DocumentationPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stratum-dark mb-2">操作说明</h1>
        <p className="text-stratum-mid text-sm">
          本文档涵盖岩层剖面填色工具的启动、导入、异常查看与结果导出四部分操作步骤。
        </p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-stratum-dark flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-stratum-alert text-white text-sm flex items-center justify-center">1</span>
            启动说明
          </h2>
        </div>
        <div className="p-6 space-y-4 text-sm text-stratum-dark leading-relaxed">
          <div>
            <h3 className="font-semibold mb-2">如何打开工具</h3>
            <p className="text-stratum-mid">
              在浏览器中访问工具地址后，默认进入启动页。工具为纯前端应用，无需后端服务，首次加载后可离线使用。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">三种创建项目方式</h3>
            <ul className="list-disc list-inside space-y-1.5 text-stratum-mid">
              <li><span className="text-stratum-dark font-medium">加载培训样例：</span>打开内置的典型考核数据，包含边界碰撞、单位混用、漏填单位等常见异常场景，用于练习和熟悉操作流程。</li>
              <li><span className="text-stratum-dark font-medium">导入数据文件：</span>选择本地 JSON 或 CSV 文件继续编辑已有勘测记录，文件格式要求见下一节。</li>
              <li><span className="text-stratum-dark font-medium">新建空白剖面：</span>从零开始手动添加岩层和边界，适合现场补录或小规模数据。</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">系统要求</h3>
            <ul className="list-disc list-inside space-y-1.5 text-stratum-mid">
              <li>浏览器：Chrome 90+、Edge 90+、Safari 14+ 或 Firefox 88+，需启用 JavaScript。</li>
              <li>分辨率：建议 1280×720 及以上，低分辨率下部分面板可通过滚动查看。</li>
              <li>存储空间：浏览器本地存储需保持可用，用于保存操作历史与撤销队列。</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-stratum-dark flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-stratum-alert text-white text-sm flex items-center justify-center">2</span>
            导入说明
          </h2>
        </div>
        <div className="p-6 space-y-4 text-sm text-stratum-dark leading-relaxed">
          <div>
            <h3 className="font-semibold mb-2">支持的文件格式</h3>
            <ul className="list-disc list-inside space-y-1.5 text-stratum-mid">
              <li><span className="text-stratum-dark font-medium">JSON（推荐）：</span>完整保留岩层、边界、异常与操作记录，可直接编辑。</li>
              <li><span className="text-stratum-dark font-medium">CSV：</span>仅支持岩层表格数据，导入后需手动补充边界与元数据。</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">数据字段要求</h3>
            <p className="text-stratum-mid mb-2">JSON 文件需至少包含以下顶层字段：</p>
            <ul className="list-disc list-inside space-y-1.5 text-stratum-mid">
              <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">name</code>：剖面名称（字符串）。</li>
              <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">layers</code>：岩层数组，每项包含 name、depth.top、depth.bottom、unit 等字段。</li>
              <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">boundaries</code>（可选）：边界数组。</li>
              <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">metadata</code>（可选）：操作员、勘测日期等元数据。</li>
            </ul>
            <p className="text-stratum-mid mt-2">
              CSV 文件需包含表头行，列顺序建议为：名称、顶深、底深、单位、颜色、备注、来源。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">常见问题</h3>
            <ul className="list-disc list-inside space-y-1.5 text-stratum-mid">
              <li>文件解析失败：请检查 JSON 是否合法、CSV 是否存在 BOM 或乱码。</li>
              <li>缺少必要字段：启动页会给出具体提示，按提示补全后重新导入。</li>
              <li>厚度为负：导入后系统会自动检测并标为异常，可在异常列表中处理。</li>
              <li>单位混用：不同岩层使用了米和英尺两种单位时会被提示，建议统一后再导入。</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-stratum-dark flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-stratum-alert text-white text-sm flex items-center justify-center">3</span>
            异常查看说明
          </h2>
        </div>
        <div className="p-6 space-y-4 text-sm text-stratum-dark leading-relaxed">
          <div>
            <h3 className="font-semibold mb-2">如何在列表查看异常</h3>
            <p className="text-stratum-mid">
              进入编辑页后，右侧「异常列表」展示当前剖面检测出的所有异常项。每项显示类型、严重程度、状态与简要描述。点击列表项可在主视图定位到异常所在位置，并在右侧详情面板展开完整信息。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">追溯链路是什么</h3>
            <p className="text-stratum-mid">
              追溯链路记录了某一异常从发现到最终处理的完整操作时间线，包含：
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-stratum-mid">
              <li>发现路径：触发异常的相关操作记录，帮助定位问题引入的步骤。</li>
              <li>处理历史：每次对该异常执行的处理动作、操作人、时间、备注。</li>
              <li>最终结论：标记为「已处理」或「已忽略」时的总结说明。</li>
            </ul>
            <p className="text-stratum-mid mt-2">
              追溯链路的目的是让复盘阶段可以还原问题上下文，避免相同问题重复出现。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">如何添加讲解备注和处理意见</h3>
            <ul className="list-disc list-inside space-y-1.5 text-stratum-mid">
              <li>在异常详情面板中，「讲解备注」用于向学员或后续审核者解释该异常的成因与影响，应使用清晰的中文描述，避免缩写。</li>
              <li>「处理意见」用于记录建议的修正方式或忽略理由，同样使用完整中文表述。</li>
              <li>填写完成后点击「已处理」或「已忽略」按钮，系统会将该状态连同处理意见写入追溯链路，并进入结算统计。</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-stratum-dark flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-stratum-alert text-white text-sm flex items-center justify-center">4</span>
            导出结果说明
          </h2>
        </div>
        <div className="p-6 space-y-4 text-sm text-stratum-dark leading-relaxed">
          <div>
            <h3 className="font-semibold mb-2">两种导出格式区别</h3>
            <ul className="list-disc list-inside space-y-1.5 text-stratum-mid">
              <li><span className="text-stratum-dark font-medium">文本报告（.txt）：</span>排版清晰、适合打印归档或直接阅读，包含统计概览、岩层明细、异常详情、追溯链路与操作记录，使用中文完整表述。</li>
              <li><span className="text-stratum-dark font-medium">JSON 数据（.json）：</span>结构化数据，适合导入其他系统做二次分析或继续编辑，字段与文本报告内容一一对应。</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">报告包含内容</h3>
            <ul className="list-disc list-inside space-y-1.5 text-stratum-mid">
              <li>项目信息：剖面名称、操作员、勘测日期、数据来源、导出时间。</li>
              <li>统计概览：岩层总数、边界总数、异常总数及各状态数量、完成度百分比、异常类型分布。</li>
              <li>岩层明细：逐条列出每层的顶深、底深、厚度、单位、来源、备注。</li>
              <li>异常详情：每处异常的类型、严重程度、状态、问题描述、讲解备注、处理意见、追溯链路。</li>
              <li>操作记录：完整的操作时间线，与撤销/重做功能使用同一份数据。</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">异常说明使用中文不用缩写</h3>
            <p className="text-stratum-mid">
              报告中的异常类型、状态、严重程度均使用完整中文名称（如「边界碰撞」而非英文缩写），讲解备注与处理意见也建议使用规范中文描述，以保证报告可被不同背景的读者理解。
            </p>
          </div>
        </div>
      </section>

      <div className="text-center text-xs text-stratum-mid py-4">
        岩层剖面填色工具 v1.0 · 操作说明
      </div>
    </div>
  )
}
