const { createApp, ref, reactive, onMounted, computed, watch, nextTick } = Vue;

const STATUS_MAP = {
  NORMAL: { label: '正常', type: 'success' },
  RED_INVOICED: { label: '已红冲', type: 'danger' },
  PAID: { label: '已付款', type: 'warning' },
  VOID: { label: '已作废', type: 'info' },
  PENDING: { label: '待付款', type: 'info' },
  CANCELLED: { label: '已取消', type: 'danger' },
  ADJUSTED: { label: '已调整', type: 'warning' },
  DRAFT: { label: '草稿', type: 'info' },
  SUBMITTED: { label: '已提交', type: '' },
  APPROVED: { label: '已审批', type: 'success' },
  REJECTED: { label: '已驳回', type: 'danger' },
  EXECUTED: { label: '已执行', type: 'success' },
  INVALID: { label: '已作废', type: 'danger' },
};

const InvoiceList = {
  name: 'InvoiceList',
  template: `
    <div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
        <el-input v-model="filters.supplierName" placeholder="供应商名称" clearable style="width:200px" @clear="loadData" @keyup.enter="loadData"></el-input>
        <el-select v-model="filters.status" placeholder="发票状态" clearable style="width:140px" @change="loadData">
          <el-option label="正常" value="NORMAL"></el-option>
          <el-option label="已红冲" value="RED_INVOICED"></el-option>
          <el-option label="已付款" value="PAID"></el-option>
        </el-select>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>

      <el-table :data="invoices" border stripe size="small" v-loading="loading" @row-click="showDetail">
        <el-table-column prop="invoiceNo" label="发票号" width="130">
          <template #default="{ row }">
            <span class="trace-link">{{ row.invoiceNo }}</span>
            <span v-if="row.status === 'RED_INVOICED'" class="red-invoice-badge" style="margin-left:4px;">红冲</span>
          </template>
        </el-table-column>
        <el-table-column prop="supplierName" label="供应商" width="160"></el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">{{ formatMoney(row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column label="发票日期" width="110">
          <template #default="{ row }">{{ formatDate(row.invoiceDate) }}</template>
        </el-table-column>
        <el-table-column label="到期日" width="110">
          <template #default="{ row }">{{ formatDate(row.dueDate) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="付款计划" width="120">
          <template #default="{ row }">
            <span v-if="row.paymentPlan" class="trace-link" @click.stop="$emit('navigate', 'paymentPlans', row.paymentPlan.id)">
              {{ row.paymentPlan.planNo }}
            </span>
            <span v-else style="color:#999;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="最新报价" width="100">
          <template #default="{ row }">
            <span v-if="row.discountQuotes && row.discountQuotes.length" class="trace-link" @click.stop="$emit('navigate', 'quotes', row.discountQuotes[0].id)">
              {{ row.discountQuotes[0].quoteNo?.substring(0,12) }}...
            </span>
            <span v-else style="color:#999;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click.stop="openCalc(row)" :disabled="row.status !== 'NORMAL'">试算</el-button>
            <el-button size="small" type="warning" @click.stop="openRedInvoice(row)" :disabled="row.status !== 'NORMAL'">红冲</el-button>
            <el-button size="small" @click.stop="showTrace(row)">追溯</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination style="margin-top:12px;text-align:right;" :current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="(p) => { page = p; loadData(); }"></el-pagination>

      <el-dialog v-model="detailVisible" :title="'发票详情 - ' + (detail.invoiceNo || '')" width="700px">
        <el-descriptions :column="2" border size="small" v-if="detail">
          <el-descriptions-item label="发票号">{{ detail.invoiceNo }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ detail.supplierName }}</el-descriptions-item>
          <el-descriptions-item label="金额">{{ formatMoney(detail.amount) }}</el-descriptions-item>
          <el-descriptions-item label="税额">{{ formatMoney(detail.taxAmount) }}</el-descriptions-item>
          <el-descriptions-item label="价税合计">{{ formatMoney(detail.totalAmount) }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag :type="statusType(detail.status)" size="small">{{ statusLabel(detail.status) }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="发票日期">{{ formatDate(detail.invoiceDate) }}</el-descriptions-item>
          <el-descriptions-item label="到期日">{{ formatDate(detail.dueDate) }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="detail && detail.redInvoice" style="margin-top:12px;">
          <el-alert type="error" :closable="false" title="红冲发票">
            <span>关联红冲发票: <span class="trace-link" @click="$emit('navigate', 'invoices', detail.redInvoice.id)">{{ detail.redInvoice.invoiceNo }}</span></span>
          </el-alert>
        </div>
        <div v-if="detail && detail.discountQuotes && detail.discountQuotes.length" style="margin-top:12px;">
          <div style="font-weight:600;margin-bottom:8px;">关联折扣报价</div>
          <el-table :data="detail.discountQuotes" border size="small">
            <el-table-column prop="quoteNo" label="报价号" width="140"></el-table-column>
            <el-table-column label="折扣率" width="80"><template #default="{ row }">{{ (row.discountRate * 100).toFixed(2) }}%</template></el-table-column>
            <el-table-column label="节省金额"><template #default="{ row }"><span class="saving-highlight">{{ formatMoney(row.savingAmount) }}</span></template></el-table-column>
            <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
          </el-table>
        </div>
      </el-dialog>

      <el-dialog v-model="redInvoiceVisible" title="发票红冲" width="500px">
        <el-alert type="warning" :closable="false" style="margin-bottom:16px;" title="红冲后将自动作废该发票所有未完成报价，且不可恢复"></el-alert>
        <el-form :model="redInvoiceForm" label-width="100px" size="small">
          <el-form-item label="红冲发票号"><el-input v-model="redInvoiceForm.redInvoiceNo" placeholder="留空自动生成"></el-input></el-form-item>
          <el-form-item label="备注"><el-input v-model="redInvoiceForm.remark" type="textarea" :rows="2"></el-input></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="redInvoiceVisible = false">取消</el-button>
          <el-button type="danger" @click="doRedInvoice">确认红冲</el-button>
        </template>
      </el-dialog>
    </div>
  `,
  emits: ['navigate', 'openCalc'],
  setup(props, { emit }) {
    const invoices = ref([]);
    const loading = ref(false);
    const page = ref(1);
    const pageSize = ref(20);
    const total = ref(0);
    const filters = reactive({ supplierName: '', status: '' });
    const detailVisible = ref(false);
    const detail = ref(null);
    const redInvoiceVisible = ref(false);
    const redInvoiceTarget = ref(null);
    const redInvoiceForm = reactive({ redInvoiceNo: '', remark: '' });

    async function loadData() {
      loading.value = true;
      try {
        const res = await api.invoices.list({ ...filters, page: page.value, pageSize: pageSize.value });
        if (res.success) { invoices.value = res.data; total.value = res.pagination.total; }
      } finally { loading.value = false; }
    }

    async function showDetail(row) {
      const res = await api.invoices.get(row.id);
      if (res.success) { detail.value = res.data; detailVisible.value = true; }
    }

    function openCalc(row) { emit('openCalc', row); }
    function openRedInvoice(row) { redInvoiceTarget.value = row; redInvoiceForm.redInvoiceNo = ''; redInvoiceForm.remark = ''; redInvoiceVisible.value = true; }

    async function doRedInvoice() {
      if (!redInvoiceTarget.value) return;
      try {
        const res = await api.invoices.redInvoice(redInvoiceTarget.value.id, { ...redInvoiceForm, sourceType: 'MANUAL_RED_INVOICE', sourceId: redInvoiceTarget.value.id });
        if (res.success) { ElementPlus.ElMessage.success(res.message); redInvoiceVisible.value = false; loadData(); }
      } catch (e) { ElementPlus.ElMessage.error(e.response?.data?.message || '红冲失败'); }
    }

    async function showTrace(row) {
      const res = await api.invoices.trace(row.id);
      if (res.success) { emit('navigate', 'trace', res.data); }
    }

    function formatMoney(v) { return v != null ? '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'; }
    function formatDate(v) { return v ? new Date(v).toLocaleDateString('zh-CN') : '-'; }
    function statusLabel(s) { return STATUS_MAP[s]?.label || s; }
    function statusType(s) { return STATUS_MAP[s]?.type || ''; }

    onMounted(loadData);

    return { invoices, loading, page, pageSize, total, filters, detailVisible, detail, redInvoiceVisible, redInvoiceForm, loadData, showDetail, openCalc, openRedInvoice, doRedInvoice, showTrace, formatMoney, formatDate, statusLabel, statusType };
  }
};

const DiscountQuoteList = {
  name: 'DiscountQuoteList',
  template: `
    <div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
        <el-input v-model="filters.supplierName" placeholder="供应商" clearable style="width:180px" @keyup.enter="loadData"></el-input>
        <el-select v-model="filters.status" placeholder="报价状态" clearable style="width:130px" @change="loadData">
          <el-option label="草稿" value="DRAFT"></el-option>
          <el-option label="已提交" value="SUBMITTED"></el-option>
          <el-option label="已审批" value="APPROVED"></el-option>
          <el-option label="已执行" value="EXECUTED"></el-option>
          <el-option label="已作废" value="INVALID"></el-option>
        </el-select>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>

      <el-table :data="quotes" border stripe size="small" v-loading="loading">
        <el-table-column prop="quoteNo" label="报价号" width="150">
          <template #default="{ row }"><span class="trace-link">{{ row.quoteNo }}</span></template>
        </el-table-column>
        <el-table-column prop="supplierName" label="供应商" width="140"></el-table-column>
        <el-table-column label="发票号" width="130">
          <template #default="{ row }">
            <span v-if="row.invoice" class="trace-link" @click="$emit('navigate', 'invoices', row.invoice.id)">{{ row.invoice.invoiceNo }}</span>
          </template>
        </el-table-column>
        <el-table-column label="原金额" width="110"><template #default="{ row }">{{ formatMoney(row.originalAmount) }}</template></el-table-column>
        <el-table-column label="折扣率" width="80"><template #default="{ row }">{{ (row.discountRate * 100).toFixed(2) }}%</template></el-table-column>
        <el-table-column label="节省金额" width="110"><template #default="{ row }"><span class="saving-highlight">{{ formatMoney(row.savingAmount) }}</span></template></el-table-column>
        <el-table-column label="实付金额" width="110"><template #default="{ row }">{{ formatMoney(row.actualPayAmount) }}</template></el-table-column>
        <el-table-column label="提前天数" width="80"><template #default="{ row }">{{ row.advanceDays }}天</template></el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></el-table-column>
        </el-table-column>
        <el-table-column label="付款计划" width="120">
          <template #default="{ row }">
            <span v-if="row.paymentPlan" class="trace-link" @click="$emit('navigate', 'paymentPlans', row.paymentPlan.id)">{{ row.paymentPlan.planNo }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="规则" width="120">
          <template #default="{ row }">
            <span v-if="row.discountRule" class="trace-link">{{ row.discountRule.ruleName }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="submitQuote(row)" :disabled="row.status !== 'DRAFT'">提交</el-button>
            <el-button size="small" type="success" @click="approveQuote(row)" :disabled="row.status !== 'SUBMITTED'">审批</el-button>
            <el-button size="small" type="warning" @click="executeQuote(row)" :disabled="row.status !== 'APPROVED'">执行</el-button>
            <el-button size="small" @click="showTrace(row)">追溯</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination style="margin-top:12px;text-align:right;" :current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="(p) => { page = p; loadData(); }"></el-pagination>
    </div>
  `,
  emits: ['navigate'],
  setup(props, { emit }) {
    const quotes = ref([]);
    const loading = ref(false);
    const page = ref(1);
    const pageSize = ref(20);
    const total = ref(0);
    const filters = reactive({ supplierName: '', status: '' });

    async function loadData() {
      loading.value = true;
      try {
        const res = await api.discountQuotes.list({ ...filters, page: page.value, pageSize: pageSize.value });
        if (res.success) { quotes.value = res.data; total.value = res.pagination.total; }
      } finally { loading.value = false; }
    }

    async function submitQuote(row) {
      try {
        const res = await api.discountQuotes.submit(row.id, { operator: '采购金融专员', sourceType: 'QUOTE_SUBMIT', sourceId: row.id });
        if (res.success) { ElementPlus.ElMessage.success(res.message); loadData(); }
      } catch (e) { ElementPlus.ElMessage.error(e.response?.data?.message || '操作失败'); }
    }

    async function approveQuote(row) {
      try {
        const res = await api.discountQuotes.approve(row.id, { operator: '采购金融专员', sourceType: 'QUOTE_APPROVE', sourceId: row.id });
        if (res.success) { ElementPlus.ElMessage.success(res.message); loadData(); }
      } catch (e) { ElementPlus.ElMessage.error(e.response?.data?.message || '操作失败'); }
    }

    async function executeQuote(row) {
      try {
        await ElementPlus.ElMessageBox.confirm('执行后将标记发票为已付款并更新付款计划，确认执行？', '确认执行', { type: 'warning' });
        const res = await api.discountQuotes.execute(row.id, { operator: '采购金融专员', sourceType: 'QUOTE_EXECUTE', sourceId: row.id });
        if (res.success) { ElementPlus.ElMessage.success(res.message); loadData(); }
      } catch (e) { if (e !== 'cancel') ElementPlus.ElMessage.error(e.response?.data?.message || '操作失败'); }
    }

    async function showTrace(row) {
      const res = await api.discountQuotes.trace(row.id);
      if (res.success) { emit('navigate', 'trace', res.data); }
    }

    function formatMoney(v) { return v != null ? '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'; }
    function statusLabel(s) { return STATUS_MAP[s]?.label || s; }
    function statusType(s) { return STATUS_MAP[s]?.type || ''; }

    onMounted(loadData);

    return { quotes, loading, page, pageSize, total, filters, loadData, submitQuote, approveQuote, executeQuote, showTrace, formatMoney, statusLabel, statusType };
  }
};

const PaymentPlanList = {
  name: 'PaymentPlanList',
  template: `
    <div>
      <div style="display:flex;gap:12px;margin-bottom:16px;">
        <el-input v-model="filters.supplierName" placeholder="供应商" clearable style="width:180px" @keyup.enter="loadData"></el-input>
        <el-select v-model="filters.status" placeholder="状态" clearable style="width:130px" @change="loadData">
          <el-option label="待付款" value="PENDING"></el-option>
          <el-option label="已付款" value="PAID"></el-option>
          <el-option label="已调整" value="ADJUSTED"></el-option>
        </el-select>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <el-table :data="plans" border stripe size="small" v-loading="loading">
        <el-table-column prop="planNo" label="计划号" width="130"><template #default="{ row }"><span class="trace-link">{{ row.planNo }}</span></template></el-table-column>
        <el-table-column prop="supplierName" label="供应商" width="160"></el-table-column>
        <el-table-column label="计划金额" width="120"><template #default="{ row }">{{ formatMoney(row.plannedAmount) }}</template></el-table-column>
        <el-table-column label="计划日期" width="110"><template #default="{ row }">{{ formatDate(row.plannedDate) }}</template></el-table-column>
        <el-table-column label="实际金额" width="120"><template #default="{ row }">{{ row.actualAmount ? formatMoney(row.actualAmount) : '-' }}</template></el-table-column>
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></el-table-column>
        <el-table-column label="来源" width="150">
          <template #default="{ row }"><span style="font-size:12px;color:#909399;">{{ row.sourceType }}: {{ row.sourceId }}</span></template>
        </el-table-column>
        <el-table-column label="关联发票" width="80"><template #default="{ row }">{{ row.invoices?.length || 0 }}</template></el-table-column>
        <el-table-column label="关联报价" width="80"><template #default="{ row }">{{ row.discountQuotes?.length || 0 }}</template></el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" @click="showTrace(row)">追溯</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:12px;text-align:right;" :current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="(p) => { page = p; loadData(); }"></el-pagination>
    </div>
  `,
  emits: ['navigate'],
  setup(props, { emit }) {
    const plans = ref([]);
    const loading = ref(false);
    const page = ref(1);
    const pageSize = ref(20);
    const total = ref(0);
    const filters = reactive({ supplierName: '', status: '' });

    async function loadData() {
      loading.value = true;
      try {
        const res = await api.paymentPlans.list({ ...filters, page: page.value, pageSize: pageSize.value });
        if (res.success) { plans.value = res.data; total.value = res.pagination.total; }
      } finally { loading.value = false; }
    }

    async function showTrace(row) {
      const res = await api.paymentPlans.trace(row.id);
      if (res.success) { emit('navigate', 'trace', res.data); }
    }

    function formatMoney(v) { return v != null ? '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'; }
    function formatDate(v) { return v ? new Date(v).toLocaleDateString('zh-CN') : '-'; }
    function statusLabel(s) { return STATUS_MAP[s]?.label || s; }
    function statusType(s) { return STATUS_MAP[s]?.type || ''; }

    onMounted(loadData);
    return { plans, loading, page, pageSize, total, filters, loadData, showTrace, formatMoney, formatDate, statusLabel, statusType };
  }
};

const DiscountRuleList = {
  name: 'DiscountRuleList',
  template: `
    <div>
      <el-table :data="rules" border stripe size="small" v-loading="loading">
        <el-table-column prop="ruleName" label="规则名称" width="180"></el-table-column>
        <el-table-column prop="supplierName" label="适用供应商" width="160"></el-table-column>
        <el-table-column label="提前天数范围" width="130"><template #default="{ row }">{{ row.minAdvanceDays }} ~ {{ row.maxAdvanceDays }} 天</template></el-table-column>
        <el-table-column label="折扣率" width="100"><template #default="{ row }">{{ (row.discountRate * 100).toFixed(2) }}%</template></el-table-column>
        <el-table-column label="有效期"><template #default="{ row }">{{ formatDate(row.effectiveFrom) }} ~ {{ formatDate(row.effectiveTo) }}</template></el-table-column>
        <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '启用' : '停用' }}</el-tag></template></el-table-column>
        <el-table-column label="关联报价数" width="100"><template #default="{ row }">{{ row.discountQuotes?.length || 0 }}</template></el-table-column>
      </el-table>
    </div>
  `,
  setup() {
    const rules = ref([]);
    const loading = ref(false);

    async function loadData() {
      loading.value = true;
      try {
        const res = await api.discountRules.list({});
        if (res.success) { rules.value = res.data; }
      } finally { loading.value = false; }
    }

    function formatDate(v) { return v ? new Date(v).toLocaleDateString('zh-CN') : '-'; }
    onMounted(loadData);
    return { rules, loading, formatDate };
  }
};

const TraceCenter = {
  name: 'TraceCenter',
  template: `
    <div>
      <div class="page-section">
        <div class="page-section-title">追溯查询</div>
        <el-form :inline="true" size="small">
          <el-form-item label="实体类型">
            <el-select v-model="query.entityType" style="width:150px">
              <el-option label="发票" value="INVOICE"></el-option>
              <el-option label="付款计划" value="PAYMENT_PLAN"></el-option>
              <el-option label="折扣报价" value="DISCOUNT_QUOTE"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="实体ID">
            <el-input v-model="query.entityId" placeholder="输入ID" style="width:300px"></el-input>
          </el-form-item>
          <el-form-item><el-button type="primary" @click="search">查询追溯链</el-button></el-form-item>
        </el-form>
      </div>
      <div v-if="traceResult" class="page-section">
        <trace-view :trace-data="traceResult" @navigate="onNavigate"></trace-view>
      </div>
    </div>
  `,
  emits: ['navigate'],
  setup(props, { emit }) {
    const query = reactive({ entityType: 'DISCOUNT_QUOTE', entityId: '' });
    const traceResult = ref(null);

    async function search() {
      if (!query.entityId) { ElementPlus.ElMessage.warning('请输入实体ID'); return; }
      try {
        let res;
        if (query.entityType === 'INVOICE') res = await api.invoices.trace(query.entityId);
        else if (query.entityType === 'PAYMENT_PLAN') res = await api.paymentPlans.trace(query.entityId);
        else res = await api.discountQuotes.trace(query.entityId);
        if (res.success) { traceResult.value = res.data; }
      } catch (e) { ElementPlus.ElMessage.error('查询失败: ' + (e.response?.data?.message || e.message)); }
    }

    function onNavigate(type, id) { emit('navigate', type, id); }

    return { query, traceResult, search, onNavigate };
  }
};

const SavingsSummary = {
  name: 'SavingsSummary',
  template: `
    <div>
      <div style="display:flex;gap:16px;margin-bottom:16px;">
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" size="small" style="width:300px;"></el-date-picker>
        <el-button type="primary" size="small" @click="loadData">查询</el-button>
      </div>
      <div style="display:flex;gap:16px;margin-bottom:16px;">
        <el-card class="stat-card" style="flex:1;"><div class="stat-value">{{ formatMoney(totalSaving) }}</div><div class="stat-label">总节省金额</div></el-card>
        <el-card class="stat-card" style="flex:1;"><div class="stat-value">{{ totalCount }}</div><div class="stat-label">已执行报价数</div></el-card>
      </div>
      <div v-if="Object.keys(bySupplier).length" class="page-section">
        <div class="page-section-title">按供应商汇总</div>
        <el-table :data="supplierRows" border size="small">
          <el-table-column prop="supplier" label="供应商" width="200"></el-table-column>
          <el-table-column label="总节省金额" width="160"><template #default="{ row }"><span class="saving-highlight">{{ formatMoney(row.totalSaving) }}</span></template></el-table-column>
          <el-table-column prop="count" label="报价数" width="100"></el-table-column>
        </el-table>
      </div>
    </div>
  `,
  setup() {
    const totalSaving = ref(0);
    const totalCount = ref(0);
    const bySupplier = ref({});
    const dateRange = ref(null);

    const supplierRows = computed(() => {
      return Object.entries(bySupplier.value).map(([supplier, data]) => ({ supplier, ...data }));
    });

    async function loadData() {
      const params = {};
      if (dateRange.value) {
        params.startDate = dateRange.value[0].toISOString();
        params.endDate = dateRange.value[1].toISOString();
      }
      const res = await api.discountQuotes.totalSavings(params);
      if (res.success) {
        totalSaving.value = res.data.totalSaving;
        totalCount.value = res.data.totalCount;
        bySupplier.value = res.data.bySupplier;
      }
    }

    function formatMoney(v) { return v != null ? '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'; }

    onMounted(loadData);
    return { totalSaving, totalCount, bySupplier, supplierRows, dateRange, loadData, formatMoney };
  }
};

const TraceView = {
  name: 'TraceView',
  template: `
    <div v-if="traceData">
      <el-descriptions :column="2" border size="small" v-if="traceData.discountQuote">
        <el-descriptions-item label="报价号">{{ traceData.discountQuote.quoteNo }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ traceData.discountQuote.sourceType }} / {{ traceData.discountQuote.sourceId }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ traceData.discountQuote.createdBy }}</el-descriptions-item>
      </el-descriptions>

      <el-descriptions :column="2" border size="small" v-if="traceData.invoice && !traceData.discountQuote" style="margin-bottom:12px;">
        <el-descriptions-item label="发票号">{{ traceData.invoice.invoiceNo }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ traceData.invoice.sourceType || '-' }} / {{ traceData.invoice.sourceId || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-descriptions :column="2" border size="small" v-if="traceData.paymentPlan" style="margin-top:12px;">
        <el-descriptions-item label="付款计划">{{ traceData.paymentPlan.planNo }}</el-descriptions-item>
        <el-descriptions-item label="计划来源">
          <span class="trace-link" @click="$emit('navigate', 'paymentPlans', traceData.paymentPlan.id)">{{ traceData.paymentPlan.sourceType }}: {{ traceData.paymentPlan.sourceId }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="traceData.calculationTrace" style="margin-top:12px;">
        <div style="font-weight:600;margin-bottom:8px;">计算追溯</div>
        <div class="formula-box">
          <div>折扣金额 = {{ traceData.calculationTrace.originalAmount }} × {{ traceData.calculationTrace.discountRate }} = {{ traceData.calculationTrace.discountAmount }}</div>
          <div>节省金额 = {{ traceData.calculationTrace.savingAmount }}</div>
        </div>
      </div>

      <div v-if="traceData.discountRule" style="margin-top:12px;">
        <div style="font-weight:600;margin-bottom:4px;">匹配折扣规则</div>
        <el-tag size="small">{{ traceData.discountRule.ruleName }}</el-tag>
      </div>

      <div v-if="traceData.statusHistory && traceData.statusHistory.length" style="margin-top:16px;">
        <div style="font-weight:600;margin-bottom:8px;">状态变更历史（留痕）</div>
        <el-timeline class="trace-timeline">
          <el-timeline-item v-for="(h, i) in traceData.statusHistory" :key="i" :timestamp="formatDate(h.time)" placement="top" :type="h.operation.includes('INVALID') || h.operation.includes('REJECT') ? 'danger' : 'primary'">
            <div><strong>{{ h.operation }}</strong>: {{ h.oldValue || '(空)' }} → {{ h.newValue }}</div>
            <div style="color:#909399;font-size:12px;">操作人: {{ h.operator }} | 来源: {{ h.sourceType }} / {{ h.sourceId }}</div>
            <div v-if="h.remark" style="color:#606266;font-size:12px;">{{ h.remark }}</div>
          </el-timeline-item>
        </el-timeline>
      </div>

      <div v-if="traceData.auditLogs && traceData.auditLogs.length" style="margin-top:16px;">
        <div style="font-weight:600;margin-bottom:8px;">审计日志</div>
        <el-timeline class="trace-timeline">
          <el-timeline-item v-for="(log, i) in traceData.auditLogs" :key="i" :timestamp="formatDate(log.time)" placement="top">
            <div><strong>{{ log.operation }}</strong></div>
            <div style="color:#909399;font-size:12px;">操作人: {{ log.operator }} | 来源: {{ log.sourceType || '-' }} / {{ log.sourceId || '-' }}</div>
            <div v-if="log.remark" style="color:#606266;font-size:12px;">{{ log.remark }}</div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>
  `,
  props: ['traceData'],
  emits: ['navigate'],
  setup() {
    function formatDate(v) { return v ? new Date(v).toLocaleString('zh-CN') : '-'; }
    return { formatDate };
  }
};

const components = {
  InvoiceList,
  DiscountQuoteList,
  PaymentPlanList,
  DiscountRuleList,
  TraceCenter,
  SavingsSummary,
  TraceView,
};
