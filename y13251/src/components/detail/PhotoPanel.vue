<template>
  <div>
    <div class="flex-between mb-16">
      <div class="section-title" style="margin-bottom: 0">
        <el-icon :size="16" color="#409eff"><Picture /></el-icon>
        <span style="margin-left: 6px">现场照片</span>
        <el-tag size="small" type="info" style="margin-left: 8px">
          共 {{ store.selectedPointPhotos.length }} 张
        </el-tag>
      </div>
      <el-button size="small" type="primary" plain @click="dialogVisible = true">
        <el-icon><Camera /></el-icon>&nbsp;补录现场照
      </el-button>
    </div>

    <el-alert
      title="📸 补录照片后，地图点位标记与异常队列会同步说明这次补录改了什么"
      type="info"
      :closable="false"
      show-icon
      class="mb-16"
    />

    <div v-if="store.selectedPointPhotos.length === 0" style="text-align: center; padding: 40px 0">
      <el-empty description="暂无现场照片，请点击右上「补录现场照」上传" />
    </div>
    <div v-else class="photo-list">
      <div v-for="photo in store.selectedPointPhotos" :key="photo.id" class="photo-item">
        <div class="photo-wrapper">
          <img :src="photo.url" :alt="photo.description" />
          <div class="photo-info">
            <div style="font-weight: 600; margin-bottom: 4px">{{ photo.description }}</div>
            <div style="font-size: 12px; color: #909399">
              上传人：{{ photo.uploader }} · {{ photo.uploadTime }}
            </div>
          </div>
        </div>
        <el-card class="change-explain" shadow="never">
          <template #header>
            <div style="color: #e6a23c; font-weight: 600">
              <el-icon><MagicStick /></el-icon> 补录照片后的改动说明
            </div>
          </template>
          <div class="mb-12">
            <b>改动内容：</b>{{ photo.changeExplanation }}
          </div>
          <div class="compare-row">
            <div class="compare-cell before">
              <div class="compare-label">补录前判断</div>
              <div>{{ photo.beforeState }}</div>
            </div>
            <div style="padding: 0 12px; color: #909399; align-self: center">
              <el-icon :size="20"><Right /></el-icon>
            </div>
            <div class="compare-cell after">
              <div class="compare-label">补录后调整</div>
              <div>{{ photo.afterState }}</div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="补录现场照片" width="600px">
      <el-form label-width="110px">
        <el-form-item label="照片链接" required>
          <el-input v-model="form.url" placeholder="可直接填入图片URL（模拟上传）" />
        </el-form-item>
        <el-form-item label="照片描述" required>
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="例：XX点位全景照，可见外摆排列及周边居民楼"
          />
        </el-form-item>
        <el-form-item label="改动说明" required>
          <el-input
            v-model="form.changeExplanation"
            type="textarea"
            :rows="2"
            placeholder="例：补录后发现实际摆位数比GIS多X个，需调整容量核定"
          />
        </el-form-item>
        <el-form-item label="补录前判断" required>
          <el-input v-model="form.beforeState" placeholder="补录前基于GIS的判断" />
        </el-form-item>
        <el-form-item label="补录后调整" required>
          <el-input v-model="form.afterState" placeholder="照片佐证后的调整结论" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmit">确认补录</el-button>
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
  url: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800',
  description: '',
  changeExplanation: '',
  beforeState: '',
  afterState: ''
})

function onSubmit() {
  if (!store.selectedPoint) return
  if (!form.description || !form.changeExplanation) {
    ElMessage.warning('请完整填写照片说明与改动信息')
    return
  }
  store.addPhoto(
    store.selectedPoint.id,
    form.url,
    form.description,
    form.changeExplanation,
    form.beforeState,
    form.afterState
  )
  ElMessage.success('照片已补录 · 地图点位与异常队列已同步更新改动说明')
  dialogVisible.value = false
  form.description = ''
  form.changeExplanation = ''
  form.beforeState = ''
  form.afterState = ''
}
</script>

<style lang="scss" scoped>
.photo-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.photo-item {
  display: flex;
  gap: 16px;
}
.photo-wrapper {
  width: 260px;
  flex-shrink: 0;
  img {
    width: 100%;
    height: 160px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #ebeef5;
  }
  .photo-info {
    margin-top: 8px;
    font-size: 13px;
  }
}
.change-explain {
  flex: 1;
  :deep(.el-card__header) {
    padding: 10px 16px;
    background: #fdf6ec;
  }
  :deep(.el-card__body) {
    padding: 12px 16px;
  }
}
.compare-row {
  display: flex;
  margin-top: 8px;
}
.compare-cell {
  flex: 1;
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
}
.compare-cell.before {
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  color: #f56c6c;
}
.compare-cell.after {
  background: #f0f9eb;
  border: 1px solid #c2e7b0;
  color: #67c23a;
}
.compare-label {
  font-size: 12px;
  margin-bottom: 4px;
  opacity: 0.85;
  font-weight: 600;
}
</style>
