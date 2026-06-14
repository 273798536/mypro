// ========== TrialDetail ==========
const TrialDetail = {
  props: ["trialId", "dicts"],
  emits: ["back"],
  template: `
    <div v-if="!detail" style="padding:40px; text-align:center; color:#888">加载中...</div>
    <div v-else>
      <div style="margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <el-button link @click="$emit('back')">← 返回列表</el-button>
          <span style="margin-left:14px; font-size:18px; font-weight:600; color:var(--primary)">
            {{detail.trial_no}} · {{detail.project_name}} / {{detail.parameter_name}}
          </span>
          <el-tag v-if="detail.is_duplicate" class="dup-tag" style="margin-left:10px;">
            🔁 重复样本（主ID={{detail.duplicate_of_id||'?'}}）
          </el-tag>
        </div>
        <div style="display:flex; gap:8px;">
          <el-button size="small" type="info" @click="checkDup">🔍 执行重复检测</el-button>
          <el-button size="small" type="success" @click="showScreenshotPreview=true">🖼 截图说明预览</el-button>
          <el-button size="small" type="warning" @click="exportDetail">📤 导出详情全量</el-button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          🧮 核心参数 & 状态（与接口返回同源，保证一致）
          <div class="actions"><el-button size="small" type="primary" @click="showEdit=true">✏️ 编辑参数/改权重/改状态</el-button></div>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><span class="label">编号</span><span class="value cell-mono">{{detail.trial_no}}</span></div>
          <div class="detail-item"><span class="label">状态</span><span><el-tag :class="statusTagClass(detail.status)" effect="dark">{{detail.status_label}}</el-tag></span></div>
          <div class="detail-item"><span class="label">状态说明（导出即此文字）</span><span class="value" style="font-size:13px;color:#555">{{detail.status_export_description}}</span></div>
          <div class="detail-item"><span class="label">状态备注</span><span class="value" style="font-size:13px">{{detail.status_remark || '—'}}</span></div>
          <div class="detail-item"><span class="label">先验 α</span><span class="value cell-mono" style="color:#2e5c8a">{{detail.prior_alpha}}</span></div>
          <div class="detail-item"><span class="label">先验 β</span><span class="value cell-mono" style="color:#2e5c8a">{{detail.prior_beta}}</span></div>
          <div class="detail-item"><span class="label">先验均值 α/(α+β)</span><span class="value cell-mono">{{detail.prior_mean}}</span></div>
          <div class="detail-item"><span class="label">权重</span><span class="value" :style="{color:detail.weight_changes?.length?'#e67e22':'#333'}"><b>{{detail.weight}}</b><el-tag v-if="detail.weight_changes?.length" size="small" type="warning" style="margin-left:6px">改{{detail.weight_changes.length}}次</el-tag></span></div>
          <div class="detail-item"><span class="label">样本成功</span><span class="value">{{detail.sample_success}}</span></div>
          <div class="detail-item"><span class="label">样本总数</span><span class="value">{{detail.sample_total}}</span></div>
          <div class="detail-item"><span class="label">样本失败</span><span class="value">{{detail.sample_fail}}</span></div>
          <div class="detail-item"><span class="label">后验均值 α'/α'+β'</span><span class="value cell-mono" style="color:#e8704a; font-size:18px">{{detail.posterior_mean}}</span></div>
          <div class="detail-item"><span class="label">后验 α'</span><span class="value cell-mono">{{detail.posterior_alpha}}</span></div>
          <div class="detail-item"><span class="label">后验 β'</span><span class="value cell-mono">{{detail.posterior_beta}}</span></div>
          <div class="detail-item"><span class="label">来源批次</span><span class="value">{{detail.source_batch_no || '—'}}</span></div>
          <div class="detail-item"><span class="label">来源文件</span><span class="value" style="font-size:12px">{{detail.source_filename || '—'}}</span></div>
          <div class="detail-item full"><span class="label">说明</span><span class="value">{{detail.description || '—'}}</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">📈 先验 vs 后验 Beta 分布曲线（可视化辅助讲故事）</div>
        <div ref="chartRef" style="width:100%; height:320px;"></div>
      </div>

      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="📜 历史答案（保留原始字段）" name="hist">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
            <span style="color:#888; font-size:13px;">💡 项目经理交来的答案字段名可能前后不一，<b>original_field_names</b> 和 <b>raw_answer_payload</b> 完整保留了原始内容</span>
            <el-button size="small" type="primary" @click="showAddHist=true">➕ 添加历史答案</el-button>
          </div>
          <div v-if="!detail.historical_answers?.length" class="empty">暂无历史答案</div>
          <div v-for="h in detail.historical_answers" :key="h.id" class="hist-card">
            <div class="top" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <el-tag size="small" :type="h.processing_status==='adopted'?'success':(h.processing_status==='ignored'?'danger':'info')">{{h.processing_status_label}}</el-tag>
                <b style="margin-left:8px;">{{h.answer_source}}</b>
                <span style="color:#888; margin-left:8px; font-size:12px;">批次 {{h.answer_batch || '—'}} · {{formatTime(h.created_at)}}</span>
              </div>
              <div>
                <span style="color:#2e5c8a; font-size:16px; font-weight:700;">取值 = {{h.answer_value}}</span>
                <span v-if="h.answer_confidence" style="margin-left:8px; color:#888;">(可信度 {{h.answer_confidence}})</span>
                <el-dropdown style="margin-left:14px;" @command="c=>updateHistStatus(h.id, c)">
                  <el-button size="small" plain>改处理状态 ▾</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="pending">待处理</el-dropdown-item>
                      <el-dropdown-item command="mapped">已映射</el-dropdown-item>
                      <el-dropdown-item command="adopted">✅ 已采纳</el-dropdown-item>
                      <el-dropdown-item command="ignored">已忽略</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 2fr; gap:10px; margin-top:8px;">
              <div style="font-size:12px;"><b style="color:#888;">原始字段名：</b>{{h.original_field_names?.join(', ') || '—'}}</div>
              <div style="font-size:12px;"><b style="color:#888;">标准映射：</b>{{h.standardized_field_map? JSON.stringify(h.standardized_field_map):'—'}}</div>
              <div style="font-size:12px;"><b style="color:#888;">处理说明：</b>{{h.processing_remark || '—'}}</div>
            </div>
            <details v-if="h.raw_answer_payload" style="margin-top:8px;">
              <summary style="cursor:pointer; color:#2e5c8a; font-size:12px;">🔍 查看完整原始载荷（字段名前后不一也保留了）</summary>
              <div class="raw-payload">{{JSON.stringify(h.raw_answer_payload, null, 2)}}</div>
            </details>
            <div v-if="h.weight_change_used_count" style="margin-top:6px; font-size:12px; color:#e67e22;">
              ⚖️ 本历史答案已被 <b>{{h.weight_change_used_count}}</b> 次权重修改引用
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="⚖️ 权重变更记录（关联历史答案）" name="weight">
          <div v-if="!detail.weight_changes?.length" class="empty">暂无权重修改</div>
          <el-table v-else :data="detail.weight_changes" size="small" border>
            <el-table-column label="时间" width="160"><template #default="{row}">{{formatTime(row.changed_at)}}</template></el-table-column>
            <el-table-column label="权重变更" width="240">
              <template #default="{row}">
                <div class="weight-diff">
                  <span>{{row.old_weight}}</span><span class="arrow">→</span>
                  <b style="font-size:15px;">{{row.new_weight}}</b>
                  <span :class="row.delta>=0?'delta-pos':'delta-neg'">({{row.delta>=0?'+':''}}{{row.delta}})</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="关联历史答案" width="200">
              <template #default="{row}">
                <span v-if="row.historical_answer_id">
                  <el-tag type="info" size="small">#{{row.historical_answer_id}}</el-tag>
                  <span style="margin-left:6px; font-size:12px;">{{row.historical_answer_source || ''}}</span>
                </span>
                <span v-else style="color:#aaa;">未关联</span>
              </template>
            </el-table-column>
            <el-table-column label="参考取值" width="100" align="center">
              <template #default="{row}"><b v-if="row.reference_answer_value">{{row.reference_answer_value}}</b><span v-else>—</span></template>
            </el-table-column>
            <el-table-column label="理由" min-width="220"><template #default="{row}">{{row.reason || '—'}}</template></el-table-column>
            <el-table-column label="操作人" width="100"><template #default="{row}">{{row.changed_by || '—'}}</template></el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="🔄 状态变更日志" name="status">
          <div v-if="!detail.status_changes?.length" class="empty">暂无状态变更</div>
          <el-table v-else :data="detail.status_changes" size="small" border>
            <el-table-column label="时间" width="160"><template #default="{row}">{{formatTime(row.changed_at)}}</template></el-table-column>
            <el-table-column label="状态变更" width="260">
              <template #default="{row}">
                <el-tag :class="statusTagClass(row.old_status)" size="small" effect="dark">{{row.old_status_label}}</el-tag>
                <span style="margin:0 8px;">→</span>
                <el-tag :class="statusTagClass(row.new_status)" size="small" effect="dark">{{row.new_status_label}}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="变更说明（截图说明同文字）" min-width="300"><template #default="{row}">{{row.remark || '—'}}</template></el-table-column>
            <el-table-column label="操作人" width="100"><template #default="{row}">{{row.changed_by || '—'}}</template></el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="🔍 追溯线索（人话版·讲故事用）" name="trace">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
            <span style="color:#888; font-size:13px;">💡 彩排进场前：按时间从<b>材料→预处理→计算→调整→定稿</b>，直接读<b>narrative</b>就能讲给不看代码的人听</span>
            <el-button size="small" type="primary" @click="showAddTrace=true">➕ 添加线索</el-button>
          </div>
          <div v-if="!detail.trace_records?.length" class="empty">暂无追溯线索</div>
          <el-timeline v-else>
            <el-timeline-item v-for="t in detail.trace_records" :key="t.id" :timestamp="formatTime(t.operated_at)" placement="top">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px; flex-wrap:wrap;">
                <span class="timeline-stage-badge">{{t.trace_stage_label}}</span>
                <span v-if="t.field_name" style="font-size:12px; color:#888;">字段 <code>{{t.field_name}}</code><span v-if="t.field_value_before||t.field_value_after">：</span><span v-if="t.field_value_before" style="color:#e67e22;">{{t.field_value_before}}</span><span v-if="t.field_value_before&&t.field_value_after"> → </span><span v-if="t.field_value_after" style="color:#27ae60;">{{t.field_value_after}}</span></span>
                <span style="margin-left:auto; font-size:12px; color:#888;">{{t.operator || '系统'}}</span>
              </div>
              <div class="narrative-box">{{t.narrative}}</div>
              <div v-if="t.evidence_ref" style="margin-top:6px; font-size:12px; color:#666;">📎 证据引用：{{t.evidence_ref}}</div>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>

        <el-tab-pane label="📤 导出记录（状态一致性校验）" name="export">
          <div v-if="!detail.export_records?.length" class="empty">暂无导出记录</div>
          <el-table v-else :data="detail.export_records" size="small" border>
            <el-table-column label="导出时间" width="160"><template #default="{row}">{{formatTime(row.exported_at)}}</template></el-table-column>
            <el-table-column prop="export_type" label="类型" width="100" />
            <el-table-column prop="export_filename" label="文件名" min-width="280" show-overflow-tooltip />
            <el-table-column label="导出时状态" width="180">
              <template #default="{row}">
                <div><b>{{row.export_status_label}}</b></div>
                <div style="font-size:11px; color:#888;">(code: {{row.status_at_export}})</div>
              </template>
            </el-table-column>
            <el-table-column label="导出时状态说明" min-width="220"><template #default="{row}">{{row.export_status_description || '—'}}</template></el-table-column>
            <el-table-column label="重复标记" width="90" align="center"><template #default="{row}"><span v-if="row.is_duplicate_at_export" class="dup-tag">重复</span><span v-else>—</span></template></el-table-column>
            <el-table-column label="权重快照" width="90" align="center"><template #default="{row}">{{row.weight_at_export}}</template></el-table-column>
            <el-table-column label="一致性" width="100" align="center">
              <template #default="{row}"><el-tooltip content="接口status和导出说明文字同源，已快照 ✓"><el-tag type="success" size="small" effect="plain">✓ 一致</el-tag></el-tooltip></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <!-- 编辑弹窗 -->
      <el-dialog v-model="showEdit" title="编辑参数 / 改权重 / 改状态" width="720px" destroy-on-close>
        <el-form :model="editForm" ref="editFormRef" label-width="110px">
          <el-divider>参数（改动会自动重算后验）</el-divider>
          <el-row :gutter="16">
            <el-col :span="8"><el-form-item label="先验 α"><el-input-number v-model="editForm.prior_alpha" :min="0.01" :precision="4" style="width:100%"/></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="先验 β"><el-input-number v-model="editForm.prior_beta" :min="0.01" :precision="4" style="width:100%"/></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="权重"><el-input-number v-model="editForm.weight" :min="0.01" :precision="2" style="width:100%"/></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="成功数"><el-input-number v-model="editForm.sample_success" :min="0" style="width:100%"/></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="总数"><el-input-number v-model="editForm.sample_total" :min="0" style="width:100%"/></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="状态">
              <el-select v-model="editForm.status" style="width:100%">
                <el-option v-for="s in dicts.status" :key="s.code" :label="s.label" :value="s.code"/>
              </el-select>
            </el-form-item></el-col>
          </el-row>
          <el-form-item label="状态说明" v-if="editForm.status!==detail.status"><el-input v-model="editForm.status_remark" type="textarea" :rows="2" placeholder="会出现在截图说明里"/></el-form-item>
          <el-divider>权重修改留痕（关联历史答案）</el-divider>
          <el-form-item label="改权重理由"><el-input v-model="editForm.weight_change_reason" placeholder="为什么改权重？"/></el-form-item>
          <el-form-item label="参考历史答案">
            <el-select v-model="editForm.weight_change_historical_answer_id" clearable filterable style="width:100%">
              <el-option v-for="h in detail.historical_answers" :key="h.id" :label="'#' + h.id + ' ' + h.answer_source + ' = ' + h.answer_value" :value="h.id"/>
            </el-select>
          </el-form-item>
          <el-divider>重复样本</el-divider>
          <el-form-item label="是否重复"><el-switch v-model="editForm.is_duplicate"/></el-form-item>
          <el-form-item label="判定理由" v-if="editForm.is_duplicate"><el-input v-model="editForm.duplicate_reason"/></el-form-item>
          <el-form-item label="操作人"><el-input v-model="editForm.updated_by"/></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showEdit=false">取消</el-button>
          <el-button type="primary" @click="submitEdit">保存（自动记日志+追溯）</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="showAddHist" title="添加历史答案（完整保留原始字段）" width="680px" destroy-on-close>
        <el-form :model="histForm" label-width="120px">
          <el-form-item label="答案来源" required><el-input v-model="histForm.answer_source" placeholder="项目经理姓名/历史项目号/文件名"/></el-form-item>
          <el-form-item label="批次"><el-input v-model="histForm.answer_batch"/></el-form-item>
          <el-form-item label="答案取值" required><el-input-number v-model="histForm.answer_value" :precision="6" :step="0.01" style="width:100%"/></el-form-item>
          <el-form-item label="可信度 0-1"><el-input-number v-model="histForm.answer_confidence" :min="0" :max="1" :precision="2" :step="0.05" style="width:100%"/></el-form-item>
          <el-form-item label="原始字段名列表"><el-select v-model="histForm.original_field_names" multiple filterable allow-create style="width:100%" placeholder="回车新增：项目经理Excel原始列名，可能前后不一"/></el-form-item>
          <el-form-item label="标准映射(JSON)"><el-input v-model="histForm._std_map_str" type="textarea" :rows="2" placeholder='{"parameter_name": "违约率", "year": "2024"}'/></el-form-item>
          <el-form-item label="处理状态">
            <el-select v-model="histForm.processing_status" style="width:100%">
              <el-option v-for="s in dicts.processing_status" :key="s.code" :label="s.label" :value="s.code"/>
            </el-select>
          </el-form-item>
          <el-form-item label="处理说明"><el-input v-model="histForm.processing_remark"/></el-form-item>
          <el-form-item label="原始载荷(JSON)"><el-input v-model="histForm._raw_str" type="textarea" :rows="4" placeholder="完整原始数据，字段名前后不一也没关系，完整保存"/></el-form-item>
          <el-form-item label="录入人"><el-input v-model="histForm.created_by"/></el-form-item>
        </el-form>
        <template #footer><el-button @click="showAddHist=false">取消</el-button><el-button type="primary" @click="submitAddHist">添加</el-button></template>
      </el-dialog>

      <el-dialog v-model="showAddTrace" title="添加追溯线索（人话版）" width="620px" destroy-on-close>
        <el-form :model="traceForm" label-width="110px">
          <el-form-item label="阶段"><el-select v-model="traceForm.trace_stage" style="width:100%">
            <el-option v-for="s in dicts.trace_stage" :key="s.code" :label="s.label" :value="s.code"/>
          </el-select></el-form-item>
          <el-form-item label="涉及字段"><el-input v-model="traceForm.field_name"/></el-form-item>
          <el-row :gutter="12">
            <el-col :span="12"><el-form-item label="变更前"><el-input v-model="traceForm.field_value_before"/></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="变更后"><el-input v-model="traceForm.field_value_after"/></el-form-item></el-col>
          </el-row>
          <el-form-item label="人话描述(必填)"><el-input v-model="traceForm.narrative" type="textarea" :rows="3" placeholder="直接写能讲给业务同事听的话"/></el-form-item>
          <el-form-item label="证据引用"><el-input v-model="traceForm.evidence_ref" placeholder="文件名/消息链接/会议纪要"/></el-form-item>
          <el-form-item label="操作人"><el-input v-model="traceForm.operator"/></el-form-item>
        </el-form>
        <template #footer><el-button @click="showAddTrace=false">取消</el-button><el-button type="primary" @click="submitAddTrace">添加</el-button></template>
      </el-dialog>

      <el-dialog v-model="showScreenshotPreview" title="🖼 截图说明预览（导出的Excel里就是这段文字）" width="760px">
        <div class="screenshot-preview" v-html="screenshotHtml"></div>
        <div style="margin-top:12px; font-size:12px; color:#888;">
          💡 本预览文字与接口返回的 <code>status / status_export_description / status_remark / is_duplicate</code> 字段
          <b style="color:#2e5c8a;">来自同一数据源</b>，保证页面状态与文件说法一致。
        </div>
      </el-dialog>
    </div>
  `,
  setup(props, { emit }) {
    const detail = ref(null);
    const activeTab = ref("hist");
    const showEdit = ref(false), showAddHist = ref(false), showAddTrace = ref(false), showScreenshotPreview = ref(false);
    const chartRef = ref(null);
    let chart = null;

    const editFormRef = ref(null);
    const editForm = reactive({});
    const histForm = reactive({
      answer_source: "", answer_batch: "", answer_value: 0.05, answer_confidence: 0.8,
      original_field_names: [], processing_status: "pending", processing_remark: "",
      _std_map_str: "", _raw_str: "", created_by: "阿乔",
    });
    const traceForm = reactive({
      trace_stage: "adjust", field_name: "", field_value_before: "",
      field_value_after: "", narrative: "", evidence_ref: "", operator: "阿乔",
    });

    const screenshotHtml = computed(() => {
      if (!detail.value) return "";
      const d = detail.value;
      const esc = (s) => s == null ? "" : String(s).replace(/[<>]/g, "");
      const lines = [
        `<div class="title">贝叶斯先验参数试算 · ${esc(d.trial_no)}</div>`,
        `项目：<b>${esc(d.project_name)}</b> ｜ 参数：<b>${esc(d.parameter_name)}</b>`,
        `先验 α=${d.prior_alpha}, β=${d.prior_beta}；样本 成功/总数=${d.sample_success}/${d.sample_total}；权重=${d.weight}`,
        `后验 α'=${d.posterior_alpha}, β'=${d.posterior_beta}；后验均值=<span class="hl">${d.posterior_mean}</span>`,
        `当前状态：<span class="hl">【${esc(d.status_label)}】</span>${esc(d.status_export_description) || ''}`,
      ];
      if (d.status_remark) lines.push(`状态说明：${esc(d.status_remark)}`);
      if (d.is_duplicate) lines.push(`<span class="warn">⚠️ 重复样本：${esc(d.duplicate_reason) || ''}</span>`);
      if (d.historical_answers?.length) {
        const adopted = d.historical_answers.filter(h => h.processing_status === "adopted");
        if (adopted.length) lines.push(`参考历史答案（已采纳）：<span class="hl">${adopted.map(h => `${h.answer_source}=${h.answer_value}`).join(", ")}</span>`);
      }
      if (d.source_filename || d.source_batch_no) lines.push(`数据来源：批次=${esc(d.source_batch_no)||'N/A'}｜文件=${esc(d.source_filename)||'N/A'}｜上传人=${esc(d.source_uploader)||'N/A'}`);
      lines.push(`导出时间：${new Date().toLocaleString('zh-CN')}`);
      return lines.join("\n");
    });

    const load = async () => {
      detail.value = await http.get(`/api/trials/${props.trialId}`);
      Object.assign(editForm, {
        prior_alpha: detail.value.prior_alpha, prior_beta: detail.value.prior_beta,
        weight: detail.value.weight, sample_success: detail.value.sample_success,
        sample_total: detail.value.sample_total, status: detail.value.status,
        status_remark: detail.value.status_remark || "", is_duplicate: detail.value.is_duplicate,
        duplicate_reason: detail.value.duplicate_reason || "",
        weight_change_reason: "", weight_change_historical_answer_id: null,
        updated_by: "阿乔",
      });
      renderChart();
    };

    const renderChart = () => {
      if (!detail.value) return;
      nextTick(() => {
        if (!chartRef.value) return;
        if (!chart) chart = echarts.init(chartRef.value);
        const d = detail.value;
        const mu1 = d.prior_mean, mu2 = d.posterior_mean;
        const range = Math.max(0.05, 4 * Math.max(Math.max(0.001, mu1*(1-mu1)), Math.max(0.001, mu2*(1-mu2))));
        const xmin = Math.max(0, Math.min(mu1, mu2) - range);
        const xmax = Math.min(1, Math.max(mu1, mu2) + range);
        const N = 300;
        const xs = [], y1 = [], y2 = [];
        const logGamma = (z) => {
          // Lanczos近似
          const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
          if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
          z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
          const t = z + g + 0.5;
          return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
        };
        const betaPdf = (x, a, b) => Math.exp((a-1)*Math.log(Math.max(x,1e-10)) + (b-1)*Math.log(Math.max(1-x,1e-10)) - (logGamma(a)+logGamma(b)-logGamma(a+b)));
        for (let i = 0; i <= N; i++) {
          const xv = xmin + (xmax-xmin)*i/N;
          xs.push(xv.toFixed(4));
          y1.push(+betaPdf(xv, d.prior_alpha, d.prior_beta).toFixed(4));
          y2.push(+betaPdf(xv, d.posterior_alpha, d.posterior_beta).toFixed(4));
        }
        chart.setOption({
          tooltip: { trigger: "axis" },
          legend: { top: 0 },
          grid: { left: 60, right: 40, top: 40, bottom: 50 },
          xAxis: { type: "category", data: xs, name: "p", nameLocation: "middle", nameGap: 30, axisLabel: { interval: Math.floor(N/8), formatter: v => (+v).toFixed(2) } },
          yAxis: { type: "value", name: "概率密度" },
          series: [
            { name: `先验 Beta(α=${d.prior_alpha}, β=${d.prior_beta}) 均值=${d.prior_mean}`, type: "line", data: y1, smooth: true, showSymbol: false,
              lineStyle: { color: "#4a7fb5", width: 2.5 }, areaStyle: { color: "rgba(74,127,181,0.15)" } },
            { name: `后验 Beta(α'=${d.posterior_alpha}, β'=${d.posterior_beta}) 均值=${d.posterior_mean}`, type: "line", data: y2, smooth: true, showSymbol: false,
              lineStyle: { color: "#e8704a", width: 3 }, areaStyle: { color: "rgba(232,112,74,0.2)" } },
          ]
        });
      });
    };

    const checkDup = async () => {
      const r = await http.post(`/api/trials/${props.trialId}/check-duplicate`);
      if (r.total_matches) ElMessage.warning(`找到 ${r.total_matches} 条重复：${r.duplicates_found.map(x => x.duplicate_of_trial_no).join(', ')}`);
      else ElMessage.success("未检测到重复样本");
    };

    const submitEdit = async () => {
      await http.put(`/api/trials/${props.trialId}`, { ...editForm });
      ElMessage.success("已保存，追溯线索和日志已自动记录");
      showEdit.value = false;
      load();
    };
    const submitAddHist = async () => {
      if (!histForm.answer_source) return ElMessage.warning("请填答案来源");
      const payload = {
        answer_source: histForm.answer_source, answer_batch: histForm.answer_batch,
        answer_value: histForm.answer_value, answer_confidence: histForm.answer_confidence,
        original_field_names: histForm.original_field_names?.length ? histForm.original_field_names : null,
        processing_status: histForm.processing_status, processing_remark: histForm.processing_remark,
        created_by: histForm.created_by,
      };
      if (histForm._std_map_str) try { payload.standardized_field_map = JSON.parse(histForm._std_map_str); } catch(e) {}
      if (histForm._raw_str) try { payload.raw_answer_payload = JSON.parse(histForm._raw_str); } catch(e) {}
      await http.post(`/api/trials/${props.trialId}/historical-answers`, payload);
      ElMessage.success("已添加历史答案，追溯线索已自动生成");
      showAddHist.value = false; Object.assign(histForm, { answer_source:"", answer_batch:"", answer_value:0.05, answer_confidence:0.8, original_field_names:[], processing_status:"pending", processing_remark:"", _std_map_str:"", _raw_str:"", created_by:"阿乔" });
      load();
    };
    const submitAddTrace = async () => {
      if (!traceForm.narrative) return ElMessage.warning("请填人话描述");
      await http.post(`/api/trials/${props.trialId}/traces`, { ...traceForm });
      ElMessage.success("已添加追溯线索");
      showAddTrace.value = false;
      load();
    };
    const updateHistStatus = async (id, status) => {
      await http.put(`/api/historical-answers/${id}`, { processing_status: status });
      ElMessage.success("处理状态已更新");
      load();
    };
    const exportDetail = async () => {
      await doExportDetail(props.trialId);
      load();
    };

    onMounted(load);
    return {
      detail, activeTab, screenshotHtml, chartRef,
      showEdit, showAddHist, showAddTrace, showScreenshotPreview,
      editForm, editFormRef, histForm, traceForm,
      formatTime, statusTagClass,
      checkDup, submitEdit, submitAddHist, submitAddTrace, updateHistStatus, exportDetail,
    };
  }
};

// ========== TrialImport ==========
const TrialImport = {
  emits: ["imported"],
  template: `
    <div style="max-width:960px; margin:0 auto;">
      <div class="card">
        <div class="card-title">📥 批量导入（字段名前后不一也能处理，自动保留来源）</div>
        <el-form :model="form" label-width="130px">
          <el-row :gutter="16">
            <el-col :span="8"><el-form-item label="来源文件名*" required><el-input v-model="form.source_filename" placeholder="项目经理交来的文件名.xlsx"/></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="来源批次号"><el-input v-model="form.source_batch_no" placeholder="BATCH-2026-001"/></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="上传人"><el-input v-model="form.source_uploader" placeholder="阿乔"/></el-form-item></el-col>
          </el-row>
          <el-form-item label="上传文件"><el-upload :auto-upload="false" :on-change="onFile" :limit="1" accept=".xlsx,.xls,.csv"><el-button type="primary">选择 Excel/CSV</el-button></el-upload></el-form-item>
          <el-divider content-position="left">字段映射（解决字段名前后不一）</el-divider>
          <div style="background:#fafafa; padding:14px; border-radius:6px; margin-bottom:14px;">
            <div style="margin-bottom:8px; color:#666; font-size:13px;">
              💡 把<b>原始列名</b>映射到标准字段。左=项目经理原始列名（从文件解析），右=系统标准字段（下拉选）
            </div>
            <div v-for="(m, idx) in fieldMap" :key="idx" style="display:flex; gap:10px; margin-bottom:8px; align-items:center;">
              <el-input v-model="m.orig" placeholder="原始列名，例：Alpha_先验" style="flex:1;" />
              <span style="color:#999;">→</span>
              <el-select v-model="m.std" placeholder="标准字段" style="flex:1;">
                <el-option label="project_name 项目名称" value="project_name"/>
                <el-option label="parameter_name 参数名称" value="parameter_name"/>
                <el-option label="description 说明" value="description"/>
                <el-option label="prior_alpha 先验α" value="prior_alpha"/>
                <el-option label="prior_beta 先验β" value="prior_beta"/>
                <el-option label="weight 权重" value="weight"/>
                <el-option label="sample_success 样本成功数" value="sample_success"/>
                <el-option label="sample_total 样本总数" value="sample_total"/>
                <el-option label="source_batch_no 来源批次" value="source_batch_no"/>
              </el-select>
              <el-button circle size="small" type="danger" @click="fieldMap.splice(idx,1)">×</el-button>
            </div>
            <el-button size="small" plain @click="fieldMap.push({orig:'', std:''})">➕ 加一条映射</el-button>
          </div>
          <el-divider content-position="left">预览（解析后的前 3 行）</el-divider>
          <el-table v-if="parsedPreview.length" :data="parsedPreview" size="small" border max-height="240">
            <el-table-column v-for="k in parsedCols" :key="k" :prop="k" :label="k" min-width="120" show-overflow-tooltip />
          </el-table>
          <div v-else style="padding:20px; text-align:center; color:#aaa;">上传文件或直接粘贴 JSON 即可预览</div>
          <el-divider content-position="left">或者直接粘贴 JSON 数据</el-divider>
          <el-form-item label="JSON 数组"><el-input v-model="form.jsonStr" type="textarea" :rows="5" placeholder='[{"项目":"A","先验α":2,...}]' /></el-form-item>
          <el-form-item>
            <el-button type="primary" @click="submit" :loading="loading">🚀 执行导入（自动查重+生成追溯）</el-button>
            <el-button @click="$emit('imported')">跳过，去列表看</el-button>
          </el-form-item>
        </el-form>
        <el-alert v-if="lastResult" style="margin-top:14px;"
                  :title="'导入结果：成功 ' + lastResult.created_count + '，失败 ' + lastResult.error_count"
                  :type="lastResult.error_count?'warning':'success'" show-icon closable>
          <div v-if="lastResult.errors?.length" style="margin-top:8px;">
            <div style="font-weight:600; margin-bottom:6px;">错误明细：</div>
            <el-table :data="lastResult.errors" size="small" border>
              <el-table-column prop="row" label="行号" width="60"/>
              <el-table-column prop="error" label="错误原因" min-width="220"/>
              <el-table-column prop="raw" label="原始数据" min-width="280"><template #default="{row}">{{JSON.stringify(row.raw)}}</template></el-table-column>
            </el-table>
          </div>
        </el-alert>
      </div>
    </div>
  `,
  setup(props, { emit }) {
    const form = reactive({
      source_filename: "", source_batch_no: "", source_uploader: "阿乔", jsonStr: "",
    });
    const fieldMap = reactive([{ orig: "项目", std: "project_name" }, { orig: "参数", std: "parameter_name" }]);
    const parsedPreview = ref([]);
    const parsedCols = ref([]);
    const loading = ref(false);
    const lastResult = ref(null);
    let rawRecords = [];

    const parseFile = async (file) => {
      try {
        const buf = await file.arrayBuffer();
        const data = new Uint8Array(buf);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rawRecords = XLSX.utils.sheet_to_json(sheet, { defval: null });
        refreshPreview();
        // 自动猜字段映射
        const cols = parsedCols.value;
        const guesses = { 项目: "project_name", 参数: "parameter_name", 先验α: "prior_alpha", 先验Beta: "prior_beta", Alpha: "prior_alpha", Beta: "prior_beta", 成功数: "sample_success", 总数: "sample_total", 权重: "weight" };
        cols.forEach(c => { if (guesses[c] && !fieldMap.find(m => m.orig === c)) fieldMap.push({ orig: c, std: guesses[c] }); });
      } catch (e) { ElMessage.error("解析失败：" + e.message); }
    };

    const onFile = (uploadFile) => {
      form.source_filename = form.source_filename || uploadFile.name;
      // 动态加载 SheetJS
      if (window.XLSX) { parseFile(uploadFile.raw); return; }
      const s = document.createElement("script");
      s.src = "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload = () => parseFile(uploadFile.raw);
      document.head.appendChild(s);
    };

    const refreshPreview = () => {
      let recs = rawRecords;
      if (!recs?.length && form.jsonStr) { try { recs = JSON.parse(form.jsonStr); rawRecords = recs; } catch(e) {} }
      const all = new Set();
      (recs || []).forEach(r => Object.keys(r).forEach(k => all.add(k)));
      parsedCols.value = [...all];
      parsedPreview.value = (recs || []).slice(0, 3);
    };

    watch(() => form.jsonStr, refreshPreview);

    const submit = async () => {
      if (!form.source_filename) return ElMessage.warning("请填来源文件名");
      const mapping = {};
      fieldMap.forEach(m => { if (m.orig && m.std) mapping[m.orig] = m.std; });
      let recs = rawRecords;
      if (!recs?.length && form.jsonStr) try { recs = JSON.parse(form.jsonStr); } catch(e) { return ElMessage.error("JSON解析失败"); }
      if (!recs?.length) return ElMessage.warning("没有要导入的数据");
      loading.value = true;
      try {
        const fd = new FormData();
        fd.append("source_filename", form.source_filename);
        if (form.source_batch_no) fd.append("source_batch_no", form.source_batch_no);
        if (form.source_uploader) fd.append("source_uploader", form.source_uploader);
        fd.append("records_json", JSON.stringify(recs));
        fd.append("field_mapping_json", JSON.stringify(mapping));
        lastResult.value = await http.post("/api/trials/batch-import", fd, { headers: { "Content-Type": "multipart/form-data" } });
        ElNotification.success({ title: "导入完成", message: `成功 ${lastResult.value.created_count}，失败 ${lastResult.value.error_count}` });
        if (!lastResult.value.error_count) setTimeout(() => emit("imported"), 800);
      } finally { loading.value = false; }
    };
    return { form, fieldMap, parsedPreview, parsedCols, loading, lastResult, onFile, submit };
  }
};

// ========== ExportRecords ==========
const ExportRecords = {
  template: `
    <div class="card">
      <div class="card-title">📤 所有导出记录（每次导出都快照了当时的状态、权重、重复标记）
        <div class="actions"><el-button size="small" @click="load">🔄 刷新</el-button></div>
      </div>
      <el-table :data="items" size="small" border>
        <el-table-column label="导出时间" width="160"><template #default="{row}">{{formatTime(row.exported_at)}}</template></el-table-column>
        <el-table-column prop="trial_no" label="试算编号" width="170" class-name="cell-mono" />
        <el-table-column prop="export_type" label="类型" width="100" />
        <el-table-column prop="export_filename" label="文件名" min-width="300" show-overflow-tooltip />
        <el-table-column label="导出时状态" width="150">
          <template #default="{row}"><b>{{row.export_status_label}}</b><div style="font-size:11px;color:#888;">({{row.status_at_export}})</div></template>
        </el-table-column>
        <el-table-column label="重复标记" width="90" align="center"><template #default="{row}"><span v-if="row.is_duplicate_at_export" class="dup-tag">重复</span><span v-else>—</span></template></el-table-column>
        <el-table-column label="权重快照" width="100" align="center"><template #default="{row}">{{row.weight_at_export}}</template></el-table-column>
        <el-table-column prop="exported_by" label="操作人" width="100" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{row}">
            <el-button link type="primary" size="small" @click="download(row.export_filename)">下载</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!items.length" style="padding:24px; text-align:center; color:#aaa;">暂无导出记录</div>
    </div>
  `,
  setup() {
    const items = ref([]);
    const load = async () => { items.value = await http.get("/api/export-records"); };
    const download = async (fn) => {
      await doDownloadExportFile(fn);
    };
    onMounted(load);
    return { items, load, download, formatTime };
  }
};

// ========== Handover ==========
const Handover = {
  props: ["dicts"],
  template: `
    <div>
      <div class="card">
        <div class="card-title">🧭 项目经理交接指引（不用问开发也能上手）</div>
        <div v-for="s in handover?.sections || []" :key="s.title" class="handover-section">
          <h3>{{ s.title }}</h3>
          <ul>
            <li v-for="(it, i) in s.items" :key="i" v-html="it.replace(/(GET|POST|PUT) \/[^\s]+/g, function(m){ return '<code>' + m + '</code>' }).replace(/backend[^\s]+\.db/g, function(m){ return '<code>' + m + '</code>' })"></li>
          </ul>
        </div>
      </div>
      <div class="card">
        <div class="card-title">📖 字典（前后端一致，同源同文字）</div>
        <el-tabs>
          <el-tab-pane label="状态码 status" name="s">
            <el-table :data="dicts.status" size="small" border>
              <el-table-column prop="code" label="code" width="120"/>
              <el-table-column prop="label" label="页面显示文字" width="120"/>
              <el-table-column prop="export_description" label="导出截图说明文字（与页面同源）" min-width="300"/>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="历史答案处理状态" name="p">
            <el-table :data="dicts.processing_status" size="small" border>
              <el-table-column prop="code" label="code" width="120"/>
              <el-table-column prop="label" label="显示文字" width="200"/>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="追溯阶段 trace_stage" name="t">
            <el-table :data="dicts.trace_stage" size="small" border>
              <el-table-column prop="code" label="code" width="140"/>
              <el-table-column prop="label" label="阶段说明（给业务讲故事）" width="300"/>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  `,
  setup() {
    const handover = ref(null);
    onMounted(async () => { try { const r = await http.get("/api/directories"); handover.value = r.project_handover; } catch(e) {} });
    return { handover };
  }
};

// ========== 主App ==========
const App = {
  components: { Dashboard, TrialList, TrialForm, TrialDetail, TrialImport, ExportRecords, Handover },
  template: `
    <div class="app-layout">
      <header class="app-header">
        <h1>
          <span>📊 贝叶斯先验参数试算</span>
          <span class="subtitle">｜投研助理阿乔 · 历史记录 · 状态一致 · 重复标记 · 线索追溯</span>
        </h1>
        <div class="user-actions">
          <el-button type="primary" plain size="small" @click="seedDemo" :loading="seeding">🎯 一键生成演示数据</el-button>
          <el-button type="success" plain size="small" @click="view='handover'">📋 交接指引</el-button>
        </div>
      </header>
      <div class="app-body">
        <aside class="app-sider">
          <div class="menu-title">主菜单</div>
          <div class="menu-item" :class="{active: view==='dashboard'}" @click="view='dashboard'"><span class="icon">📈</span><span class="txt">总览看板</span></div>
          <div class="menu-item" :class="{active: view==='list'}" @click="view='list'"><span class="icon">📋</span><span class="txt">试算列表 & 筛选</span></div>
          <div class="menu-item" :class="{active: view==='create'}" @click="view='create'"><span class="icon">➕</span><span class="txt">新建试算</span></div>
          <div class="menu-item" :class="{active: view==='import'}" @click="view='import'"><span class="icon">📥</span><span class="txt">批量导入</span></div>
          <div class="menu-title">异常 & 导出</div>
          <div class="menu-item" :class="{active: view==='duplicates'}" @click="view='duplicates'"><span class="icon">⚠️</span><span class="txt">重复样本清单</span></div>
          <div class="menu-item" :class="{active: view==='exports'}" @click="view='exports'"><span class="icon">📤</span><span class="txt">导出记录</span></div>
          <div class="menu-title">交接</div>
          <div class="menu-item" :class="{active: view==='handover'}" @click="view='handover'"><span class="icon">🧭</span><span class="txt">交接指引 / 字典</span></div>
        </aside>
        <main class="app-main">
          <Dashboard v-if="view==='dashboard'" :dicts="dicts" @open-detail="openDetail" @go-list="view='list'" />
          <TrialList v-if="view==='list'" :dicts="dicts" :force-duplicate-filter="false" @open-detail="openDetail" />
          <TrialList v-if="view==='duplicates'" :dicts="dicts" :force-duplicate-filter="true" @open-detail="openDetail" />
          <TrialForm v-if="view==='create'" @created="onTrialCreated" />
          <TrialImport v-if="view==='import'" @imported="onImported" />
          <TrialDetail v-if="view==='detail' && currentTrialId" :trial-id="currentTrialId" :dicts="dicts" @back="view='list'" />
          <ExportRecords v-if="view==='exports'" />
          <Handover v-if="view==='handover'" :dicts="dicts" />
        </main>
      </div>
    </div>
  `,
  setup() {
    const view = ref("dashboard");
    const currentTrialId = ref(null);
    const seeding = ref(false);
    const dicts = ref({ status: [], processing_status: [], trace_stage: [] });
    const loadDicts = async () => { try { dicts.value = await http.get("/api/dicts"); } catch(e) {} };
    onMounted(loadDicts);
    const openDetail = (id) => { currentTrialId.value = id; view.value = "detail"; };
    const onTrialCreated = (id) => openDetail(id);
    const onImported = () => { view.value = "list"; };
    const seedDemo = async () => {
      try { seeding.value = true; await http.post("/api/seed-demo-data");
        ElNotification.success({ title: "演示数据已生成", message: "8+条试算、历史答案、权重日志、重复样本、状态流转", duration: 4000 });
        view.value = "dashboard";
      } finally { seeding.value = false; }
    };
    return { view, currentTrialId, dicts, seeding, seedDemo, openDetail, onTrialCreated, onImported };
  }
};

const app = createApp(App);
for (const [key, comp] of Object.entries(ElementPlusIconsVue || {})) app.component(key, comp);
app.use(ElementPlus);
app.mount("#app");
