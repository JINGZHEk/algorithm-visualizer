<template>
  <div class="algorithm-page">
    <div class="left-panel">
      <div class="panel-title">Dijkstra 最短路径</div>

      <div class="info-card">
        <label>类型</label>
        <div class="value">图算法</div>
      </div>
      <div class="info-card">
        <label>时间复杂度</label>
        <div class="value">O(V²) / O((V+E)logV)</div>
      </div>
      <div class="info-card">
        <label>空间复杂度</label>
        <div class="value">O(V)</div>
      </div>

      <div class="panel-title" style="margin-top:16px">渲染后端</div>
      <el-radio-group v-model="rendererBackend" size="small" style="margin-bottom: 14px;">
        <el-radio-button label="canvas">Canvas 2D</el-radio-button>
        <el-radio-button label="d3">SVG/D3</el-radio-button>
      </el-radio-group>

      <div class="panel-title">源节点</div>
      <el-select v-model="currentSource" size="small" style="width:100%; margin-bottom:14px;">
        <el-option
          v-for="node in currentGraph.nodes"
          :key="node.id"
          :label="node.label"
          :value="node.id"
        />
      </el-select>

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

      <el-button type="primary" @click="runAlgorithm" style="width:100%; margin-top:16px;">
        开始可视化
      </el-button>
    </div>

    <div class="center-panel">
      <div class="visualization-area" ref="canvasContainer">
        <canvas ref="canvas"></canvas>
      </div>
      <PlaybackControls
        algorithm-name="Dijkstra最短路径"
        :input-data="currentTestName"
        time-complexity="O(V²)"
        space-complexity="O(V)"
      />
    </div>

    <div class="right-panel">
      <div class="panel-title">伪代码</div>
      <div class="pseudocode-container">
        <div
          v-for="(line, idx) in dijkstraInfo.pseudocode"
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
        选择测试用例并点击"开始可视化"
      </div>

      <div class="panel-title" style="margin-top:16px">距离表</div>
      <div class="info-card" v-if="stepData?.dist">
        <div v-for="(d, i) in stepData.dist" :key="i" style="display:flex; justify-content:space-between; padding:2px 0; font-size:13px;">
          <span>{{ currentGraph.nodes[i]?.label ?? i }}</span>
          <span :style="{ color: stepData.visited[i] ? '#67c23a' : '#e8e8e8' }">
            {{ d === Infinity ? '∞' : d }}
            {{ stepData.visited[i] ? '✓' : '' }}
          </span>
        </div>
      </div>

      <div class="panel-title" style="margin-top:16px">图例</div>
      <div class="info-card">
        <div style="font-size:12px; line-height:2;">
          <span style="color:#0f3460;">●</span> 未访问&nbsp;
          <span style="color:#e6a23c;">●</span> 当前节点&nbsp;
          <span style="color:#409eff;">●</span> 检测/更新<br/>
          <span style="color:#67c23a;">●</span> 已确认&nbsp;
          <span style="color:#2a4a7f;">━</span> 边&nbsp;
          <span style="color:#e6a23c;">━</span> 松弛边
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAlgorithmStore } from '../stores/algorithm'
import PlaybackControls from '../components/PlaybackControls.vue'
import { generateDijkstraSteps, dijkstraInfo, dijkstraTestCases } from '../algorithms/dijkstra'
import type { DijkstraGraph } from '../algorithms/dijkstra'
import { createRenderer } from '../renderers/rendererFactory'
import type { AlgorithmStep, RendererBackend } from '../types'
import type { VisualRenderer } from '../renderers/types'
import { writeLastInput, readLastInputs } from '../utils/storage'

interface DijkstraStepData {
  dist: number[]
  visited: boolean[]
  prev: number[]
  current: number
  checking?: number
  updated?: number
  edge?: { from: number; to: number; weight: number }
  graph: DijkstraGraph
}

const store = useAlgorithmStore()
const canvas = ref<HTMLCanvasElement | null>(null)
const canvasContainer = ref<HTMLElement | null>(null)
const rendererBackend = ref<RendererBackend>('canvas')
const currentGraph = ref<DijkstraGraph>(dijkstraTestCases[0].input)
const currentSource = ref(0)
const currentTestName = ref(dijkstraTestCases[0].name)
const testCases = dijkstraTestCases
const stepData = computed(() => store.currentStep?.data as DijkstraStepData | undefined)

let renderer: VisualRenderer | null = null
let rendererKey = ''

// Restore last source node
const lastInputs = readLastInputs()
if (lastInputs.dijkstra) {
  const restored = Number(lastInputs.dijkstra)
  if (!isNaN(restored) && restored >= 0 && restored < dijkstraTestCases[0].input.nodes.length) {
    currentSource.value = restored
  }
}

function loadTestCase(tc: typeof dijkstraTestCases[0]) {
  currentGraph.value = tc.input
  currentSource.value = tc.source
  currentTestName.value = tc.name
  store.stop()
}

function runAlgorithm() {
  writeLastInput('dijkstra', String(currentSource.value))
  const steps = generateDijkstraSteps(currentGraph.value, currentSource.value)
  store.loadSteps(steps)
  store.play()
}

function ensureRenderer() {
  const container = canvasContainer.value
  if (!container) return

  const nextKey = `dijkstra:${rendererBackend.value}`
  if (renderer && rendererKey === nextKey) return

  renderer?.destroy()
  renderer = createRenderer({ algorithm: 'dijkstra', backend: rendererBackend.value })
  renderer.mount({ container, canvas: canvas.value })
  rendererKey = nextKey
}

function drawVisualization() {
  ensureRenderer()
  renderer?.render(store.currentStep as AlgorithmStep<DijkstraStepData> | null)
}

function resizeVisualization() {
  if (!renderer) {
    drawVisualization()
    return
  }
  renderer.resize()
  renderer.render(store.currentStep as AlgorithmStep<DijkstraStepData> | null)
}

watch([() => store.currentStep, rendererBackend], () => {
  drawVisualization()
})

// Source node change re-runs visualization
watch(currentSource, () => {
  store.stop()
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
