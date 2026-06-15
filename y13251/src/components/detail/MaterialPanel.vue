<template>
  <div>
    <div class="flex-between mb-16">
      <div class="section-title" style="margin-bottom: 0">
        <el-icon :size="16" color="#409eff"><Paperclip /></el-icon>
        <span style="margin-left: 6px">材料附件</span>
        <el-tag size="small" type="info" style="margin-left: 8px">
          共 {{ store.selectedPointMaterials.length }} 份
        </el-tag>
      </div>
      <el-button size="small" type="primary" plain @click="dialogVisible = true">
        <el-icon><UploadFilled /></el-icon>&nbsp;补充上传
      </el-button>
    </div>

    <el-alert
      title="💼 复核材料包：GIS点位、一条名称不一致、一份后补说明各放一点，量少也要像真活"
      type="info"
      :closable="false"
      show-icon
      class="mb-16"
    />

    <el-table :data="store.selectedPointMaterials" size="default" stripe>
      <el-table-column label="类型" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="typeTag(row.type)" effect="light" size="small">
            {{ typeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="材料名称" min-width="180" />
      <el-table-column prop="description" label="说明" min-width="200" />
      <el-table-column prop="fileName" label="文件名" width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <el-icon color="#409eff"><Document /></el-icon>
          <span style="margin-left: 4px">{{ row.fileName }}</span>
        </template>
      </el-table-column>
      <el-table-column label="大小" width="80" align="right">
        <template #default="{ row }">{{ (row.size / 1024).toFixed(1) }} MB</template>
      </el-table-column>
      <el-table-column prop="uploadTime" label="上传时间" width="160" />
      <el-table-column prop="uploader" label="上传人" width="90" align="center" />
    </el-table>

    <el-dialog v-model="dialogVisible" title="补充复核材料" width="520px">
      <el-form label-width="100px">
        <el-form-item label="材料类型" required>
          <el-select v-model="form.type" placeholder="请选择" style="width: 100%">
            <el-option label="GIS点位数据" value="gis" />
            <el-option label="名称不一致材料" value="name_mismatch" />
            <el-option label="后补说明" value="supplement" />
          </el-select>
        </el-form-item>
        <el-form-item label="材料名称" required>
          <el-input v-model="form.name" placeholder="例：XX街道GIS补充数据.kml" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="描述材料内容和用途" />
        </el-form-item>
        <el-form-item label="文件">
          <el-upload drag auto-upload :limit="1" :on-change="onFileChange">
            <el-icon :size="24"><UploadFilled /></el-icon>
            <div style="margin-top: 8px">拖拽文件到此或 <u>点击选择</u></div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onUpload">确认上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useReviewStore } from '@/store/review'

const store = useReviewStore()
const dialogVisible = ref(false)

const form = reactive({
  type: 'gis',
  name: '',
  description: '',
  fileName: ''
})

function typeLabel(t: string) {
  return { gis: 'GIS点位', name_mismatch: '名称不一致', supplement: '后补说明' }[t] || t
}
function typeTag(t: string) {
  return ({ gis: 'primary', name_mismatch: 'warning', supplement: 'success' } as any)[t] || 'info'
}

function onFileChange(file: any) {
  form.fileName = file.name || ''
}
function onUpload() {
  if (!form.name) {
    ElMessage.warning('请填写材料名称')
    return
  }
  dialogVisible.value = false
  ElMessage.success(`材料"${form.name}"已上传归档`)
  form.name = ''
  form.description = ''
}
</script>
