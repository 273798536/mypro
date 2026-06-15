<template>
  <div class="filter-bar card" style="margin: 16px 16px 0 16px; padding: 16px 24px">
    <el-form :inline="true" :model="store.filterState" label-width="80px" size="default">
      <el-form-item label="行政区">
        <el-select
          v-model="localFilter.district"
          placeholder="全部"
          clearable
          style="width: 140px"
          @change="onChange"
        >
          <el-option
            v-for="d in store.districtOptions"
            :key="d"
            :label="d"
            :value="d"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="街道">
        <el-select
          v-model="localFilter.street"
          placeholder="全部"
          clearable
          style="width: 160px"
          @change="onChange"
        >
          <el-option
            v-for="s in store.streetOptions"
            :key="s"
            :label="s"
            :value="s"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="点位类型">
        <el-select
          v-model="localFilter.pointType"
          placeholder="全部"
          clearable
          style="width: 140px"
          @change="onChange"
        >
          <el-option label="沿街外摆" value="street" />
          <el-option label="广场外摆" value="plaza" />
          <el-option label="步行街" value="pedestrian" />
        </el-select>
      </el-form-item>
      <el-form-item label="复核状态">
        <el-select
          v-model="localFilter.status"
          placeholder="全部"
          clearable
          style="width: 140px"
          @change="onChange"
        >
          <el-option label="待复核" value="pending" />
          <el-option label="复核中" value="reviewing" />
          <el-option label="已确认" value="confirmed" />
          <el-option label="有争议" value="disputed" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词">
        <el-input
          v-model="localFilter.keyword"
          placeholder="点位名/地址/编号"
          clearable
          style="width: 220px"
          @input="onChange"
        />
      </el-form-item>
      <el-form-item>
        <el-checkbox
          v-model="localFilter.onlyDuplicate"
          @change="onChange"
          label="仅看重复投诉"
        />
        <el-checkbox
          v-model="localFilter.onlyAbnormal"
          @change="onChange"
          label="仅看异常点位"
          style="margin-left: 12px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onReset">
          <el-icon><Refresh /></el-icon>&nbsp;重置
        </el-button>
      </el-form-item>
    </el-form>
    <div style="padding-left: 80px; color: #909399; font-size: 13px">
      💡 已为你保留筛选条件，刷新页面不会丢失 · 当前命中
      <b style="color: #409eff; margin: 0 4px">{{ store.filteredPoints.length }}</b>
      个点位
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useReviewStore } from '@/store/review'

const store = useReviewStore()

const localFilter = reactive({ ...store.filterState })

watch(
  () => store.filterState,
  (val) => {
    Object.assign(localFilter, val)
  },
  { deep: true }
)

function onChange() {
  store.setFilter({ ...localFilter })
}

function onReset() {
  store.resetFilter()
  Object.assign(localFilter, store.filterState)
}
</script>

<style lang="scss" scoped>
.filter-bar {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
