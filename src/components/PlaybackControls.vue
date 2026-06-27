<template>
  <div class="control-bar">
    <div class="control-cluster transport">
      <button class="control-icon" @click="store.stop()" title="重置" aria-label="重置动画">
        <el-icon><RefreshLeft /></el-icon>
      </button>
      <button
        class="control-icon"
        @click="store.stepBackward()"
        title="上一步 (←)"
        aria-label="上一步"
        :disabled="store.currentStepIndex <= 0"
      >
        <el-icon><DArrowLeft /></el-icon>
      </button>
      <button
        v-if="store.playbackState !== 'playing'"
        class="control-icon play"
        @click="store.play()"
        title="播放 (Space)"
        aria-label="播放动画"
        :disabled="store.totalSteps === 0"
      >
        <el-icon><VideoPlay /></el-icon>
      </button>
      <button v-else class="control-icon play" @click="store.pause()" title="暂停 (Space)" aria-label="暂停动画">
        <el-icon><VideoPause /></el-icon>
      </button>
      <button
        class="control-icon"
        @click="store.stepForward()"
        title="下一步 (→)"
        aria-label="下一步"
        :disabled="store.currentStepIndex >= store.totalSteps - 1"
      >
        <el-icon><DArrowRight /></el-icon>
      </button>
    </div>

    <div class="timeline-panel">
      <div class="timeline-meta">
        <span>执行进度</span>
        <strong>{{ stepLabel }}</strong>
      </div>
      <el-slider
        v-model="progressValue"
        :max="Math.max(store.totalSteps - 1, 0)"
        :step="1"
        :show-tooltip="true"
        :format-tooltip="(val: number) => `步骤 ${val + 1}/${store.totalSteps || 0}`"
        @input="onSliderInput"
        @change="onSliderChange"
      />
    </div>

    <div class="control-cluster speed-panel">
      <span>速度</span>
      <el-slider
        v-model="speedValue"
        :min="50"
        :max="2000"
        :step="50"
        :format-tooltip="(val: number) => `${val}ms/步`"
        @change="onSpeedChange"
      />
    </div>

    <button class="export-btn" @click="handleExport" title="导出执行日志" :disabled="store.totalSteps === 0">
      <el-icon><Download /></el-icon>
      <span>导出日志</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { DArrowLeft, DArrowRight, Download, RefreshLeft, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import { useAlgorithmStore } from '../stores/algorithm'
import { throttle } from '../utils/timing'

const props = defineProps<{
  algorithmName: string
  inputData: string
  timeComplexity: string
  spaceComplexity: string
}>()

const store = useAlgorithmStore()
const progressValue = ref(0)
const speedValue = ref(500)

const stepLabel = computed(() => {
  if (!store.totalSteps) return '等待生成'
  return `${Math.max(store.currentStepIndex + 1, 0)} / ${store.totalSteps}`
})

watch(() => store.currentStepIndex, (val) => {
  progressValue.value = Math.max(val, 0)
})

function onSliderChange(val: number) {
  store.jumpTo(val)
}

const onSliderInput = throttle((val: number | number[]) => {
  if (typeof val === 'number') store.jumpTo(val)
}, 40)

function onSpeedChange(val: number) {
  store.setSpeed(val)
}

function handleExport() {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`
  const text = store.exportLog(props.algorithmName, props.inputData, props.timeComplexity, props.spaceComplexity)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.algorithmName}_${stamp}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// Keyboard shortcuts
function onKeydown(e: globalThis.KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
  switch (e.key) {
    case ' ': e.preventDefault(); if (store.playbackState === 'playing') { store.pause() } else { store.play() } break
    case 'ArrowLeft': e.preventDefault(); store.stepBackward(); break
    case 'ArrowRight': e.preventDefault(); store.stepForward(); break
    case 'r': case 'R': e.preventDefault(); store.stop(); break
    case '1': store.setSpeed(1000); speedValue.value = 1000; break
    case '2': store.setSpeed(500); speedValue.value = 500; break
    case '3': store.setSpeed(250); speedValue.value = 250; break
    case '4': store.setSpeed(100); speedValue.value = 100; break
    case '5': store.setSpeed(50); speedValue.value = 50; break
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>
