<template>
  <div class="algorithm-page">
    <div class="left-panel">
      <div class="panel-title">哈夫曼树构造</div>

      <div class="info-card">
        <label>类型</label>
        <div class="value">树结构</div>
      </div>
      <div class="info-card">
        <label>时间复杂度</label>
        <div class="value">O(n log n)</div>
      </div>
      <div class="info-card">
        <label>空间复杂度</label>
        <div class="value">O(n)</div>
      </div>

      <div class="panel-title" style="margin-top:16px">渲染后端</div>
      <el-radio-group v-model="rendererBackend" size="small" style="margin-bottom: 14px;">
        <el-radio-button label="canvas">Canvas 2D</el-radio-button>
        <el-radio-button label="d3">SVG/D3</el-radio-button>
      </el-radio-group>

      <div class="panel-title">数据输入</div>
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="3"
        placeholder="输入格式: A:5, B:9, C:12（字符:频率）"
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
        v-for="tc in huffmanTestCases"
        :key="tc.name"
        text
        style="width:100%; justify-content:flex-start; margin-bottom:4px;"
        @click="loadTestCase(tc)"
      >
        {{ tc.name }}
      </el-button>
    </div>

    <div class="center-panel">
      <div class="visualization-area" ref="canvasContainer">
        <canvas ref="canvas"></canvas>
      </div>
      <PlaybackControls
        algorithm-name="哈夫曼树构造"
        :input-data="inputText"
        time-complexity="O(n log n)"
        space-complexity="O(n)"
      />
    </div>

    <div class="right-panel">
      <div class="panel-title">伪代码</div>
      <div class="pseudocode-container">
        <div
          v-for="(line, idx) in huffmanInfo.pseudocode"
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
        输入字符频率并点击"开始可视化"
      </div>

      <div class="panel-title" style="margin-top:16px">优先队列</div>
      <div class="info-card" v-if="stepData?.queue">
        <div v-for="(item, i) in stepData.queue" :key="i" style="font-size:13px; padding:2px 0;">
          {{ item.char }}: {{ item.freq }}
        </div>
        <div v-if="stepData.queue.length === 0" style="font-size:13px; color: var(--text-secondary);">
          队列为空（构造完成）
        </div>
      </div>

      <div class="panel-title" style="margin-top:16px" v-if="stepData?.codes">编码结果</div>
      <div class="info-card" v-if="stepData?.codes">
        <div v-for="(code, char) in stepData.codes" :key="char" style="display:flex; justify-content:space-between; font-size:13px; padding:2px 0;">
          <span>{{ char }}</span>
          <span style="color: var(--accent); font-family: Consolas;">{{ code }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAlgorithmStore } from '../stores/algorithm'
import PlaybackControls from '../components/PlaybackControls.vue'
import { generateHuffmanSteps, huffmanInfo, huffmanTestCases } from '../algorithms/huffman'
import type { HuffmanNode } from '../algorithms/huffman'
import { ElMessage } from 'element-plus'
import { createRenderer } from '../renderers/rendererFactory'
import type { AlgorithmStep, RendererBackend } from '../types'
import type { VisualRenderer } from '../renderers/types'
import { writeLastInput, readLastInputs } from '../utils/storage'

interface HuffmanQueueItem {
  char: string
  freq: number
}

interface HuffmanStepData {
  nodes?: HuffmanNode[]
  tree?: HuffmanNode | null
  queue?: HuffmanQueueItem[]
  codes?: Record<string, string>
  merging?: [HuffmanNode, HuffmanNode]
}

const store = useAlgorithmStore()
const canvas = ref<HTMLCanvasElement | null>(null)
const canvasContainer = ref<HTMLElement | null>(null)
const rendererBackend = ref<RendererBackend>('canvas')
const inputText = ref('A:5, B:9, C:12, D:13, E:16')
const stepData = computed(() => store.currentStep?.data as HuffmanStepData | undefined)

let renderer: VisualRenderer | null = null
let rendererKey = ''

// Restore last input
const lastInputs = readLastInputs()
if (lastInputs.huffman) inputText.value = lastInputs.huffman

function parseInput(): { char: string; freq: number }[] | null {
  const text = inputText.value.trim()
  if (!text) { ElMessage.warning('请输入数据'); return null }
  const parts = text.split(/[,，]+/)
  const result: { char: string; freq: number }[] = []
  for (const p of parts) {
    const match = p.trim().match(/^(.+?)\s*[:：]\s*(\d+)$/)
    if (!match) {
      ElMessage.error(`格式错误: "${p.trim()}"，正确格式: 字符:频率`)
      return null
    }
    const freq = parseInt(match[2])
    if (freq <= 0 || freq > 999) {
      ElMessage.error(`频率需在 1~999 之间: "${p.trim()}"`)
      return null
    }
    result.push({ char: match[1].trim(), freq })
  }
  if (result.length < 2) { ElMessage.warning('请至少输入2个字符'); return null }
  if (result.length > 8) { ElMessage.warning('为保证可视化效果，最多支持8个字符'); return null }
  return result
}

function runAlgorithm() {
  const data = parseInput()
  if (!data) return
  writeLastInput('huffman', inputText.value)
  const steps = generateHuffmanSteps(data)
  store.loadSteps(steps)
  store.play()
}

function generateRandom() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const n = 4 + Math.floor(Math.random() * 4)
  const items = Array.from({ length: n }, (_, i) => `${chars[i]}:${Math.floor(Math.random() * 20) + 1}`)
  inputText.value = items.join(', ')
}

function loadTestCase(tc: typeof huffmanTestCases[0]) {
  inputText.value = tc.input.map(i => `${i.char}:${i.freq}`).join(', ')
  store.stop()
}

function ensureRenderer() {
  const container = canvasContainer.value
  if (!container) return
  const nextKey = `huffman:${rendererBackend.value}`
  if (renderer && rendererKey === nextKey) return
  renderer?.destroy()
  renderer = createRenderer({ algorithm: 'huffman', backend: rendererBackend.value })
  renderer.mount({ container, canvas: canvas.value })
  rendererKey = nextKey
}

function drawVisualization() {
  ensureRenderer()
  renderer?.render(store.currentStep as AlgorithmStep<HuffmanStepData> | null)
}

function resizeVisualization() {
  if (!renderer) { drawVisualization(); return }
  renderer.resize()
  renderer.render(store.currentStep as AlgorithmStep<HuffmanStepData> | null)
}

watch([() => store.currentStep, rendererBackend], () => { drawVisualization() })

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
