<template>
  <div>
    <div class="page-header">
      <h2>
        <el-icon :size="22" style="margin-right:8px;vertical-align:middle;color:#3a8ee6">
          <Connection />
        </el-icon>
        重复归并中心
      </h2>
      <el-button type="primary" @click="refresh">
        <el-icon><Refresh /></el-icon>重新扫描疑似重复
      </el-button>
    </div>

    <div class="action-hint">
      <el-icon style="margin-right:6px;vertical-align:middle"><InfoFilled /></el-icon>
      <b>归并说明：</b>同一地点的两种写法（如"XX路与YY路交叉口慢行桥南坡道"和"XX路YY路口桥南坡"）归并为一条主记录。
      归并后子记录状态变为"已归并"，主记录保留所有证据，且归并理由和证据永久留痕在操作日志，不会丢失相邻点位信息。
    </div>

    <el-card shadow="never" style="margin-bottom:16px" v-loading="loading">
      <div class="section-title">
        <el-icon style="margin-right:4px"><Warning /></el-icon>
        系统自动识别到的疑似重复（{{ suggests.length }} 组）
      </div>

      <div v-if="suggests.length === 0" style="color:#67c23a;padding:20px;text-align:center">
        <el-icon :size="40"><CircleCheck /></el-icon>
        <div style="margin-top:10px">未发现疑似重复记录，请继续处理其他任务。</div>
      </div>

      <div v-for="(sg, idx) in suggests" :key="idx" class="merge-suggest">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <el-tag type="warning" effect="dark">重复度 {{ sg.score }}%</el-tag>
            <span v-for="(r, i) in sg.reasons" :key="i" style="margin-left:8px;font-size:12px;color:#606266">
              · {{ r }}
            </span>
          </div>
          <div>
            <el-button size="small" type="primary" plain
              @click="openMergeDialog(sg.feedback_a, sg.feedback_b, sg.reasons)">
              <el-icon><Link /></el-icon>A 归并到 B
            </el-button>
            <el-button size="small" type="success" plain style="margin-left:4px"
              @click="openMergeDialog(sg.feedback_b, sg.feedback_a, sg.reasons)">
              <el-icon><Link /></el-icon>B 归并到 A
            </el-button>
          </div>
        </div>
        <el-row :gutter="12">
          <el-col :span="12">
            <div style="border:1px solid #faecd8;border-radius:6px;padding:10px;background:#fffdf5">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <el-tag type="warning" size="small">记录 A</el-tag>
                <el-button link type="primary" size="small" @click="$router.push(`/feedbacks/${sg.feedback_a.id}`)">
                  查看详情 <el-icon><Right /></el-icon>
                </el-button>
              </div>
              <div style="font-size:13px;line-height:1.7">
                <div><b>编号：</b>{{ sg.feedback_a.feedback_no }}</div>
                <div><b>桥名：</b>{{ sg.feedback_a.bridge_name || '—' }}</div>
                <div><b>地点：</b>{{ sg.feedback_a.location }}</div>
                <div><b>内容：</b>{{ sg.feedback_a.content }}...</div>
              </div>
            </div>
          </el-col>
          <el-col :span="12">
            <div style="border:1px solid #c2e7b0;border-radius:6px;padding:10px;background:#f0f9eb">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <el-tag type="success" size="small">记录 B（建议作为主记录）</el-tag>
                <el-button link type="primary" size="small" @click="$router.push(`/feedbacks/${sg.feedback_b.id}`)">
                  查看详情 <el-icon><Right /></el-icon>
                </el-button>
              </div>
              <div style="font-size:13px;line-height:1.7">
                <div><b>编号：</b>{{ sg.feedback_b.feedback_no }}</div>
                <div><b>桥名：</b>{{ sg.feedback_b.bridge_name || '—' }}</div>
                <div><b>地点：</b>{{ sg.feedback_b.location }}</div>
                <div><b>内容：</b>{{ sg.feedback_b.content }}...</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <el-dialog v-model="mergeDialog" title="确认归并" width="600px" :close-on-click-modal="false">
      <div v-if="mergeTarget" style="font-size:13px;line-height:1.9">
        <el-alert type="info" :closable="false" style="margin-bottom:14px">
          <template #title>
            将从记录 <b>{{ mergeTarget.from.feedback_no }}</b> 归并到主记录 <b>{{ mergeTarget.to.feedback_no }}</b>。
            归并后从记录状态变为"已归并"，主记录保留所有内容，归并理由永久留痕。
          </template>
        </el-alert>
        <el-form label-width="100px">
          <el-form-item label="从记录">
            <el-tag type="warning">{{ mergeTarget.from.feedback_no }}</el-tag>
            <span style="margin-left:8px;color:#606266">{{ mergeTarget.from.location }}</span>
          </el-form-item>
          <el-form-item label="主记录">
            <el-tag type="success">{{ mergeTarget.to.feedback_no }}</el-tag>
            <span style="margin-left:8px;color:#606266">{{ mergeTarget.to.location }}</span>
          </el-form-item>
          <el-form-item label="归并理由" required>
            <el-input v-model="mergeForm.reason" type="textarea" :rows="2"
              placeholder="例：两者均指 XX路慢行桥南坡道，A 为 12345 转办，B 为社区微信群，地点描述用词不同但指向同一位置" />
          </el-form-item>
          <el-form-item label="归并证据">
            <el-input v-model="mergeForm.evidence" type="textarea" :rows="2"
              placeholder="例：现场踏勘照片确认、百度地图坐标核对两点间距小于 30 米、社区居委会确认属同一桥" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="mergeDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmMerge">确认归并（留痕）</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAppStore } from '@/store'
import { api } from '@/api'
import { ElMessage } from 'element-plus'

const store = useAppStore()
const loading = ref(false)
const suggests = ref([])
const mergeDialog = ref(false)
const mergeTarget = ref(null)
const mergeForm = reactive({ reason: '', evidence: '' })

const refresh = async () => {
  loading.value = true
  try {
    suggests.value = await api.suggestDuplicates()
  } finally {
    loading.value = false
  }
}

const openMergeDialog = (fromFb, toFb, reasons) => {
  mergeTarget.value = { from: fromFb, to: toFb }
  mergeForm.reason = reasons?.join('；') || ''
  mergeForm.evidence = ''
  mergeDialog.value = true
}

const confirmMerge = async () => {
  if (!mergeForm.reason.trim()) {
    ElMessage.warning('请填写归并理由，便于后续溯源')
    return
  }
  await api.createMerge({
    merged_from_id: mergeTarget.value.from.id,
    merged_to_id: mergeTarget.value.to.id,
    merge_reason: mergeForm.reason,
    merge_evidence: mergeForm.evidence,
    merged_by: store.operator
  })
  ElMessage.success('归并完成，已写入两条记录的操作日志')
  mergeDialog.value = false
  await refresh()
}

onMounted(refresh)
</script>
