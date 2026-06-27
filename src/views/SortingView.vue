<template>
  <div class="algorithm-page">
    <!-- Left Panel: Controls -->
    <div class="left-panel">
      <div class="panel-title">{{ info.name }}</div>

      <div class="info-card">
        <label>类型</label>
        <div class="value">{{ info.category }}</div>
      </div>
      <div class="info-card">
        <label>时间复杂度</label>
        <div class="value">{{ info.timeComplexity }}</div>
      </div>
      <div class="info-card">
        <label>空间复杂度</label>
        <div class="value">{{ info.spaceComplexity }}</div>
      </div>

      <div class="panel-title" style="margin-top:16px">渲染后端</div>
      <el-radio-group v-model="rendererBackend" size="small" style="margin-bottom: 14px;">
        <el-radio-button label="canvas">Canvas 2D</el-radio-button>
        <el-radio-button label="d3">SVG/D3</el-radio-button>
      </el-radio-group>

      <div class="panel-title" style="margin-top:16px">数据输入</div>

      <el-input
        v-model="inputText"
        type="textarea"
        :rows="3"
        placeholder="输入逗号分隔的整数，如: 64,34,25,12,22,11,90"
        style="margin-bottom: 12px;"
      />

      <el-button type="primary" @click="runAlgorithm" style="width:100%; margin-bottom:8px;">
        开始可视化
      </el-button>
      <el-button @click="generateRandom" style="width:100%; margin-bottom:16px;">
        随机生成
      </el-button>

      <div class="panel-title">预设测试用例</div>
      <el-button
        v-for="tc in testCases"
        :key="tc.name"
        text
        style="width:100%; justify-content:flex-start; margin-bottom:4px;"
        @click="loadTestCase(tc)"
      >
        {{ tc.name }} - {{ tc.description }}
      </el-button>
    </div>

    <!-- Center: Visualization -->
    <div class="center-panel">
      <div class="visualization-area" ref="canvasContainer">
        <canvas ref="canvas"></canvas>
      </div>
      <PlaybackControls
        :algorithm-name="info.name"
        :input-data="inputText"
        :time-complexity="info.timeComplexity"
        :space-complexity="info.spaceComplexity"
      />
    </div>

    <!-- Right Panel: Pseudocode & Description -->
    <div class="right-panel">
      <div class="panel-title">伪代码</div>
      <div class="pseudocode-container">
        <div
          v-for="(line, idx) in info.pseudocode"
          :key="idx"
          class="pseudocode-line"
          :class="{ active: store.currentStep?.highlightLine === idx }"
        >
          {{ line }}
        </div>
      </div>

      <div class="panel-title" style="margin-top:16px">当前步骤</div>
      <div class="step-description" v-if="store.currentStep">
        <strong>步骤 {{ store.currentStepIndex + 1 }}/{{ store.totalSteps }}</strong><br/>
        {{ store.currentStep.description }}
      </div>
      <div class="step-description" v-else>
        点击"开始可视化"运行算法
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAlgorithmStore } from '../stores/algorithm'
import PlaybackControls from '../components/PlaybackControls.vue'
import {
  bubbleSortInfo,
  quickSortInfo,
  sortingTestCases
} from '../algorithms/sorting'
import { ElMessage } from 'element-plus'
import { generateAlgorithmStepsInWorker } from '../services/algorithmWorkerClient'
import { createRenderer } from '../renderers/rendererFactory'
import type { AlgorithmStep, AlgorithmType, RendererBackend } from '../types'
import type { VisualRenderer } from '../renderers/types'
import { writeLastInput, readLastInputs } from '../utils/storage'

const route = useRoute()
const store = useAlgorithmStore()
const canvas = ref<HTMLCanvasElement | null>(null)
const canvasContainer = ref<HTMLElement | null>(null)

// Restore last input
const lastInputs = readLastInputs()
const sortType = computed<AlgorithmType>(() => route.params.type === 'quick' ? 'quick' : 'bubble')
const initialType = (route.params.type === 'quick' ? 'quick' : 'bubble') as AlgorithmType
const inputText = ref(lastInputs[initialType] || (initialType === 'quick' ? '45, 12, 89, 33, 67, 21, 9' : '64, 34, 25, 12, 22, 11, 90'))
const rendererBackend = ref<RendererBackend>('canvas')
let renderer: VisualRenderer<AlgorithmStep> | null = null
let rendererKey = ''

const info = computed(() => sortType.value === 'quick' ? quickSortInfo : bubbleSortInfo)
const testCases = computed(() => sortType.value === 'quick' ? sortingTestCases.quick : sortingTestCases.bubble)

watch(() => route.params.type, (val) => {
  store.stop()
  const algoType = (val === 'quick' ? 'quick' : 'bubble') as AlgorithmType
  if (lastInputs[algoType]) inputText.value = lastInputs[algoType]!
  else if (val !== 'quick') inputText.value = '64, 34, 25, 12, 22, 11, 90'
  else inputText.value = '45, 12, 89, 33, 67, 21, 9'
  drawVisualization()
})

function parseInput(): number[] | null {
  const text = inputText.value.trim()
  if (!text) {
    ElMessage.warning('请输入数据')
    return null
  }
  const parts = text.split(/[,，\s]+/)
  const nums: number[] = []
  for (const p of parts) {
    const n = parseInt(p.trim())
    if (isNaN(n)) {
      ElMessage.error(`输入包含非法字符: "${p}"，请输入逗号分隔的整数`)
      return null
    }
    if (n < -999 || n > 999) {
      ElMessage.error(`数值 ${n} 超出范围 [-999, 999]`)
      return null
    }
    nums.push(n)
  }
  if (nums.length < 2) {
    ElMessage.warning('请至少输入2个数字')
    return null
  }
  if (nums.length > 20) {
    ElMessage.warning('为保证可视化效果，最多支持20个数字')
    return null
  }
  return nums
}

async function runAlgorithm() {
  const data = parseInput()
  if (!data) return
  writeLastInput(sortType.value, inputText.value)
  try {
    const steps = await generateAlgorithmStepsInWorker(sortType.value, data)
    store.loadSteps(steps)
    store.play()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '算法执行失败'
    ElMessage.error(message)
  }
}

function generateRandom() {
  const len = 6 + Math.floor(Math.random() * 6)
  const arr = Array.from({ length: len }, () => Math.floor(Math.random() * 90) + 10)
  inputText.value = arr.join(', ')
  writeLastInput(sortType.value, inputText.value)
}

function loadTestCase(tc: { name: string; input: number[]; description: string }) {
  inputText.value = tc.input.join(', ')
  writeLastInput(sortType.value, inputText.value)
}

function ensureRenderer() {
  const container = canvasContainer.value
  if (!container) return

  const nextKey = `sorting:${rendererBackend.value}`
  if (renderer && rendererKey === nextKey) return

  renderer?.destroy()
  renderer = createRenderer({ algorithm: 'sorting', backend: rendererBackend.value })
  renderer.mount({ container, canvas: canvas.value })
  rendererKey = nextKey
}

function drawVisualization() {
  ensureRenderer()
  renderer?.render(store.currentStep as AlgorithmStep<number[]> | null)
}

function resizeVisualization() {
  if (!renderer) {
    drawVisualization()
    return
  }
  renderer.resize()
  renderer.render(store.currentStep as AlgorithmStep<number[]> | null)
}

watch([() => store.currentStep, rendererBackend], () => {
  drawVisualization()
})

onMounted(async () => {
  await nextTick()
  drawVisualization()
  window.addEventListener('resize', resizeVisualization)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeVisualization)
  renderer?.destroy()
})
</script>
