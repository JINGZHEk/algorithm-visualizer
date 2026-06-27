<template>
  <div class="home-container">
    <section class="home-hero">
      <div class="hero-copy">
        <div class="eyebrow">
          <el-icon><MagicStick /></el-icon>
          交互式算法学习平台
        </div>
        <h2>把每一步算法执行过程变成可观察、可解释、可复盘的实验。</h2>
        <p>
          AlgoVista 将动画演示、伪代码高亮、执行日志与 AI 问答放在同一个工作台，
          帮助你从“看懂结果”进一步走到“理解过程”。
        </p>

        <div class="hero-actions">
          <button class="primary-action" @click="router.push('/sorting/bubble')">
            <el-icon><Promotion /></el-icon>
            开始实验
          </button>
          <button class="secondary-action" @click="router.push('/compare')">
            <el-icon><DataAnalysis /></el-icon>
            对比排序算法
          </button>
        </div>
      </div>

      <div class="hero-preview" aria-label="算法执行预览">
        <div class="preview-head">
          <span class="status-dot"></span>
          <span>Execution Trace</span>
          <strong>Live</strong>
        </div>
        <div class="preview-canvas">
          <span
            v-for="bar in previewBars"
            :key="bar.label"
            class="preview-bar"
            :class="bar.state"
            :style="{ height: `${bar.height}%` }"
          >
            <small>{{ bar.label }}</small>
          </span>
        </div>
        <div class="preview-flow">
          <div v-for="item in flowItems" :key="item.label">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="home-metrics">
      <div v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.caption }}</small>
      </div>
    </section>

    <section class="home-section">
      <div class="section-heading">
        <div>
          <span>Algorithm Modules</span>
          <h3>选择算法开始可视化</h3>
        </div>
        <p>覆盖排序、图、树、回溯等课程设计核心场景。</p>
      </div>

      <div class="home-grid">
        <article
          class="algo-card"
          v-for="algo in algorithms"
          :key="algo.id"
          @click="navigate(algo)"
        >
          <div class="card-top">
            <div class="card-icon" :class="algo.accent">
              <el-icon><component :is="algo.icon" /></el-icon>
            </div>
            <span class="difficulty" :class="algo.diffClass">{{ algo.difficulty }}</span>
          </div>
          <div class="category">{{ algo.category }}</div>
          <h3>{{ algo.name }}</h3>
          <p>{{ algo.description }}</p>
          <div class="card-meta">
            <span>{{ algo.complexity }}</span>
            <span>{{ algo.pattern }}</span>
          </div>
          <div class="card-cta">
            进入可视化
            <el-icon><Right /></el-icon>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  Aim,
  Connection,
  Cpu,
  DataAnalysis,
  Guide,
  MagicStick,
  Promotion,
  Rank,
  Right,
  Sort,
  Timer,
  TrendCharts,
} from '@element-plus/icons-vue'

const router = useRouter()

const metrics = [
  { label: '算法模块', value: '5', caption: '排序 / 图 / 树 / 回溯' },
  { label: '执行模式', value: '3', caption: '播放 / 单步 / 拖拽进度' },
  { label: '测试用例', value: '15', caption: '含边界条件的预设数据' },
  { label: '学习辅助', value: 'AI', caption: '在线模型 + 离线知识库' },
]

const previewBars = [
  { label: '64', height: 78, state: '' },
  { label: '34', height: 48, state: 'compare' },
  { label: '25', height: 38, state: 'swap' },
  { label: '12', height: 24, state: '' },
  { label: '90', height: 92, state: 'done' },
  { label: '55', height: 66, state: '' },
]

const flowItems = [
  { label: '当前步骤', value: '12 / 36', icon: Timer },
  { label: '比较次数', value: '18', icon: Aim },
  { label: '交换次数', value: '7', icon: TrendCharts },
]

const algorithms = [
  {
    id: 'bubble',
    name: '冒泡排序',
    icon: Sort,
    accent: 'cyan',
    category: '排序算法',
    difficulty: '基础',
    diffClass: 'easy',
    complexity: 'O(n^2)',
    pattern: '相邻交换',
    description: '通过相邻元素的比较和交换，将最大元素逐步冒泡到数组末端。',
    route: '/sorting/bubble',
  },
  {
    id: 'quick',
    name: '快速排序',
    icon: Rank,
    accent: 'violet',
    category: '排序算法',
    difficulty: '进阶',
    diffClass: 'medium',
    complexity: 'O(n log n)',
    pattern: '分治递归',
    description: '选取基准值进行分区，再递归处理左右区间，平均效率更高。',
    route: '/sorting/quick',
  },
  {
    id: 'dijkstra',
    name: 'Dijkstra 最短路径',
    icon: Connection,
    accent: 'amber',
    category: '图算法',
    difficulty: '进阶',
    diffClass: 'medium',
    complexity: 'O(V^2)',
    pattern: '贪心松弛',
    description: '从源点出发，逐步确定距离最近的未访问顶点并松弛边。',
    route: '/dijkstra',
  },
  {
    id: 'huffman',
    name: '哈夫曼树构造',
    icon: Cpu,
    accent: 'emerald',
    category: '树结构',
    difficulty: '进阶',
    diffClass: 'medium',
    complexity: 'O(n log n)',
    pattern: '最优前缀码',
    description: '根据字符频率构造最优编码树，让高频字符拥有更短编码。',
    route: '/huffman',
  },
  {
    id: 'maze',
    name: '迷宫求解（回溯法）',
    icon: Guide,
    accent: 'rose',
    category: '回溯算法',
    difficulty: '挑战',
    diffClass: 'hard',
    complexity: 'O(n*m)',
    pattern: 'DFS 探索',
    description: '沿路径深度探索，遇到死路时回退到上一个分支点继续搜索。',
    route: '/maze',
  },
]

function navigate(algo: typeof algorithms[0]) {
  router.push(algo.route)
}
</script>
