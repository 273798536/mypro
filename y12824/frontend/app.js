const API_BASE = 'http://localhost:5002/api';

const { createApp, ref, onMounted, computed, watch, nextTick } = Vue;

const ImportView = {
    emits: ['imported'],
    setup(props, { emit }) {
        const file = ref(null);
        const operator = ref('生物老师');
        const remark = ref('');
        const uploading = ref(false);
        const importResult = ref(null);
        const error = ref('');

        const handleFileChange = (e) => {
            file.value = e.target.files[0];
        };

        const doImport = async () => {
            if (!file.value) {
                error.value = '请选择要导入的Excel或CSV文件';
                return;
            }

            uploading.value = true;
            error.value = '';

            const formData = new FormData();
            formData.append('file', file.value);
            formData.append('operator', operator.value);
            formData.append('remark', remark.value);

            try {
                const res = await axios.post(`${API_BASE}/import`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                importResult.value = res.data;
                emit('imported', res.data);
            } catch (e) {
                error.value = e.response?.data?.error || '导入失败';
            } finally {
                uploading.value = false;
            }
        };

        const downloadTemplate = () => {
            const template = `条码,样本名称,物种,初始数量,存活数量,水温,盐度,养殖天数,采样时间,采样人
SC001,南美白对虾-01,凡纳滨对虾,100,85,26.5,28,30,2024-06-01,张三
SC002,南美白对虾-02,凡纳滨对虾,100,92,26.5,28,30,2024-06-01,张三
SC003,大黄鱼-01,大黄鱼,50,42,22,30,45,2024-06-02,李四
SC004,大黄鱼-02,大黄鱼,50,38,22,30,45,2024-06-02,李四
SC001,重复样本示例,凡纳滨对虾,100,78,26,28,30,2024-06-01,张三`;
            
            const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '水产苗种存活率导入模板.csv';
            a.click();
            URL.revokeObjectURL(url);
        };

        return { file, operator, remark, uploading, importResult, error, handleFileChange, doImport, downloadTemplate };
    },
    template: `
    <div class="row">
        <div class="col-lg-8 offset-lg-2">
            <div class="card">
                <div class="card-header">
                    <h5>数据导入</h5>
                </div>
                <div class="card-body">
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i>
                        支持Excel(.xlsx, .xls)和CSV格式。文件必须包含"条码"列，其他列为可选。
                        <button class="btn btn-sm btn-link ms-2" @click="downloadTemplate">下载模板</button>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">操作人员</label>
                        <input type="text" v-model="operator" class="form-control" placeholder="请输入操作人员姓名">
                    </div>

                    <div class="mb-3">
                        <label class="form-label">备注说明</label>
                        <textarea v-model="remark" class="form-control" rows="2" placeholder="可选"></textarea>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">选择文件</label>
                        <input type="file" @change="handleFileChange" accept=".xlsx,.xls,.csv" class="form-control">
                        <div v-if="file" class="mt-2 text-muted small">
                            已选择: {{ file.name }} ({{ (file.size / 1024).toFixed(1) }} KB)
                        </div>
                    </div>

                    <div v-if="error" class="alert alert-danger">{{ error }}</div>

                    <button @click="doImport" :disabled="uploading || !file" class="btn btn-primary w-100">
                        <span v-if="uploading" class="spinner-border spinner-border-sm me-2"></span>
                        {{ uploading ? '导入中...' : '开始导入' }}
                    </button>
                </div>
            </div>

            <div v-if="importResult" class="card">
                <div class="card-header">
                    <h5>导入结果</h5>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-4">
                            <div class="card bg-light">
                                <div class="card-body text-center">
                                    <h3>{{ importResult.batch.total_count }}</h3>
                                    <div class="text-muted">总记录数</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card bg-light">
                                <div class="card-body text-center">
                                    <h3>{{ importResult.batch.total_count - importResult.batch.duplicate_count }}</h3>
                                    <div class="text-muted">有效记录</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card" :class="importResult.duplicates.count > 0 ? 'bg-danger text-white' : 'bg-light'">
                                <div class="card-body text-center">
                                    <h3>{{ importResult.duplicates.count }}</h3>
                                    <div>条码重复</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="importResult.duplicates.count > 0" class="duplicate-warning">
                        <h5><i class="bi bi-exclamation-triangle"></i> 检测到条码重复记录</h5>
                        <p class="mb-2">以下条码已被标记为<span class="unavailable-mark">不可用</span>，不会纳入统计分析：</p>
                        <div v-for="item in importResult.duplicates.items" :key="item.barcode" class="reason-box mb-2">
                            <strong>条码 {{ item.barcode }}</strong>
                            <span class="badge" :class="item.type === 'cross_batch' ? 'bg-warning' : 'bg-info' ms-1">
                                {{ item.type === 'cross_batch' ? '跨批次重复' : item.type === 'batch_internal' ? '批次内重复' : '双重重复' }}
                            </span>
                            <div class="mt-1 text-muted">{{ item.reason }}</div>
                            <div v-if="item.existing_batches && item.existing_batches.length > 0" class="mt-1">
                                <small>已存在于批次: {{ item.existing_batches.join(', ') }}</small>
                            </div>
                        </div>
                    </div>

                    <div class="mt-3">
                        <span class="batch-tag">批次号: {{ importResult.batch.batch_no }}</span>
                        <span class="batch-tag">导入时间: {{ importResult.batch.import_time }}</span>
                        <span class="batch-tag">导入人: {{ importResult.batch.operator }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
};

const ListView = {
    emits: ['view-detail', 'review', 'update-duplicate'],
    setup(props, { emit }) {
        const samples = ref([]);
        const batches = ref([]);
        const selectedBatch = ref('');
        const filterStatus = ref('');
        const showDuplicatesOnly = ref(false);
        const loading = ref(false);
        const operator = ref('生物老师');

        const loadData = async () => {
            loading.value = true;
            try {
                const params = {};
                if (selectedBatch.value) params.batch_id = selectedBatch.value;
                if (filterStatus.value) params.status = filterStatus.value;
                if (showDuplicatesOnly.value) params.is_duplicate = 'true';

                const [samplesRes, batchesRes] = await Promise.all([
                    axios.get(`${API_BASE}/samples`, { params }),
                    axios.get(`${API_BASE}/batches`)
                ]);
                samples.value = samplesRes.data;
                batches.value = batchesRes.data;

                const dupCount = samples.value.filter(s => s.is_duplicate).length;
                emit('update-duplicate', dupCount);
            } finally {
                loading.value = false;
            }
        };

        onMounted(loadData);
        watch([selectedBatch, filterStatus, showDuplicatesOnly], loadData);

        const getStatusClass = (status) => {
            const map = {
                '已导入': 'status-imported',
                '复核中': 'status-reviewing',
                '已通过': 'status-approved',
                '已驳回': 'status-rejected',
                '条码重复': 'status-duplicate'
            };
            return map[status] || 'status-imported';
        };

        const getRowClass = (sample) => {
            return sample.is_duplicate ? 'duplicate-row' : '';
        };

        const updateStatus = async (sample, newStatus, comment = '') => {
            try {
                const res = await axios.put(`${API_BASE}/samples/${sample.id}/status`, {
                    status: newStatus,
                    operator: operator.value,
                    comment: comment
                });
                Object.assign(sample, res.data.sample);
            } catch (e) {
                alert('操作失败: ' + (e.response?.data?.error || e.message));
            }
        };

        const startReview = (sample) => {
            updateStatus(sample, '复核中');
        };

        const approve = (sample) => {
            const comment = prompt('请输入复核意见（可选）:');
            if (comment !== null) {
                updateStatus(sample, '已通过', comment);
            }
        };

        const reject = (sample) => {
            const comment = prompt('请输入驳回原因:');
            if (comment) {
                updateStatus(sample, '已驳回', comment);
            }
        };

        const exportReport = () => {
            const params = new URLSearchParams();
            if (selectedBatch.value) params.append('batch_id', selectedBatch.value);
            window.open(`${API_BASE}/export/report?${params.toString()}`, '_blank');
        };

        return {
            samples, batches, selectedBatch, filterStatus, showDuplicatesOnly,
            loading, operator, getStatusClass, getRowClass, viewDetail: (id) => emit('view-detail', id),
            startReview, approve, reject, exportReport, loadData
        };
    },
    template: `
    <div>
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5>样本列表</h5>
                <div class="d-flex gap-2">
                    <select v-model="selectedBatch" class="form-select form-select-sm w-auto">
                        <option value="">所有批次</option>
                        <option v-for="b in batches" :key="b.id" :value="b.id">
                            {{ b.batch_no }} ({{ b.import_time }})
                        </option>
                    </select>
                    <select v-model="filterStatus" class="form-select form-select-sm w-auto">
                        <option value="">所有状态</option>
                        <option value="已导入">已导入</option>
                        <option value="复核中">复核中</option>
                        <option value="已通过">已通过</option>
                        <option value="已驳回">已驳回</option>
                        <option value="条码重复">条码重复</option>
                    </select>
                    <div class="form-check form-check-inline align-self-center">
                        <input type="checkbox" v-model="showDuplicatesOnly" class="form-check-input" id="showDup">
                        <label class="form-check-label" for="showDup">仅显示重复</label>
                    </div>
                    <button @click="exportReport" class="btn btn-success btn-sm">
                        导出报告
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div v-if="loading" class="text-center py-4">
                    <div class="spinner-border"></div>
                </div>
                <div v-else class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>条码</th>
                                <th>样本名称</th>
                                <th>物种</th>
                                <th>存活率</th>
                                <th>批次</th>
                                <th>状态</th>
                                <th>可用</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="s in samples" :key="s.id" :class="getRowClass(s)">
                                <td>
                                    <strong>{{ s.barcode }}</strong>
                                    <span v-if="s.is_duplicate" class="unavailable-mark">重复</span>
                                </td>
                                <td>{{ s.sample_name || '-' }}</td>
                                <td>{{ s.species || '-' }}</td>
                                <td>{{ s.survival_rate }}%</td>
                                <td><span class="batch-tag">{{ s.batch_no }}</span></td>
                                <td><span class="status-badge" :class="getStatusClass(s.status)">{{ s.status }}</span></td>
                                <td>
                                    <span v-if="s.is_available" class="badge bg-success">是</span>
                                    <span v-else class="badge bg-danger">否</span>
                                </td>
                                <td>
                                    <button @click="$emit('view-detail', s.id)" class="btn btn-sm btn-outline-primary me-1">详情</button>
                                    <template v-if="s.status === '已导入' && !s.is_duplicate">
                                        <button @click="startReview(s)" class="btn btn-sm btn-outline-warning me-1">复核</button>
                                    </template>
                                    <template v-if="s.status === '复核中'">
                                        <button @click="approve(s)" class="btn btn-sm btn-outline-success me-1">通过</button>
                                        <button @click="reject(s)" class="btn btn-sm btn-outline-danger">驳回</button>
                                    </template>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-if="samples.length === 0" class="text-center text-muted py-4">
                        暂无数据，请先导入样本
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
};

const DetailView = {
    props: ['sampleId'],
    emits: ['back'],
    setup(props) {
        const sample = ref(null);
        const loading = ref(true);
        const qualityForm = ref({
            morphological_score: 75,
            activity_score: 75,
            uniformity_score: 75,
            size_mean: null,
            size_std: null,
            size_cv: null,
            abnormal_count: 0,
            abnormal_rate: 0,
            abnormal_description: ''
        });
        const photoFile = ref(null);
        const operator = ref('生物老师');

        const loadDetail = async () => {
            loading.value = true;
            try {
                const res = await axios.get(`${API_BASE}/samples/${props.sampleId}`);
                sample.value = res.data;
                if (sample.value.quality_control) {
                    qualityForm.value = { ...sample.value.quality_control };
                }
            } finally {
                loading.value = false;
            }
        };

        onMounted(loadDetail);
        watch(() => props.sampleId, loadDetail);

        const handlePhotoChange = (e) => {
            photoFile.value = e.target.files[0];
        };

        const uploadPhoto = async () => {
            if (!photoFile.value) return;

            const formData = new FormData();
            formData.append('photo', photoFile.value);
            formData.append('operator', operator.value);

            try {
                const res = await axios.post(`${API_BASE}/samples/${props.sampleId}/photo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                sample.value.quality_control = res.data.quality_control;
                qualityForm.value = { ...res.data.quality_control };
                alert('照片上传成功，差异分析已更新！');
            } catch (e) {
                alert('上传失败: ' + (e.response?.data?.error || e.message));
            }
        };

        const saveQuality = async () => {
            try {
                const res = await axios.post(`${API_BASE}/samples/${props.sampleId}/quality`, {
                    ...qualityForm.value,
                    operator: operator.value
                });
                sample.value.quality_control = res.data.quality_control;
                alert('质控数据保存成功，差异分析已更新！');
            } catch (e) {
                alert('保存失败: ' + (e.response?.data?.error || e.message));
            }
        };

        const getQualityClass = (level) => {
            const map = { '优秀': 'quality-excellent', '良好': 'quality-good', '较差': 'quality-poor', '不可用': 'quality-unavailable' };
            return map[level] || 'quality-good';
        };

        const getStatusClass = (status) => {
            const map = { '已导入': 'status-imported', '复核中': 'status-reviewing', '已通过': 'status-approved', '已驳回': 'status-rejected', '条码重复': 'status-duplicate' };
            return map[status] || 'status-imported';
        };

        return { sample, loading, qualityForm, photoFile, operator, handlePhotoChange, uploadPhoto, saveQuality, getQualityClass, getStatusClass };
    },
    template: `
    <div v-if="!loading && sample">
        <button @click="$emit('back')" class="btn btn-outline-secondary mb-3">← 返回列表</button>

        <div v-if="sample.is_duplicate" class="duplicate-warning">
            <h5><i class="bi bi-exclamation-triangle"></i> 该样本条码重复，已标记为不可用</h5>
            <div class="reason-box">
                <strong>重复原因：</strong>{{ sample.duplicate_reason }}
            </div>
            <div class="reason-box mt-2">
                <strong>不可用说明：</strong>{{ sample.unavailable_reason }}
            </div>
            <div v-if="sample.duplicate_with" class="mt-2 text-muted">
                <small>与以下样本ID重复: {{ sample.duplicate_with }}</small>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-6">
                <div class="card">
                    <div class="card-header"><h5>基本信息</h5></div>
                    <div class="card-body">
                        <table class="table table-borderless">
                            <tr><th style="width: 30%">条码</th><td>{{ sample.barcode }}</td></tr>
                            <tr><th>样本名称</th><td>{{ sample.sample_name || '-' }}</td></tr>
                            <tr><th>物种</th><td>{{ sample.species || '-' }}</td></tr>
                            <tr><th>初始数量</th><td>{{ sample.initial_count }} 尾</td></tr>
                            <tr><th>存活数量</th><td>{{ sample.survival_count }} 尾</td></tr>
                            <tr><th>存活率</th><td><strong class="text-primary">{{ sample.survival_rate }}%</strong></td></tr>
                            <tr><th>水温</th><td>{{ sample.culture_temperature || '-' }} ℃</td></tr>
                            <tr><th>盐度</th><td>{{ sample.culture_salinity || '-' }}</td></tr>
                            <tr><th>养殖天数</th><td>{{ sample.culture_days || '-' }} 天</td></tr>
                            <tr><th>采样时间</th><td>{{ sample.sample_time || '-' }}</td></tr>
                            <tr><th>采样人</th><td>{{ sample.collector || '-' }}</td></tr>
                            <tr><th>状态</th><td><span class="status-badge" :class="getStatusClass(sample.status)">{{ sample.status }}</span></td></tr>
                            <tr><th>是否可用</th><td>
                                <span v-if="sample.is_available" class="badge bg-success">是</span>
                                <span v-else class="badge bg-danger">否</span>
                            </td></tr>
                            <tr><th>批次</th><td><span class="batch-tag">{{ sample.batch_no }}</span></td></tr>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><h5>状态流转记录</h5></div>
                    <div class="card-body">
                        <div v-for="h in sample.status_history" :key="h.id" class="timeline-item">
                            <div class="d-flex justify-content-between">
                                <strong>{{ h.to_status }}</strong>
                                <small class="text-muted">{{ h.created_at }}</small>
                            </div>
                            <div v-if="h.comment" class="text-muted small mt-1">{{ h.comment }}</div>
                            <div class="text-muted small">操作人: {{ h.operator || '系统' }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-6">
                <div class="card">
                    <div class="card-header"><h5>显微照片补录</h5></div>
                    <div class="card-body">
                        <div v-if="sample.quality_control?.micro_photo_path" class="mb-3">
                            <img :src="'http://localhost:5002' + sample.quality_control.micro_photo_path" 
                                 class="photo-preview img-thumbnail" alt="显微照片">
                            <div class="mt-2 text-muted small">
                                上传时间: {{ sample.quality_control.micro_photo_upload_time }}
                                <span v-if="sample.quality_control.diff_analysis_update_count > 0" class="ms-2 text-info">
                                    已更新 {{ sample.quality_control.diff_analysis_update_count }} 次
                                </span>
                            </div>
                        </div>
                        <div class="mb-3">
                            <input type="file" @change="handlePhotoChange" accept="image/*" class="form-control">
                        </div>
                        <button @click="uploadPhoto" :disabled="!photoFile" class="btn btn-primary w-100">
                            上传照片并更新差异分析
                        </button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5>质控评分</h5>
                        <span v-if="sample.quality_control?.quality_level" 
                              class="quality-indicator" :class="getQualityClass(sample.quality_control.quality_level)">
                            {{ sample.quality_control.quality_level }}
                        </span>
                    </div>
                    <div class="card-body">
                        <div v-if="sample.quality_control?.overall_score" class="mb-3">
                            <div class="text-center">
                                <h2 :class="getQualityClass(sample.quality_control.quality_level)">
                                    {{ sample.quality_control.overall_score }}
                                </h2>
                                <div class="text-muted">综合评分</div>
                            </div>
                        </div>
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label">形态学评分</label>
                                <input type="number" v-model.number="qualityForm.morphological_score" 
                                       min="0" max="100" class="form-control">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">活力评分</label>
                                <input type="number" v-model.number="qualityForm.activity_score" 
                                       min="0" max="100" class="form-control">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">均匀度评分</label>
                                <input type="number" v-model.number="qualityForm.uniformity_score" 
                                       min="0" max="100" class="form-control">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">平均规格</label>
                                <input type="number" v-model.number="qualityForm.size_mean" class="form-control" step="0.01">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">规格标准差</label>
                                <input type="number" v-model.number="qualityForm.size_std" class="form-control" step="0.01">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">变异系数(%)</label>
                                <input type="number" v-model.number="qualityForm.size_cv" class="form-control" step="0.1">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">异常个体数</label>
                                <input type="number" v-model.number="qualityForm.abnormal_count" min="0" class="form-control">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">异常率(%)</label>
                                <input type="number" v-model.number="qualityForm.abnormal_rate" min="0" max="100" class="form-control" step="0.1">
                            </div>
                            <div class="col-md-12">
                                <label class="form-label">异常描述</label>
                                <textarea v-model="qualityForm.abnormal_description" rows="2" class="form-control"></textarea>
                            </div>
                        </div>
                        <button @click="saveQuality" class="btn btn-primary w-100 mt-3">
                            保存质控数据并更新差异分析
                        </button>
                    </div>
                </div>

                <div v-if="sample.quality_control?.diff_analysis" class="card">
                    <div class="card-header"><h5>差异分析结果</h5></div>
                    <div class="card-body">
                        <div class="diff-analysis-box">
                            <h6><i class="bi bi-bar-chart"></i> 分析说明</h6>
                            <p class="mb-0" style="white-space: pre-line;">{{ sample.quality_control.diff_analysis }}</p>
                        </div>
                        <div class="text-muted small mt-2">
                            分析时间: {{ sample.quality_control.diff_analysis_time }}
                            <span v-if="sample.quality_control.diff_analysis_update_count > 0" class="ms-2 text-info">
                                第 {{ sample.quality_control.diff_analysis_update_count + 1 }} 次分析
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div v-else class="text-center py-4">
        <div class="spinner-border"></div>
    </div>
    `
};

const ReviewView = {
    emits: ['back'],
    setup() {
        const samples = ref([]);
        const loading = ref(false);
        const operator = ref('生物老师');

        const loadData = async () => {
            loading.value = true;
            try {
                const res = await axios.get(`${API_BASE}/samples`, { params: { status: '复核中' } });
                samples.value = res.data;
            } finally {
                loading.value = false;
            }
        };

        onMounted(loadData);

        const batchApprove = () => {
            const comment = prompt('请输入批量复核意见（可选）:');
            if (comment !== null) {
                samples.value.forEach(s => {
                    axios.put(`${API_BASE}/samples/${s.id}/status`, {
                        status: '已通过',
                        operator: operator.value,
                        comment: comment + '（批量复核）'
                    }).then(res => {
                        Object.assign(s, res.data.sample);
                    });
                });
                alert('批量通过操作已提交');
                setTimeout(loadData, 1000);
            }
        };

        const batchReject = () => {
            const comment = prompt('请输入批量驳回原因:');
            if (comment) {
                samples.value.forEach(s => {
                    axios.put(`${API_BASE}/samples/${s.id}/status`, {
                        status: '已驳回',
                        operator: operator.value,
                        comment: comment + '（批量复核）'
                    }).then(res => {
                        Object.assign(s, res.data.sample);
                    });
                });
                alert('批量驳回操作已提交');
                setTimeout(loadData, 1000);
            }
        };

        return { samples, loading, operator, batchApprove, batchReject, loadData };
    },
    template: `
    <div>
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5>批量复核</h5>
                <div class="d-flex gap-2">
                    <button @click="batchApprove" :disabled="samples.length === 0" class="btn btn-success btn-sm">
                        批量通过
                    </button>
                    <button @click="batchReject" :disabled="samples.length === 0" class="btn btn-danger btn-sm">
                        批量驳回
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div v-if="loading" class="text-center py-4"><div class="spinner-border"></div></div>
                <div v-else-if="samples.length === 0" class="text-center text-muted py-4">
                    暂无待复核的样本
                </div>
                <div v-else class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>条码</th>
                                <th>样本名称</th>
                                <th>存活率</th>
                                <th>批次</th>
                                <th>质控等级</th>
                                <th>是否可用</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="s in samples" :key="s.id">
                                <td><strong>{{ s.barcode }}</strong></td>
                                <td>{{ s.sample_name || '-' }}</td>
                                <td>{{ s.survival_rate }}%</td>
                                <td><span class="batch-tag">{{ s.batch_no }}</span></td>
                                <td>-</td>
                                <td>
                                    <span v-if="s.is_available" class="badge bg-success">是</span>
                                    <span v-else class="badge bg-danger">否</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    `
};

const ReportView = {
    setup() {
        const statistics = ref(null);
        const batches = ref([]);
        const selectedBatch = ref('');
        const loading = ref(false);
        const survivalChart = ref(null);
        const speciesChart = ref(null);
        const statusChart = ref(null);

        const loadData = async () => {
            loading.value = true;
            try {
                const params = {};
                if (selectedBatch.value) params.batch_id = selectedBatch.value;

                const [statsRes, batchesRes] = await Promise.all([
                    axios.get(`${API_BASE}/statistics`, { params }),
                    axios.get(`${API_BASE}/batches`)
                ]);
                statistics.value = statsRes.data;
                batches.value = batchesRes.data;

                nextTick(() => {
                    renderCharts();
                });
            } finally {
                loading.value = false;
            }
        };

        onMounted(loadData);
        watch(selectedBatch, loadData);

        const renderCharts = () => {
            if (!statistics.value) return;

            if (survivalChart.value) {
                const chart = echarts.init(survivalChart.value);
                const data = statistics.value.survival_ranges;
                chart.setOption({
                    title: { text: '存活率分布', left: 'center', textStyle: { fontSize: 14 } },
                    tooltip: { trigger: 'item', formatter: '{b}: {c}个样本 ({d}%)' },
                    legend: { bottom: 0 },
                    color: ['#2e7d32', '#7cb342', '#f9a825', '#c62828'],
                    series: [{
                        type: 'pie',
                        radius: ['40%', '70%'],
                        avoidLabelOverlap: false,
                        label: { show: true, formatter: '{b}\n{c}个' },
                        data: Object.keys(data).map(k => ({ name: k, value: data[k] }))
                    }]
                });
            }

            if (speciesChart.value && statistics.value.species_data.length > 0) {
                const chart = echarts.init(speciesChart.value);
                const species = statistics.value.species_data;
                chart.setOption({
                    title: { text: '各物种存活率对比', left: 'center', textStyle: { fontSize: 14 } },
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                    legend: { data: ['平均存活率', '最高', '最低'], bottom: 0 },
                    color: ['#1565c0', '#2e7d32', '#c62828'],
                    xAxis: { type: 'category', data: species.map(s => s.species) },
                    yAxis: { type: 'value', name: '存活率(%)', max: 100 },
                    series: [
                        { name: '平均存活率', type: 'bar', data: species.map(s => s.avg_rate), itemStyle: { color: '#1565c0' } },
                        { name: '最高', type: 'line', data: species.map(s => s.max_rate), itemStyle: { color: '#2e7d32' } },
                        { name: '最低', type: 'line', data: species.map(s => s.min_rate), itemStyle: { color: '#c62828' } }
                    ]
                });
            }

            if (statusChart.value) {
                const chart = echarts.init(statusChart.value);
                const data = statistics.value.status_counts;
                chart.setOption({
                    title: { text: '样本状态分布', left: 'center', textStyle: { fontSize: 14 } },
                    tooltip: { trigger: 'axis' },
                    color: ['#1565c0', '#e65100', '#2e7d32', '#c62828', '#880e4f'],
                    xAxis: { type: 'category', data: Object.keys(data) },
                    yAxis: { type: 'value', name: '数量' },
                    series: [{
                        type: 'bar',
                        data: Object.keys(data).map(k => ({ name: k, value: data[k] })),
                        itemStyle: {
                            color: function(params) {
                                const map = { '已导入': '#1565c0', '复核中': '#e65100', '已通过': '#2e7d32', '已驳回': '#c62828', '条码重复': '#880e4f' };
                                return map[params.name] || '#999';
                            }
                        }
                    }]
                });
            }
        };

        const exportReport = () => {
            const params = new URLSearchParams();
            if (selectedBatch.value) params.append('batch_id', selectedBatch.value);
            window.open(`${API_BASE}/export/report?${params.toString()}`, '_blank');
        };

        const exportWithUnavailable = () => {
            const params = new URLSearchParams();
            if (selectedBatch.value) params.append('batch_id', selectedBatch.value);
            params.append('include_unavailable', 'true');
            window.open(`${API_BASE}/export/report?${params.toString()}`, '_blank');
        };

        return {
            statistics, batches, selectedBatch, loading,
            survivalChart, speciesChart, statusChart,
            loadData, exportReport, exportWithUnavailable
        };
    },
    template: `
    <div>
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5>数据统计与报告</h5>
                <div class="d-flex gap-2">
                    <select v-model="selectedBatch" class="form-select form-select-sm w-auto">
                        <option value="">所有批次</option>
                        <option v-for="b in batches" :key="b.id" :value="b.id">
                            {{ b.batch_no }} ({{ b.import_time }})
                        </option>
                    </select>
                    <button @click="exportReport" class="btn btn-success btn-sm">
                        导出报告（仅有效数据）
                    </button>
                    <button @click="exportWithUnavailable" class="btn btn-outline-warning btn-sm">
                        导出（含不可用记录）
                    </button>
                </div>
            </div>
        </div>

        <div v-if="loading" class="text-center py-4"><div class="spinner-border"></div></div>

        <div v-else-if="statistics">
            <div class="row mb-3">
                <div class="col-md-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h3>{{ statistics.total_count }}</h3>
                            <div>总样本数</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-success text-white">
                        <div class="card-body text-center">
                            <h3>{{ statistics.available_count }}</h3>
                            <div>有效样本</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-danger text-white">
                        <div class="card-body text-center">
                            <h3>{{ statistics.unavailable_count }}</h3>
                            <div>不可用样本</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <h3>{{ statistics.avg_survival_rate }}%</h3>
                            <div>平均存活率</div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="statistics.unavailable_details.length > 0" class="card mb-3">
                <div class="card-header bg-danger text-white">
                    <h5><i class="bi bi-exclamation-triangle"></i> 不可用记录明细</h5>
                </div>
                <div class="card-body">
                    <p class="text-muted mb-3">以下记录因条码重复或质控不通过等原因被标记为不可用，不会纳入统计分析：</p>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead class="table-light">
                                <tr>
                                    <th>条码</th>
                                    <th>样本名称</th>
                                    <th>批次号</th>
                                    <th>不可用原因</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="d in statistics.unavailable_details" :key="d.id" class="duplicate-row">
                                    <td><strong>{{ d.barcode }}</strong></td>
                                    <td>{{ d.sample_name || '-' }}</td>
                                    <td><span class="batch-tag">{{ d.batch_no }}</span></td>
                                    <td class="text-danger">{{ d.reason }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-body">
                            <div ref="survivalChart" class="chart-container"></div>
                            <div class="chart-legend-explain">
                                <h6>图表说明</h6>
                                <div class="legend-item"><span class="legend-color" style="background: #2e7d32;"></span> ≥90%：存活率优秀，苗种质量好</div>
                                <div class="legend-item"><span class="legend-color" style="background: #7cb342;"></span> 70-90%：存活率良好，符合预期</div>
                                <div class="legend-item"><span class="legend-color" style="background: #f9a825;"></span> 50-70%：存活率一般，需关注养殖条件</div>
                                <div class="legend-item"><span class="legend-color" style="background: #c62828;"></span> <50%：存活率偏低，需重点分析原因</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-body">
                            <div ref="statusChart" class="chart-container"></div>
                            <div class="chart-legend-explain">
                                <h6>状态说明</h6>
                                <div class="legend-item"><span class="legend-color" style="background: #1565c0;"></span> 已导入：待处理的新导入记录</div>
                                <div class="legend-item"><span class="legend-color" style="background: #e65100;"></span> 复核中：正在进行质量复核</div>
                                <div class="legend-item"><span class="legend-color" style="background: #2e7d32;"></span> 已通过：复核通过，可用于分析</div>
                                <div class="legend-item"><span class="legend-color" style="background: #c62828;"></span> 已驳回：复核不通过，标记为不可用</div>
                                <div class="legend-item"><span class="legend-color" style="background: #880e4f;"></span> 条码重复：系统检测到条码重复，自动拦截</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="statistics.species_data.length > 0" class="row mt-3">
                <div class="col-lg-12">
                    <div class="card">
                        <div class="card-body">
                            <div ref="speciesChart" class="chart-container"></div>
                            <div class="chart-legend-explain">
                                <h6>图表说明</h6>
                                <div class="legend-item"><span class="legend-color" style="background: #1565c0;"></span> 柱状图：各物种的平均存活率</div>
                                <div class="legend-item"><span class="legend-color" style="background: #2e7d32;"></span> 绿色折线：该物种的最高存活率</div>
                                <div class="legend-item"><span class="legend-color" style="background: #c62828;"></span> 红色折线：该物种的最低存活率</div>
                                <div class="mt-2 text-muted">注：折线与柱状图的差距反映了该物种种群内的存活率波动情况，差距越大说明个体差异或批次差异越大。</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="Object.keys(statistics.duplicate_reasons).length > 0" class="card mt-3">
                <div class="card-header">
                    <h5>重复原因分布</h5>
                </div>
                <div class="card-body">
                    <div v-for="(count, reason) in statistics.duplicate_reasons" :key="reason" class="mb-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <span>{{ reason }}</span>
                            <span class="badge bg-danger">{{ count }} 条</span>
                        </div>
                        <div class="progress mt-1" style="height: 8px;">
                            <div class="progress-bar bg-danger" :style="{ width: (count / statistics.duplicate_count * 100) + '%' }"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
};

createApp({
    components: { ImportView, ListView, DetailView, ReviewView, ReportView },
    setup() {
        const tabs = [
            { key: 'import', name: '数据导入' },
            { key: 'list', name: '样本列表' },
            { key: 'review', name: '批量复核' },
            { key: 'report', name: '统计报告' }
        ];
        const currentTab = ref('list');
        const selectedSampleId = ref(null);
        const duplicateCount = ref(0);

        const onDataImported = (data) => {
            if (data.duplicates?.count > 0) {
                duplicateCount.value = data.duplicates.count;
            }
        };

        const viewDetail = (id) => {
            selectedSampleId.value = id;
            currentTab.value = 'detail';
        };

        const updateDuplicateCount = (count) => {
            duplicateCount.value = count;
        };

        return { tabs, currentTab, selectedSampleId, duplicateCount, onDataImported, viewDetail, updateDuplicateCount };
    }
}).mount('#app');
