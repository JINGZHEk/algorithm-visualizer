<template>
  <div class="app-container">
    <transition name="splash">
      <section v-if="showSplash" class="splash-screen" @click="dismissSplash">
        <div class="splash-orbit">
          <span class="orbit-ring ring-a"></span>
          <span class="orbit-ring ring-b"></span>
          <span class="orbit-ring ring-c"></span>
          <div class="splash-core">A</div>
        </div>
        <div class="splash-copy">
          <div class="splash-kicker">ALGORITHM PROCESS VISUALIZER</div>
          <h2>AlgoVista</h2>
          <p>用可视化、动画和 AI，把算法执行过程讲清楚。</p>
        </div>
        <div class="splash-progress">
          <span></span>
        </div>
      </section>
    </transition>

    <aside class="app-sidebar">
      <div class="brand sidebar-brand" @click="$router.push('/')" aria-label="返回首页">
        <div class="logo-mark">A</div>
        <div class="titles">
          <h1><span>AlgoVista</span><strong>算法可视化</strong></h1>
          <div class="subtitle">PROCESS VISUALIZER</div>
        </div>
      </div>

      <nav class="side-nav">
        <div class="nav-section-title">总览</div>
        <button class="side-link" :class="{ active: isActive('/') }" @click="$router.push('/')">
          <el-icon><HomeFilled /></el-icon>
          <span>首页仪表盘</span>
        </button>
        <button class="side-link highlight" :class="{ active: isActive('/compare') }" @click="$router.push('/compare')">
          <el-icon><DataAnalysis /></el-icon>
          <span>算法对比工作台</span>
        </button>

        <div class="nav-section-title">算法实验室</div>
        <button class="side-link" :class="{ active: route.path === '/sorting/bubble' }" @click="$router.push('/sorting/bubble')">
          <span class="nav-dot cyan"></span>
          <span>冒泡排序</span>
        </button>
        <button class="side-link" :class="{ active: route.path === '/sorting/quick' }" @click="$router.push('/sorting/quick')">
          <span class="nav-dot purple"></span>
          <span>快速排序</span>
        </button>
        <button class="side-link" :class="{ active: isActive('/dijkstra') }" @click="$router.push('/dijkstra')">
          <span class="nav-dot yellow"></span>
          <span>Dijkstra 最短路径</span>
        </button>
        <button class="side-link" :class="{ active: isActive('/huffman') }" @click="$router.push('/huffman')">
          <span class="nav-dot green"></span>
          <span>哈夫曼树构造</span>
        </button>
        <button class="side-link" :class="{ active: isActive('/maze') }" @click="$router.push('/maze')">
          <span class="nav-dot pink"></span>
          <span>迷宫 DFS 回溯</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <button class="ai-side-btn" @click="assistant?.open()">
          <el-icon><ChatDotRound /></el-icon>
          <span>AI 算法助手</span>
        </button>
        <el-select
          v-model="theme"
          size="small"
          class="theme-select"
          title="主题切换"
          @change="setTheme"
        >
          <el-option
            v-for="item in themes"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
    </aside>

    <section class="app-workspace">
      <header class="workspace-header">
        <div>
          <div class="workspace-kicker">Algorithm Lab</div>
          <h2>{{ pageTitle }}</h2>
        </div>
        <button class="workspace-ai" @click="assistant?.open()">
          <el-icon><ChatDotRound /></el-icon>
          AI 助手
        </button>
      </header>

      <main class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </section>

    <AiAssistant ref="assistant" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ChatDotRound, DataAnalysis, HomeFilled } from '@element-plus/icons-vue'
import AiAssistant from './components/AiAssistant.vue'
import { useTheme } from './composables/useTheme'

const route = useRoute()
const assistant = ref<InstanceType<typeof AiAssistant> | null>(null)
const { theme, themes, setTheme } = useTheme()
const showSplash = ref(sessionStorage.getItem('algovista_splash_seen') !== '1')

const pageTitle = computed(() => {
  if (route.path === '/') return '算法学习总览'
  if (route.path === '/compare') return '排序算法对比工作台'
  if (route.path === '/sorting/bubble') return '冒泡排序可视化'
  if (route.path === '/sorting/quick') return '快速排序可视化'
  if (route.path === '/dijkstra') return 'Dijkstra 最短路径'
  if (route.path === '/huffman') return '哈夫曼树构造'
  if (route.path === '/maze') return '迷宫 DFS 回溯'
  return '算法实验室'
})

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function dismissSplash() {
  showSplash.value = false
  sessionStorage.setItem('algovista_splash_seen', '1')
}

onMounted(() => {
  if (!showSplash.value) return
  window.setTimeout(dismissSplash, 1800)
})
</script>
