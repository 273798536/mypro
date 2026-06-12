const { createApp, ref, reactive, computed, onMounted, nextTick, watch } = Vue;
const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

const API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:8000"
  : (location.protocol + "//" + location.hostname + ":8000");

const http = axios.create({ baseURL: API_BASE, timeout: 30000 });

http.interceptors.response.use(
  r => r.data,
  err => {
    const msg = err?.response?.data?.detail || err.message || "请求失败";
    ElMessage.error(msg);
    return Promise.reject(err);
  }
);

const statusTagClass = (s) => ({
  draft: "status-tag-draft", pending: "status-tag-pending",
  approved: "status-tag-approved", rejected: "status-tag-rejected",
  exported: "status-tag-exported",
}[s] || "");

const formatTime = (t) => {
  if (!t) return "-";
  const d = new Date(t);
  if (isNaN(d.getTime())) return t;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

// ========== Dashboard ==========
const Dashboard = {
  props: ["dicts"],
  emits: ["open-detail", "go-list"],
  template: `
    <div>
      <div class="stats-row">
        <div class="stat-card"><div class="label">总试算条数</div><div class="value">{{ summary.total || 0 }}</div><div class="sub">所有记录合计</div></div>
        <div class="stat-card success"><div class="label">已确认 approved</div><div class="value">{{ statusCount('已确认') }}</div><div class="sub">可用于正式报告</div></div>
        <div class="stat-card info"><div class="label">待审核 pending</div><div class="value">{{ statusCount('待审核') }}</div><div class="sub">需项目经理处理</div></div>
        <div class="stat-card warning"><div class="label">⚠️ 重复样本</div><div class="value">{{ summary.duplicate_count || 0 }}</div><div class="sub">需人工核对去重</div></div>
        <div class="stat-card danger"><div class="label">权重修改次数</div><div class="value">{{ summary.weight_change_count || 0 }}</div><div class="sub">每次都有日志留痕</div></div>
      </div>
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:18px;">
        <div class="card">
          <div class="card-title">📊 状态分布 & 指标对比
            <div class="actions"><el-button size="small" type="primary" plain @click="$emit('go-list')">查看全部 →</el-button></div>
          </div>
          <div ref="chartRef" style="width:100%; height:280px;"></div>
        </div>
        <div class="card">
          <div class="card-title">🔍 异常速查 & 快速入口</div>
          <div class="handover-section">
            <h3>⚠️ 需关注</h3>
            <ul>
              <li><b>{{ summary.duplicate_count || 0 }}</b> 条重复样本 → 菜单：重复样本清单</li>
              <li><b>{{ statusCount('已驳回') || 0 }}</b> 条已驳回（需调整参数）</li>
              <li><b>{{ statusCount('草稿') || 0 }}</b> 条草稿（需完善）</li>
              <li><b>{{ summary.historical_answer_count || 0 }}</b> 条历史答案（确认处理状态）</li>
            </ul>
          </div>
          <div class="handover-section">
            <h3>📌 快速入口</h3>
            <ul>
              <li><el-button link type="primary" @click="$emit('go-list')">试算列表 & 多条件筛选</el-button></li>
              <li><el-button link type="warning" @click="$parent.view='duplicates'">仅看重复样本</el-button></li>
              <li><el-button link type="success" @click="$parent.view='import'">批量导入新材料</el-button></li>
              <li><el-button link type="info" @click="$parent.view='exports'">查看导出历史</el-button></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">🕐 最近 10 条试算（含重复标记 & 状态，点行看详情）</div>
        <el-table :data="recent" size="small" stripe @row-click="r=>$emit('open-detail', r.id)" style="cursor:pointer">
          <el-table-column prop="trial_no" label="编号" width="170" class-name="cell-mono" />
          <el-table-column prop="project_name" label="项目" width="170" />
          <el-table-column prop="parameter_name" label="参数名称" width="150" />
          <el-table-column label="先验α/β" width="130">
            <template #default="{row}"><span class="cell-mono">{{row.prior_alpha}} / {{row.prior_beta}}</span></template>
          </el-table-column>
          <el-table-column label="样本 成功/总数" width="110">
            <template #default="{row}">{{row.sample_success}} / {{row.sample_total}}</template>
          </el-table-column>
          <el-table-column prop="posterior_mean" label="后验均值" width="100">
            <template #default="{row}"><b class="cell-mono">{{row.posterior_mean}}</b></template>
          </el-table-column>
          <el-table-column prop="weight" label="权重" width="70" align="center" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{row}"><el-tag :class="statusTagClass(row.status)" size="small" effect="dark">{{row.status_label}}</el-tag></template>
          </el-table-column>
          <el-table-column label="重复" width="80" align="center">
            <template #default="{row}"><span v-if="row.is_duplicate" class="dup-tag">🔁</span><span v-else style="color:#bbb">—</span></template>
          </el-table-column>
          <el-table-column label="创建时间" width="150">
            <template #default="{row}">{{formatTime(row.created_at)}}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  `,
  setup(props, { emit }) {
    const summary = reactive({ total: 0, by_status: {}, duplicate_count: 0, historical_answer_count: 0, weight_change_count: 0 });
    const recent = ref([]);
    const chartRef = ref(null);
    let chart = null;
    const statusCount = (label) => (summary.by_status && summary.by_status[label]) || 0;

    const load = async () => {
      try { Object.assign(summary, await http.get("/api/summary")); } catch (e) {}
      try {
        const res = await http.get("/api/trials", { params: { page: 1, page_size: 10, sort_by: "created_at", sort_order: "desc" } });
        recent.value = res.items;
      } catch (e) {}
      renderChart();
    };

    const renderChart = () => {
      nextTick(() => {
        if (!chartRef.value) return;
        if (!chart) chart = echarts.init(chartRef.value);
        const statuses = Object.keys(summary.by_status || {});
        const counts = Object.values(summary.by_status || {});
        const colorMap = { "草稿": "#909399", "待审核": "#e6a23c", "已确认": "#67c23a", "已驳回": "#f56c6c", "已导出": "#409eff" };
        chart.setOption({
          tooltip: { trigger: "axis" },
          legend: { top: 0 },
          grid: { left: 50, right: 40, top: 40, bottom: 40 },
          xAxis: { type: "category", data: statuses },
          yAxis: [{ type: "value", name: "条数" }],
          series: [{
            type: "bar", barWidth: "40%",
            data: statuses.map((s, i) => ({ value: counts[i], itemStyle: { color: colorMap[s] || "#409eff" } })),
            label: { show: true, position: "top" }
          }]
        });
      });
    };

    onMounted(load);
    return { summary, recent, statusCount, chartRef, formatTime, statusTagClass };
  }
};

// ========== TrialList ==========
const TrialList = {
  props: ["dicts", "forceDuplicateFilter"],
  emits: ["open-detail"],
  template: `
    <div>
      <div class="card">
        <div class="card-title">
          🔎 筛选条件
          <div class="actions">
            <el-button size="small" type="primary" @click="doSearch">🔍 查询</el-button>
            <el-button size="small" @click="resetFilters">重置</el-button>
            <el-button size="small" type="warning" plain :disabled="!selected.length" @click="doExport">📤 导出选中（含截图说明）</el-button>
          </div>
        </div>
        <el-form :inline="true" size="small" :model="filter">
          <el-form-item label="关键词"><el-input v-model="filter.keyword" placeholder="编号/项目/参数/来源文件" clearable style="width:220px"/></el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filter.status" placeholder="全部" clearable style="width:140px">
              <el-option v-for="s in dicts.status" :key="s.code" :label="s.label" :value="s.code" />
            </el-select>
          </el-form-item>
          <el-form-item label="重复样本">
            <el-select v-model="filter.is_duplicate" :disabled="forceDuplicateFilter===true" clearable style="width:140px">
              <el-option label="只看重复" :value="true"/><el-option label="排除重复" :value="false"/>
            </el-select>
          </el-form-item>
          <el-form-item label="来源批次"><el-input v-model="filter.source_batch_no" placeholder="BATCH-xxx" clearable style="width:160px"/></el-form-item>
          <el-form-item label="每页">
            <el-select v-model="filter.page_size" style="width:90px">
              <el-option :value="20" label="20"/><el-option :value="50" label="50"/><el-option :value="100" label="100"/>
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <div class="card">
        <div class="card-title">
          📋 试算列表 <span style="color:#888; font-weight:400; font-size:13px;">共 {{total}} 条 {{forceDuplicateFilter===true ? '（仅重复样本视图）' : ''}}</span>
          <div class="actions"><el-button size="small" type="success" @click="exportAll">📤 导出当前页全部</el-button></div>
        </div>
        <el-table :data="items" size="small" stripe @row-click="r=>$emit('open-detail', r.id)"
                  @selection-change="s=>selected=s"
                  :row-class-name="r=>r.row.is_duplicate?'row-duplicate':''" style="cursor:pointer">
          <el-table-column type="selection" width="42" @click.stop />
          <el-table-column prop="trial_no" label="编号" width="170" class-name="cell-mono" fixed="left" />
          <el-table-column prop="project_name" label="项目" width="160" show-overflow-tooltip />
          <el-table-column prop="parameter_name" label="参数名称" width="140" show-overflow-tooltip />
          <el-table-column label="先验 α/β/均值" width="180">
            <template #default="{row}">
              <div class="cell-mono" style="font-size:12px">α={{row.prior_alpha}}，β={{row.prior_beta}}</div>
              <div class="cell-mono" style="font-size:11px;color:#666">均值 {{row.prior_mean}}</div>
            </template>
          </el-table-column>
          <el-table-column label="样本 成功/总数/失败" width="140" align="center">
            <template #default="{row}">
              <div>{{row.sample_success}} / {{row.sample_total}}</div>
              <div style="font-size:11px;color:#666">失败 {{row.sample_fail}}</div>
            </template>
          </el-table-column>
          <el-table-column label="后验均值" width="100" align="center">
            <template #default="{row}"><b class="cell-mono">{{row.posterior_mean}}</b></template>
          </el-table-column>
          <el-table-column label="权重" width="80" align="center">
            <template #default="{row}">
              <span :style="{color: row.weight_change_count>0?'#e67e22':'#333', fontWeight:row.weight_change_count>0?'700':'400'}">{{row.weight}}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{row}">
              <el-tooltip :content="row.status_export_description" placement="top">
                <el-tag :class="statusTagClass(row.status)" size="small" effect="dark">{{row.status_label}}</el-tag>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="重复样本" width="110" align="center">
            <template #default="{row}">
              <el-tooltip v-if="row.is_duplicate" :content="row.duplicate_reason" placement="top">
                <span class="dup-tag">🔁 重复样本</span>
              </el-tooltip>
              <span v-else style="color:#bbb">—</span>
            </template>
          </el-table-column>
          <el-table-column label="历史答案" width="90" align="center">
            <template #default="{row}">
              <el-tag v-if="row.historical_answer_count>0" type="info" size="small">{{row.historical_answer_count}}</el-tag>
              <span v-else style="color:#bbb">0</span>
            </template>
          </el-table-column>
          <el-table-column label="来源" min-width="200">
            <template #default="{row}">
              <div style="font-size:12px; line-height:1.6">
                <div v-if="row.source_batch_no">批次：{{row.source_batch_no}}</div>
                <div v-if="row.source_filename" style="color:#666">文件：{{row.source_filename}}</div>
                <div v-if="row.source_uploader" style="color:#888">上传：{{row.source_uploader}}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{row}">
              <el-button link type="primary" size="small" @click.stop="$emit('open-detail', row.id)">详情 →</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top:14px; text-align:right">
          <el-pagination small background layout="total, sizes, prev, pager, next, jumper"
                         :total="total" :current-page="filter.page" :page-size="filter.page_size"
                         @current-change="p=>{filter.page=p; doSearch()}"
                         @size-change="s=>{filter.page_size=s; filter.page=1; doSearch()}" />
        </div>
      </div>
    </div>
  `,
  setup(props, { emit }) {
    const filter = reactive({
      keyword: "", status: "",
      is_duplicate: props.forceDuplicateFilter === true ? true : null,
      source_batch_no: "", page: 1, page_size: 20,
    });
    const items = ref([]);
    const total = ref(0);
    const selected = ref([]);

    const doSearch = async () => {
      try {
        const params = { ...filter };
        if ([null, undefined, ""].includes(params.is_duplicate)) delete params.is_duplicate;
        if (!params.status) delete params.status;
        if (!params.keyword) delete params.keyword;
        if (!params.source_batch_no) delete params.source_batch_no;
        const res = await http.get("/api/trials", { params });
        items.value = res.items; total.value = res.total;
      } catch (e) {}
    };
    const resetFilters = () => {
      Object.assign(filter, { keyword: "", status: "", is_duplicate: props.forceDuplicateFilter===true?true:null, source_batch_no: "", page: 1 });
      doSearch();
    };
    const doExport = async () => {
      if (!selected.value.length) return;
      try {
        const ids = selected.value.map(r => r.id);
        const qs = ids.map(i => `trial_ids=${i}`).join("&");
        const res = await axios.post(`${API_BASE}/api/trials/export?${qs}`,
          { export_type: "screenshot", export_format: "xlsx", exported_by: "阿乔" }, { responseType: "blob" });
        const fn = res.headers["content-disposition"]?.match(/filename\*?=UTF-8''(.+)/i)?.[1] || `贝叶斯试算_${Date.now()}.xlsx`;
        downloadBlob(res.data, decodeURIComponent(fn));
        ElMessage.success(`已导出 ${ids.length} 条（含截图说明Sheet）`);
      } catch (e) {}
    };
    const exportAll = async () => {
      if (!items.value.length) return;
      try {
        const ids = items.value.map(r => r.id);
        const qs = ids.map(i => `trial_ids=${i}`).join("&");
        const res = await axios.post(`${API_BASE}/api/trials/export?${qs}`,
          { export_type: "screenshot", export_format: "xlsx", exported_by: "阿乔" }, { responseType: "blob" });
        const fn = res.headers["content-disposition"]?.match(/filename\*?=UTF-8''(.+)/i)?.[1] || `贝叶斯试算_${Date.now()}.xlsx`;
        downloadBlob(res.data, decodeURIComponent(fn));
        ElMessage.success("已导出");
      } catch (e) {}
    };
    onMounted(doSearch);
    return { filter, items, total, selected, doSearch, resetFilters, doExport, exportAll, statusTagClass };
  }
};

// ========== TrialForm ==========
const TrialForm = {
  emits: ["created"],
  template: `
    <div class="card" style="max-width:880px; margin:0 auto;">
      <div class="card-title">➕ 新建贝叶斯先验参数试算</div>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="项目名称" prop="project_name"><el-input v-model="form.project_name" placeholder="例：A系列消费贷模型"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="参数名称" prop="parameter_name"><el-input v-model="form.parameter_name" placeholder="例：首期违约率先验"/></el-form-item></el-col>
        </el-row>
        <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="2" placeholder="背景说明（选填）"/></el-form-item>
        <el-divider content-position="left">先验参数 Beta(α, β)</el-divider>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="先验 α" prop="prior_alpha"><el-input-number v-model="form.prior_alpha" :min="0.01" :precision="4" :step="0.5" style="width:100%"/></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="先验 β" prop="prior_beta"><el-input-number v-model="form.prior_beta" :min="0.01" :precision="4" :step="1" style="width:100%"/></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="先验均值（预览）"><el-input :value="'≈ ' + (form.prior_alpha/(form.prior_alpha+form.prior_beta)).toFixed(6)" disabled /></el-form-item></el-col>
        </el-row>
        <el-divider content-position="left">样本数据（二项） & 权重</el-divider>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="成功数 s" prop="sample_success"><el-input-number v-model="form.sample_success" :min="0" style="width:100%"/></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="总数 n" prop="sample_total"><el-input-number v-model="form.sample_total" :min="0" style="width:100%"/></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="权重"><el-input-number v-model="form.weight" :min="0.01" :precision="2" :step="0.1" style="width:100%"/></el-form-item></el-col>
        </el-row>
        <el-divider content-position="left">数据来源（可选，交接用）</el-divider>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="来源批次"><el-input v-model="form.source_batch_no" placeholder="BATCH-2026-001"/></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="来源文件"><el-input v-model="form.source_filename" placeholder="文件名.xlsx"/></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="创建人"><el-input v-model="form.created_by" placeholder="阿乔"/></el-form-item></el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" @click="submit" :loading="submitting">✅ 计算并创建（自动查重+生成追溯）</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
  `,
  setup(props, { emit }) {
    const formRef = ref(null);
    const submitting = ref(false);
    const form = reactive({
      project_name: "", parameter_name: "", description: "",
      prior_alpha: 2.0, prior_beta: 18.0,
      sample_success: 50, sample_total: 1000, weight: 1.0,
      source_batch_no: "", source_filename: "", source_uploader: "", created_by: "阿乔",
    });
    const rules = {
      project_name: [{ required: true, message: "请输入项目名称" }],
      parameter_name: [{ required: true, message: "请输入参数名称" }],
    };
    const submit = async () => {
      await formRef.value.validate();
      try {
        submitting.value = true;
        const res = await http.post("/api/trials", { ...form });
        ElNotification.success({ title: "创建成功", message: `${res.trial_no}${res.is_duplicate ? '（⚠️ 自动标记重复）' : ''}` });
        emit("created", res.id);
      } finally { submitting.value = false; }
    };
    const reset = () => formRef.value?.resetFields();
    return { formRef, form, rules, submit, reset, submitting };
  }
};
