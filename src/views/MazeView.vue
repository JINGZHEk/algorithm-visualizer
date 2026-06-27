<template>
  <div class="algorithm-page">
    <div class="left-panel">
      <div class="panel-title">迷宫求解（回溯法）</div>

      <div class="info-card">
        <label>类型</label>
        <div class="value">回溯算法</div>
      </div>
      <div class="info-card">
        <label>时间复杂度</label>
        <div class="value">O(2^(n*m)) 最坏 / O(n*m) 一般</div>
      </div>
      <div class="info-card">
        <label>空间复杂度</label>
        <div class="value">O(n*m)</div>
      </div>

      <div class="panel-title" style="margin-top:16px">渲染后端</div>
      <el-radio-group v-model="rendererBackend" size="small" style="margin-bottom: 14px;">
        <el-radio-button label="canvas">Canvas 2D</el-radio-button>
        <el-radio-button label="d3">SVG/D3</el-radio-button>
      </el-radio-group>

      <div class="panel-title">随机生成</div>
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
        <el-input-number v-model="mazeRows" :min="4" :max="10" size="small" style="width:80px;" />
        <span style="color:var(--text-muted);">×</span>
        <el-input-number v-model="mazeCols" :min="4" :max="10" size="small" style="width:80px;" />
        <el-button size="small" @click="generateRandomMaze" style="flex:1;">随机生成</el-button>
      </div>

      <div class="panel-title">预设测试用例</div>
      <el-button
        v-for="tc in mazeTestCases"
        :key="tc.name"
        text
        style="width:100%; justify-content:flex-start; margin-bottom:4px;"
        @click="loadTestCase(tc)"
      >
        {{ tc.name }} - {{ tc.description }}
      </el-button>

      <el-button type="primary" @click="runAlgorithm" style="width:100%; margin-top:16px;">
        开始求解
      </el-button>
    </div>

    <div class="center-panel">
      <div class="visualization-area" ref="canvasContainer">
        <canvas ref="canvas"></canvas>
      </div>
      <PlaybackControls
        algorithm-name="迷宫求解(回溯法)"
        :input-data="currentTestName"
        time-complexity="O(n*m)"
        space-complexity="O(n*m)"
      />
    </div>

    <div class="right-panel">
      <div class="panel-title">伪代码</div>
      <div class="pseudocode-container">
        <div
          v-for="(line, idx) in mazeInfo.pseudocode"
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
        选择迷宫并点击"开始求解"
      </div>

      <div class="panel-title" style="margin-top:16px">图例</div>
      <div class="info-card">
        <div style="font-size:12px; line-height:2;">
          <span style="color:#1a1a2e;">■</span> 墙壁&nbsp;&nbsp;
          <span style="color:#2a4a7f;">■</span> 通道&nbsp;&nbsp;
          <span style="color:#67c23a;">■</span> 当前路径<br/>
          <span style="color:#e6a23c;">■</span> 已探索&nbsp;&nbsp;
          <span style="color:#f56c6c;">■</span> 回溯&nbsp;&nbsp;
          <span style="color:#00d4ff;">■</span> 起/终点
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAlgorithmStore } from '../stores/algorithm'
import PlaybackControls from '../components/PlaybackControls.vue'
import { generateMazeSteps, generateMaze, parseMazeFromArray, mazeInfo, mazeTestCases } from '../algorithms/maze'
import type { MazeGrid } from '../algorithms/maze'
import type { AlgorithmStep, RendererBackend } from '../types'
import type { VisualRenderer } from '../renderers/types'
import { createRenderer } from '../renderers/rendererFactory'

type Position = [number, number]

interface MazeStepData {
  grid: MazeGrid
  visited: boolean[][]
  path: Position[]
  current: Position | null
  allVisited: Position[]
  trying?: Position
  backtrack?: boolean
  found?: boolean
}

const store = useAlgorithmStore()
const canvas = ref<HTMLCanvasElement | null>(null)
const canvasContainer = ref<HTMLElement | null>(null)
const rendererBackend = ref<RendererBackend>('canvas')
const currentGrid = ref<MazeGrid>(parseMazeFromArray(mazeTestCases[0].input))
const currentTestName = ref(mazeTestCases[0].name)
const mazeRows = ref(6)
const mazeCols = ref(6)

let renderer: VisualRenderer | null = null
let rendererKey = ''

function loadTestCase(tc: typeof mazeTestCases[0]) {
  currentGrid.value = parseMazeFromArray(tc.input)
  currentTestName.value = tc.name
  store.stop()
}

function generateRandomMaze() {
  currentGrid.value = generateMaze(mazeRows.value, mazeCols.value)
  currentTestName.value = `随机迷宫 ${mazeRows.value}x${mazeCols.value}`
  store.stop()
}

function runAlgorithm() {
  const steps = generateMazeSteps(currentGrid.value)
  store.loadSteps(steps)
  store.play()
}

function ensureRenderer() {
  const container = canvasContainer.value
  if (!container) return
  const nextKey = `maze:${rendererBackend.value}`
  if (renderer && rendererKey === nextKey) return
  renderer?.destroy()
  renderer = createRenderer({ algorithm: 'maze', backend: rendererBackend.value })
  renderer.mount({ container, canvas: canvas.value })
  rendererKey = nextKey
}

function drawVisualization() {
  ensureRenderer()
  renderer?.render(store.currentStep as AlgorithmStep<MazeStepData> | null)
}

function resizeVisualization() {
  if (!renderer) { drawVisualization(); return }
  renderer.resize()
  renderer.render(store.currentStep as AlgorithmStep<MazeStepData> | null)
}

watch([() => store.currentStep, rendererBackend], () => { drawVisualization() })

// Re-render when grid changes
watch(currentGrid, () => { drawVisualization() })

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
