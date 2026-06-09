<template>
  <div class="chart-wrap" ref="chartRef" :style="{ width, height }"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  option: { type: Object, required: true },
  width: { type: String, default: '100%' },
  height: { type: String, default: '360px' },
})

const chartRef = ref(null)
let instance = null

function render() {
  if (!chartRef.value) return
  if (!instance) {
    instance = echarts.init(chartRef.value)
  }
  instance.setOption(props.option || {}, true)
}

function resize() {
  instance && instance.resize()
}

onMounted(async () => {
  await nextTick()
  render()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  instance && instance.dispose()
  instance = null
})

watch(() => props.option, render, { deep: true })

defineExpose({ resize })
</script>

<style scoped>
.chart-wrap {
  min-height: 200px;
}
</style>
