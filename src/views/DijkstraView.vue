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

      <div class="panel-title">图数据输入</div>
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="6"
        placeholder="节点（逗号分隔）&#10;A, B, C, D, E&#10;---&#10;边（格式: 节点A-节点B:权重）&#10;A-B:4, A-C:2, B-C:1"
        style="margin-bottom: 8px;"
      />
      <div style="font-size:11px; color:var(--text-secondary); margin-bottom:12px; line-height:1.6;">
        上行定义节点，<code style="color:var(--accent);">---</code> 分隔后下行定义边<br/>
        边格式：<code style="color:var(--accent);">A-B:4</code>（无向边，权重为正整数）
      </div>

      <div class="panel-title">源节点</div>
      <el-select v-model="currentSource" size="small" style="width:100%; margin-bottom:14px;">
        <el-option
          v-for="node in displayGraph.nodes"
          :key="node.id"
          :label="node.label"
          :value="node.id"
        />
      </el-select>

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

    <div class="center-panel">
      <div class="visualization-area" ref="canvasContainer">
        <canvas ref="canvas"></canvas>
      </div>
      <PlaybackControls
        algorithm-name="Dijkstra最短路径"
        :input-data="inputSummary"
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
        输入图数据并点击"开始可视化"
      </div>

      <div class="panel-title" style="margin-top:16px">距离表</div>
      <div class="info-card" v-if="stepData?.dist">
        <div v-for="(d, i) in stepData.dist" :key="i" style="display:flex; justify-content:space-between; padding:2px 0; font-size:13px;">
          <span>{{ displayGraph.nodes[i]?.label ?? i }}</span>
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
import { dijkstraInfo, dijkstraTestCases } from '../algorithms/dijkstra'
import type { DijkstraGraph } from '../algorithms/dijkstra'
import { ElMessage } from 'element-plus'
import { createRenderer } from '../renderers/rendererFactory'
import type { AlgorithmStep, RendererBackend } from '../types'
import type { VisualRenderer } from '../renderers/types'
import { writeLastInput, readLastInputs } from '../utils/storage'
import { generateAlgorithmStepsInWorker } from '../services/algorithmWorkerClient'

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

// ─── 默认输入文本（对应预设测试用例 1） ───
const DEFAULT_INPUT = `A, B, C, D, E
---
A-B:4, A-C:2, B-C:1, B-D:5, C-E:3, D-E:1`

// ─── 响应式状态 ───
const store = useAlgorithmStore()
const canvas = ref<HTMLCanvasElement | null>(null)
const canvasContainer = ref<HTMLElement | null>(null)
const rendererBackend = ref<RendererBackend>('canvas')
const inputText = ref(DEFAULT_INPUT)
const currentSource = ref(0)
const displayGraph = ref<DijkstraGraph>(dijkstraTestCases[0].input)
const inputSummary = ref(dijkstraTestCases[0].name)
const testCases = dijkstraTestCases
const stepData = computed(() => store.currentStep?.data as DijkstraStepData | undefined)

let renderer: VisualRenderer | null = null
let rendererKey = ''

// ─── 恢复上次输入 ───
const lastInputs = readLastInputs()
if (lastInputs.dijkstra) {
  try {
    const parsed = JSON.parse(lastInputs.dijkstra)
    if (parsed.input) inputText.value = parsed.input
    if (typeof parsed.source === 'number') currentSource.value = parsed.source
  } catch {
    // 旧格式兼容：仅存了 source 节点编号
    const restored = Number(lastInputs.dijkstra)
    if (!isNaN(restored) && restored >= 0) currentSource.value = restored
  }
}

// ─── 圆形布局坐标生成 ───
// 将 n 个节点均匀分布在设计分辨率 (600×400) 的椭圆轨道上
function generateCircularLayout(n: number): { x: number; y: number }[] {
  const cx = 300, cy = 200
  const rx = Math.min(180, 130 + n * 8)
  const ry = Math.min(140, 100 + n * 6)
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    return {
      x: Math.round(cx + rx * Math.cos(angle)),
      y: Math.round(cy + ry * Math.sin(angle)),
    }
  })
}

// ─── 图输入解析器 ───
// 支持格式:
//   A, B, C, D, E
//   ---
//   A-B:4, A-C:2, B-C:1
//
// 也支持纯边列表（自动推断节点）:
//   A-B:4, A-C:2, B-C:1
interface ParseResult {
  graph: DijkstraGraph
  source: number
}

function parseGraphInput(): ParseResult | null {
  const text = inputText.value.trim()
  if (!text) {
    ElMessage.warning('请输入图数据')
    return null
  }

  // 按分隔符拆分：支持 ---、空行、或纯边列表（无分隔符时整段作为边）
  let nodesSection = ''
  let edgesSection = ''

  const sepIdx = text.indexOf('---')
  if (sepIdx !== -1) {
    nodesSection = text.slice(0, sepIdx).trim()
    edgesSection = text.slice(sepIdx + 3).trim()
  } else {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) {
      ElMessage.warning('请输入图数据')
      return null
    }
    // 如果只有一行或没有空行分隔，尝试智能判断
    // 含有 : 或 - 的行视为边定义
    const firstLineHasEdgePattern = /[-—]\s*[:：]\s*\d+/.test(lines[0])
    if (lines.length === 1 || firstLineHasEdgePattern) {
      nodesSection = ''
      edgesSection = lines.join(', ')
    } else {
      nodesSection = lines[0]
      edgesSection = lines.slice(1).join(', ')
    }
  }

  // ── 解析节点 ──
  let nodeLabels: string[]
  if (nodesSection) {
    nodeLabels = nodesSection
      .split(/[,，\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
  } else {
    nodeLabels = []
  }

  // 校验节点标签合法性
  const labelSet = new Set<string>()
  for (const label of nodeLabels) {
    if (label.length > 6) {
      ElMessage.error(`节点标签 "${label}" 过长（最多6个字符）`)
      return null
    }
    if (/[,:：\-\—\s]/.test(label)) {
      ElMessage.error(`节点标签 "${label}" 包含非法字符（不能使用逗号、冒号、连字符或空格）`)
      return null
    }
    if (labelSet.has(label)) {
      ElMessage.error(`节点标签 "${label}" 重复`)
      return null
    }
    labelSet.add(label)
  }

  // ── 解析边 ──
  interface RawEdge { from: number; to: number; weight: number }
  const edges: RawEdge[] = []

  if (edgesSection) {
    // 按逗号、分号、换行拆分边定义
    const edgeParts = edgesSection.split(/[,，;\n]+/).map(s => s.trim()).filter(Boolean)
    for (const part of edgeParts) {
      // 匹配: A-B:5  A - B : 5  A—B:5  等变体
      const m = part.match(
        /^(.+?)\s*[-—]\s*(.+?)\s*[:：]\s*(\d+(?:\.\d+)?)$/
      )
      if (!m) {
        ElMessage.error(`边格式错误: "${part}"，正确格式: A-B:5`)
        return null
      }
      const fromLabel = m[1].trim()
      const toLabel = m[2].trim()
      const weight = parseFloat(m[3])

      // 自动推断节点（纯边列表模式）
      if (!labelSet.has(fromLabel)) {
        if (nodeLabels.length > 0) {
          ElMessage.error(`节点 "${fromLabel}" 未在节点列表中定义`)
          return null
        }
        if (labelSet.size >= 10) {
          ElMessage.error('自动推断节点数超过上限（10个），请显式定义节点')
          return null
        }
        labelSet.add(fromLabel)
        nodeLabels.push(fromLabel)
      }
      if (!labelSet.has(toLabel)) {
        if (nodeLabels.length > 0) {
          ElMessage.error(`节点 "${toLabel}" 未在节点列表中定义`)
          return null
        }
        if (labelSet.size >= 10) {
          ElMessage.error('自动推断节点数超过上限（10个），请显式定义节点')
          return null
        }
        labelSet.add(toLabel)
        nodeLabels.push(toLabel)
      }

      if (fromLabel === toLabel) {
        ElMessage.error(`不支持自环边: "${part}"`)
        return null
      }
      if (weight <= 0 || !Number.isFinite(weight)) {
        ElMessage.error(`边 "${part}" 的权重必须为正数`)
        return null
      }
      if (weight > 9999) {
        ElMessage.error(`边 "${part}" 的权重过大（最大 9999）`)
        return null
      }

      const fromId = nodeLabels.indexOf(fromLabel)
      const toId = nodeLabels.indexOf(toLabel)
      edges.push({ from: fromId, to: toId, weight })
    }
  }

  // ── 最终校验 ──
  if (nodeLabels.length < 2) {
    ElMessage.warning('至少需要 2 个节点')
    return null
  }
  if (nodeLabels.length > 10) {
    ElMessage.warning('为保证可视化效果，最多支持 10 个节点')
    return null
  }
  if (edges.length === 0) {
    ElMessage.warning('请至少定义一条边')
    return null
  }

  // ── 生成圆形布局坐标 ──
  const coords = generateCircularLayout(nodeLabels.length)
  const nodes = nodeLabels.map((label, i) => ({
    id: i,
    label,
    x: coords[i].x,
    y: coords[i].y,
  }))

  return {
    graph: { nodes, edges },
    source: 0,
  }
}

// ─── 运计算法（Worker 异步路径） ───
async function runAlgorithm() {
  const result = parseGraphInput()
  if (!result) return

  const { graph, source } = result

  // 校验源节点在当前图中是否有效
  let effectiveSource = currentSource.value
  if (effectiveSource < 0 || effectiveSource >= graph.nodes.length) {
    effectiveSource = source
  }

  displayGraph.value = graph
  currentSource.value = effectiveSource
  inputSummary.value = `${graph.nodes.length}节点 ${graph.edges.length}边`
  store.stop()

  // 持久化到 localStorage（JSON 格式，包含输入文本和源节点）
  writeLastInput('dijkstra', JSON.stringify({
    input: inputText.value,
    source: effectiveSource,
  }))

  try {
    const steps = await generateAlgorithmStepsInWorker('dijkstra', {
      graph,
      source: effectiveSource,
    })
    store.loadSteps(steps)
    store.play()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '算法执行失败'
    ElMessage.error(message)
  }
}

// ─── 随机图生成 ───
function generateRandom() {
  const n = 5 + Math.floor(Math.random() * 4) // 5-8 个节点
  const labels = 'ABCDEFGH'.slice(0, n).split('')

  // 先生成随机权重矩阵，用于去重
  const edgeSet = new Set<string>()
  const edges: { from: number; to: number; weight: number }[] = []

  // 确保连通：生成随机生成树（Prims 简化版）
  const connected = new Set<number>([0])
  const remaining = new Set<number>(labels.map((_, i) => i).filter(i => i > 0))
  while (remaining.size > 0) {
    const from = Array.from(connected)[Math.floor(Math.random() * connected.size)]
    const toArr = Array.from(remaining)
    const to = toArr[Math.floor(Math.random() * toArr.length)]
    const weight = 1 + Math.floor(Math.random() * 12)
    const key = `${Math.min(from, to)}-${Math.max(from, to)}`
    edgeSet.add(key)
    edges.push({ from, to, weight })
    connected.add(to)
    remaining.delete(to)
  }

  // 添加额外随机边（密度约 40%）
  const maxExtra = Math.floor((n * (n - 1) / 2 - edges.length) * 0.4)
  for (let i = 0; i < maxExtra; i++) {
    const a = Math.floor(Math.random() * n)
    let b = Math.floor(Math.random() * n)
    if (a === b) continue
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`
    if (edgeSet.has(key)) continue
    edgeSet.add(key)
    edges.push({
      from: a,
      to: b,
      weight: 1 + Math.floor(Math.random() * 15),
    })
  }

  // 构造输入文本
  const nodesStr = labels.join(', ')
  const edgesStr = edges
    .map(e => `${labels[e.from]}-${labels[e.to]}:${e.weight}`)
    .join(', ')
  inputText.value = `${nodesStr}\n---\n${edgesStr}`

  // 随机选源节点
  currentSource.value = Math.floor(Math.random() * n)
  store.stop()
}

// ─── 加载预设测试用例 ───
function loadTestCase(tc: typeof dijkstraTestCases[0]) {
  // 将预设图转为输入文本格式
  const labels = tc.input.nodes.map(n => n.label)
  const edgeStrs = tc.input.edges.map(
    e => `${labels[e.from]}-${labels[e.to]}:${e.weight}`
  )
  inputText.value = `${labels.join(', ')}\n---\n${edgeStrs.join(', ')}`
  displayGraph.value = tc.input
  currentSource.value = tc.source
  inputSummary.value = tc.name
  store.stop()
}

// ─── 渲染器管理 ───
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

// 源节点变更时停止播放并重绘
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
