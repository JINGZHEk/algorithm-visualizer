<template>
  <div class="algorithm-page compare-page">
    <aside class="left-panel compare-config">
      <div class="panel-title">对比配置</div>
      <p class="compare-muted">
        同一组数据同步运行冒泡排序与快速排序，实时观察步骤数、比较次数、交换次数和执行路径差异。
      </p>

      <div class="panel-title compact">渲染后端</div>
      <el-radio-group v-model="rendererBackend" size="small" style="margin-bottom: 14px;">
        <el-radio-button label="canvas">Canvas 2D</el-radio-button>
        <el-radio-button label="d3">SVG/D3</el-radio-button>
      </el-radio-group>

      <div class="panel-title compact">数据输入</div>
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="4"
        placeholder="输入逗号分隔整数，如 38,27,43,3,9"
      />

      <div class="preset-grid">
        <button
          v-for="preset in presets"
          :key="preset.name"
          class="preset-chip"
          @click="applyPreset(preset.values)"
        >
          <span>{{ preset.name }}</span>
          <small>{{ preset.values.length }}项</small>
        </button>
      </div>

      <div class="compare-actions">
        <el-button type="primary" @click="runCompare">生成对比</el-button>
        <el-button @click="generateRandom">随机数据</el-button>
      </div>

      <div v-if="hasSteps" class="metric-stack">
        <div class="metric-tile winner">
          <span>当前优势</span>
          <strong>{{ winnerText }}</strong>
        </div>
        <div class="metric-tile">
          <span>步骤差</span>
          <strong>{{ stepGap }}</strong>
        </div>
        <div class="metric-tile">
          <span>效率倍率</span>
          <strong>{{ speedRatio }}</strong>
        </div>
      </div>
    </aside>

    <section class="center-panel compare-workbench">
      <div class="compare-hero">
        <div>
          <div class="workspace-kicker">Live Comparison</div>
          <h3>冒泡排序 vs 快速排序</h3>
        </div>
        <div class="hero-stats">
          <div>
            <span>数据规模</span>
            <strong>{{ currentSize }}</strong>
          </div>
          <div>
            <span>同步进度</span>
            <strong>{{ Math.round(timelinePercent) }}%</strong>
          </div>
          <div>
            <span>播放速度</span>
            <strong>{{ clampedSpeed }}ms</strong>
          </div>
        </div>
      </div>

      <div class="compare-grid">
        <article class="compare-card bubble-card">
          <header>
            <div>
              <span class="algo-tag">O(n²)</span>
              <h4>冒泡排序</h4>
            </div>
            <strong>{{ bubbleIndex + 1 }}/{{ bubbleSteps.length || '-' }}</strong>
          </header>
          <div class="visualization-area compare-canvas" ref="bubbleContainer">
            <canvas ref="bubbleCanvas"></canvas>
          </div>
          <div class="stat-row">
            <span>比较 {{ bubbleStats.comparisons }}</span>
            <span>交换 {{ bubbleStats.swaps }}</span>
            <span>完成 {{ Math.round(bubbleProgress) }}%</span>
          </div>
        </article>

        <article class="compare-card quick-card">
          <header>
            <div>
              <span class="algo-tag">Avg O(n log n)</span>
              <h4>快速排序</h4>
            </div>
            <strong>{{ quickIndex + 1 }}/{{ quickSteps.length || '-' }}</strong>
          </header>
          <div class="visualization-area compare-canvas" ref="quickContainer">
            <canvas ref="quickCanvas"></canvas>
          </div>
          <div class="stat-row">
            <span>比较 {{ quickStats.comparisons }}</span>
            <span>交换 {{ quickStats.swaps }}</span>
            <span>完成 {{ Math.round(quickProgress) }}%</span>
          </div>
        </article>
      </div>

      <div class="compare-control-dock">
        <el-button @click="reset">重置</el-button>
        <el-button @click="stepBoth" :disabled="!hasSteps">单步推进</el-button>
        <el-button v-if="!isPlaying" type="primary" @click="playBoth" :disabled="!hasSteps">
          播放对比
        </el-button>
        <el-button v-else @click="pauseBoth">暂停</el-button>
        <el-slider
          :model-value="timelinePercent"
          :min="0"
          :max="100"
          :step="1"
          class="compare-timeline"
          @input="seekPercent"
        />
        <span class="speed-label">速度</span>
        <el-slider v-model="speed" :min="50" :max="2000" :step="50" class="speed-slider" />
      </div>
    </section>

    <aside class="right-panel compare-insights">
      <div class="panel-title">实时洞察</div>
      <div class="insight-card">
        {{ insightText }}
      </div>

      <div class="panel-title compact">当前步骤</div>
      <div class="step-description" v-if="hasSteps">
        <strong>冒泡排序</strong><br>
        {{ bubbleSteps[bubbleIndex]?.description || '已完成' }}
      </div>
      <div class="step-description" v-if="hasSteps">
        <strong>快速排序</strong><br>
        {{ quickSteps[quickIndex]?.description || '已完成' }}
      </div>

      <div class="panel-title compact">对比结论</div>
      <div class="compare-summary">
        <div class="summary-bar">
          <span style="width: 100%">冒泡 {{ bubbleSteps.length || 0 }} 步</span>
        </div>
        <div class="summary-bar quick">
          <span :style="{ width: quickBarWidth }">快排 {{ quickSteps.length || 0 }} 步</span>
        </div>
        <p>
          快速排序通过 pivot 分区减少全局扫描，平均情况下步骤增长更慢；冒泡排序则适合解释稳定排序与相邻交换。
        </p>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { generateBubbleSortSteps, generateQuickSortSteps } from '../algorithms/sorting'
import type { AlgorithmStep, RendererBackend } from '../types'
import type { VisualRenderer } from '../renderers/types'
import { createRenderer } from '../renderers/rendererFactory'
import { AnimationScheduler } from '../utils/AnimationScheduler'

interface CompareStats {
  comparisons: number
  swaps: number
}

interface Preset {
  name: string
  values: number[]
}

const presets: Preset[] = [
  { name: '随机经典', values: [38, 27, 43, 3, 9, 82, 10, 55] },
  { name: '完全逆序', values: [9, 8, 7, 6, 5, 4, 3, 2, 1] },
  { name: '近乎有序', values: [1, 2, 3, 5, 4, 6, 8, 7, 9] },
  { name: '重复元素', values: [5, 3, 8, 3, 9, 1, 5, 2] },
]

const inputText = ref(presets[0].values.join(', '))
const bubbleSteps = ref<AlgorithmStep<number[]>[]>([])
const quickSteps = ref<AlgorithmStep<number[]>[]>([])
const bubbleIndex = ref(0)
const quickIndex = ref(0)
const isPlaying = ref(false)
const speed = ref(500)
const scheduler = new AnimationScheduler()

const bubbleCanvas = ref<HTMLCanvasElement | null>(null)
const quickCanvas = ref<HTMLCanvasElement | null>(null)
const bubbleContainer = ref<HTMLElement | null>(null)
const quickContainer = ref<HTMLElement | null>(null)
const rendererBackend = ref<RendererBackend>('canvas')

let bubbleRenderer: VisualRenderer | null = null
let quickRenderer: VisualRenderer | null = null
let rendererKey = ''

const hasSteps = computed(() => bubbleSteps.value.length > 0 && quickSteps.value.length > 0)
const currentSize = computed(() => parseInput(false)?.length ?? '-')
const bubbleProgress = computed(() => progressOf(bubbleIndex.value, bubbleSteps.value.length))
const quickProgress = computed(() => progressOf(quickIndex.value, quickSteps.value.length))
const timelinePercent = computed(() => Math.max(bubbleProgress.value, quickProgress.value))
const bubbleStats = computed(() => collectStats(bubbleSteps.value.slice(0, bubbleIndex.value + 1)))
const quickStats = computed(() => collectStats(quickSteps.value.slice(0, quickIndex.value + 1)))
const stepGap = computed(() => Math.abs((bubbleSteps.value.length || 0) - (quickSteps.value.length || 0)))
const speedRatio = computed(() => {
  if (!bubbleSteps.value.length || !quickSteps.value.length) return '-'
  return `${(bubbleSteps.value.length / quickSteps.value.length).toFixed(2)}x`
})
const winnerText = computed(() => {
  if (!hasSteps.value) return '等待对比'
  if (quickSteps.value.length < bubbleSteps.value.length) return '快速排序领先'
  if (quickSteps.value.length > bubbleSteps.value.length) return '冒泡排序更短'
  return '步骤持平'
})
const quickBarWidth = computed(() => {
  if (!bubbleSteps.value.length || !quickSteps.value.length) return '0%'
  const ratio = Math.min(1, quickSteps.value.length / bubbleSteps.value.length)
  return `${Math.max(8, ratio * 100)}%`
})
const insightText = computed(() => {
  if (!hasSteps.value) return '输入数据并点击“生成对比”，这里会实时解释两个算法的效率差异。'
  if (quickSteps.value.length < bubbleSteps.value.length) {
    return `快排当前总步骤更少，约为冒泡的 ${speedRatio.value} 效率对比。观察 pivot 分区如何减少无效比较。`
  }
  return '当前数据规模较小或分布特殊，两种算法差距不明显。可以切换“完全逆序”观察最坏情况。'
})

// Speed range unified with PlaybackControls: 50-2000ms
const clampedSpeed = computed(() => Math.max(50, Math.min(2000, speed.value)))
watch(clampedSpeed, (value) => scheduler.setInterval(value))

// Recreate renderers when backend changes
watch(rendererBackend, () => {
  rendererKey = ''
  drawBoth()
})

function progressOf(index: number, total: number): number {
  if (total <= 1) return 0
  return (index / (total - 1)) * 100
}

function collectStats(steps: AlgorithmStep<number[]>[]): CompareStats {
  return steps.reduce<CompareStats>((stats, step) => {
    if (step.comparing?.length) stats.comparisons += 1
    if (step.swapping?.length) stats.swaps += 1
    return stats
  }, { comparisons: 0, swaps: 0 })
}

function parseInput(showError = true): number[] | null {
  const text = inputText.value.trim()
  if (!text) {
    if (showError) ElMessage.warning('请输入数据')
    return null
  }
  const nums = text.split(/[,，\s]+/).map((part) => Number(part.trim()))
  if (nums.some((item) => !Number.isInteger(item))) {
    if (showError) ElMessage.error('请输入逗号分隔的整数')
    return null
  }
  if (nums.length < 2 || nums.length > 20) {
    if (showError) ElMessage.warning('数据数量需在 2 到 20 之间')
    return null
  }
  if (nums.some((item) => item < -999 || item > 999)) {
    if (showError) ElMessage.warning('数值范围需在 -999 到 999 之间')
    return null
  }
  return nums
}

function runCompare(): void {
  const data = parseInput()
  if (!data) return
  pauseBoth()
  bubbleSteps.value = generateBubbleSortSteps([...data]) as AlgorithmStep<number[]>[]
  quickSteps.value = generateQuickSortSteps([...data]) as AlgorithmStep<number[]>[]
  bubbleIndex.value = 0
  quickIndex.value = 0
  drawBoth()
}

function applyPreset(values: number[]): void {
  inputText.value = values.join(', ')
  runCompare()
}

function generateRandom(): void {
  const len = 8 + Math.floor(Math.random() * 6)
  const arr = Array.from({ length: len }, () => Math.floor(Math.random() * 90) + 10)
  inputText.value = arr.join(', ')
  runCompare()
}

function reset(): void {
  pauseBoth()
  bubbleSteps.value = []
  quickSteps.value = []
  bubbleIndex.value = 0
  quickIndex.value = 0
  drawBoth()
}

function stepBoth(): void {
  pauseBoth()
  advanceBoth()
  drawBoth()
}

function playBoth(): void {
  if (!hasSteps.value) return
  isPlaying.value = true
  scheduler.start(speed.value, () => {
    const done = !advanceBoth()
    drawBoth()
    if (done) pauseBoth()
  })
}

function pauseBoth(): void {
  isPlaying.value = false
  scheduler.pause()
}

function advanceBoth(): boolean {
  const bubbleDone = bubbleIndex.value >= bubbleSteps.value.length - 1
  const quickDone = quickIndex.value >= quickSteps.value.length - 1
  if (!bubbleDone) bubbleIndex.value += 1
  if (!quickDone) quickIndex.value += 1
  return !(bubbleDone && quickDone)
}

function seekPercent(value: number | number[]): void {
  if (!hasSteps.value || typeof value !== 'number') return
  pauseBoth()
  bubbleIndex.value = Math.round(((bubbleSteps.value.length - 1) * value) / 100)
  quickIndex.value = Math.round(((quickSteps.value.length - 1) * value) / 100)
  drawBoth()
}

function ensureRenderers(): void {
  const nextKey = `compare:${rendererBackend.value}`
  if (bubbleRenderer && quickRenderer && rendererKey === nextKey) return

  bubbleRenderer?.destroy()
  quickRenderer?.destroy()

  if (bubbleContainer.value && quickContainer.value) {
    bubbleRenderer = createRenderer({ algorithm: 'bubble', backend: rendererBackend.value })
    bubbleRenderer.mount({ container: bubbleContainer.value, canvas: bubbleCanvas.value })

    quickRenderer = createRenderer({ algorithm: 'quick', backend: rendererBackend.value })
    quickRenderer.mount({ container: quickContainer.value, canvas: quickCanvas.value })

    rendererKey = nextKey
  }
}

function drawBoth(): void {
  ensureRenderers()
  if (bubbleRenderer && quickRenderer) {
    bubbleRenderer.render(bubbleSteps.value[bubbleIndex.value] ?? null)
    quickRenderer.render(quickSteps.value[quickIndex.value] ?? null)
  }
}

onMounted(async () => {
  await nextTick()
  runCompare()
  window.addEventListener('resize', drawBoth)
})

onBeforeUnmount(() => {
  scheduler.stop()
  window.removeEventListener('resize', drawBoth)
  bubbleRenderer?.destroy()
  quickRenderer?.destroy()
})
</script>
