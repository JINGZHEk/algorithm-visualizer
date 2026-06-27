<template>
  <div class="ai-root">
    <transition name="fab">
      <button v-show="!open" class="ai-fab" @click="toggle" title="AI 算法助手">
        <el-icon class="fab-icon"><ChatDotRound /></el-icon>
        <span class="fab-pulse"></span>
      </button>
    </transition>

    <transition name="panel">
      <div v-if="open" class="ai-panel">
        <header class="ai-head">
          <div class="ai-head-title">
            <span class="ai-avatar">
              <el-icon><ChatDotRound /></el-icon>
            </span>
            <div>
              <div class="ai-name">算法助手</div>
              <div class="ai-status">
                <span class="dot" :class="settings.hasApi ? 'on' : 'local'"></span>
                {{ settings.hasApi ? '在线模型' : '离线知识库' }}
                <template v-if="contextName"> · {{ contextName }}</template>
              </div>
            </div>
          </div>
          <div class="ai-head-actions">
            <button class="icon-btn" @click="showSettings = true" title="模型设置">
              <el-icon><Setting /></el-icon>
            </button>
            <button class="icon-btn" @click="clearChat" title="清空对话">
              <el-icon><Delete /></el-icon>
            </button>
            <button class="icon-btn" @click="toggle" title="收起">
              <el-icon><Close /></el-icon>
            </button>
          </div>
        </header>

        <div class="ai-body" ref="bodyRef">
          <div
            v-for="(m, i) in messages"
            :key="i"
            class="msg"
            :class="m.role"
          >
            <div class="bubble" v-html="render(m.content)"></div>
            <button v-if="m.role === 'assistant' && m.content" class="copy-btn" @click="copyMessage(m.content)" title="复制回答">
              <el-icon><CopyDocument /></el-icon>
            </button>
          </div>
        </div>

        <div v-if="messages.length <= 1" class="ai-suggestions">
          <button
            v-for="(s, i) in suggestions"
            :key="i"
            class="chip"
            @click="send(s)"
          >{{ s }}</button>
        </div>

        <footer class="ai-foot">
          <textarea
            v-model="draft"
            class="ai-input"
            rows="1"
            placeholder="问我任何算法问题...（Enter 发送）"
            @keydown.enter.exact.prevent="send()"
            ref="inputRef"
          ></textarea>
          <button class="send-btn" :disabled="streaming || !draft.trim()" @click="send()">
            <el-icon v-if="!streaming"><Promotion /></el-icon>
            <span v-else class="spin"></span>
          </button>
        </footer>
      </div>
    </transition>

    <el-dialog v-model="showSettings" title="AI 模型设置" width="440px" align-center>
      <div class="settings-form">
        <p class="settings-hint">
          支持任意 <b>OpenAI 兼容接口</b>。留空 API Key 时使用内置离线知识库。
          密钥仅保存在本地浏览器，不会上传到项目服务器。
        </p>
        <label>API Key</label>
        <el-input v-model="form.apiKey" type="password" show-password placeholder="sk-..." />
        <label>接口地址（Base URL）</label>
        <el-input v-model="form.baseUrl" placeholder="https://api.openai.com/v1" />
        <label>模型名称</label>
        <el-input v-model="form.model" placeholder="gpt-4o-mini" />
      </div>
      <template #footer>
        <el-button @click="showSettings = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ChatDotRound, Close, CopyDocument, Delete, Promotion, Setting } from '@element-plus/icons-vue'
import { useSettingsStore } from '../stores/settings'
import { localAnswer, ROUTE_TOPIC_MAP, streamChat, type ChatMessage } from '../ai/aiService'
import { renderMarkdown } from '../ai/markdown'
import { readChatHistory, writeChatHistory } from '../utils/storage'

const settings = useSettingsStore()
const route = useRoute()

const open = ref(false)
const showSettings = ref(false)
const draft = ref('')
const streaming = ref(false)
const messages = ref<ChatMessage[]>([])
const bodyRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
let abort: AbortController | null = null

const form = reactive({ apiKey: '', baseUrl: '', model: '' })

const greeting: ChatMessage = {
  role: 'assistant',
  content: '你好，我是 **AlgoVista 算法助手**。\n\n可以问我算法原理、复杂度、稳定性、执行步骤，或者当前可视化页面的使用方法。下面这些问题可以直接点：'
}

// Restore chat history
onMounted(() => {
  const history = readChatHistory()
  if (history.items.length > 0) {
    messages.value = history.items
  }
})

const currentCtx = computed(() => {
  const type = (route.params.type as string) || ''
  if (type && ROUTE_TOPIC_MAP[type]) return ROUTE_TOPIC_MAP[type]
  const name = route.name as string
  if (name && ROUTE_TOPIC_MAP[name]) return ROUTE_TOPIC_MAP[name]
  return undefined
})
const contextName = computed(() => currentCtx.value?.name)

const suggestions = computed(() => {
  const ctx = currentCtx.value
  if (ctx && ctx.topic !== 'general') {
    return [
      `${ctx.name}的核心思想是什么？`,
      `${ctx.name}的时间复杂度是多少？`,
      '它和其他算法相比有什么优劣？',
    ]
  }
  return [
    '什么是时间复杂度？',
    '快速排序为什么不稳定？',
    '贪心算法适合什么问题？',
    '怎么导出执行日志？',
  ]
})

function toggle() {
  open.value = !open.value
  if (open.value) {
    if (!messages.value.length) messages.value.push(greeting)
    nextTick(() => { inputRef.value?.focus(); scrollBottom() })
  }
}

function openPanel() {
  if (!open.value) toggle()
}

defineExpose({ open: openPanel })

function clearChat() {
  if (streaming.value) return
  messages.value = [greeting]
  writeChatHistory(messages.value)
}

function scrollBottom() {
  nextTick(() => {
    const el = bodyRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch(() => messages.value.map(m => m.content).join('|'), scrollBottom)

async function send(preset?: string) {
  const text = (preset ?? draft.value).trim()
  if (!text || streaming.value) return
  draft.value = ''
  messages.value.push({ role: 'user', content: text })
  streaming.value = true

  const assistantMsg = reactive<ChatMessage>({ role: 'assistant', content: '' })
  messages.value.push(assistantMsg)

  const history = messages.value
    .filter(m => m !== assistantMsg && m !== greeting)
    .slice(-8)

  if (settings.hasApi) {
    abort = new AbortController()
    try {
      await streamChat(
        { apiKey: settings.apiKey, baseUrl: settings.baseUrl, model: settings.model },
        history,
        contextName.value,
        (delta) => { assistantMsg.content += delta },
        abort.signal
      )
      if (!assistantMsg.content) assistantMsg.content = '（模型没有返回内容）'
    } catch (e: unknown) {
      const fallback = localAnswer(text, currentCtx.value?.topic)
      const message = e instanceof Error ? e.message : '网络错误'
      assistantMsg.content =
        `在线模型调用失败（${message}），已切换到离线知识库：\n\n${fallback}`
    } finally {
      abort = null
    }
  } else {
    const answer = localAnswer(text, currentCtx.value?.topic)
    await typeOut(answer, (t) => { assistantMsg.content = t })
  }

  streaming.value = false
  // Persist chat history (skip greeting)
  const toSave = messages.value.filter(m => m !== greeting || messages.value[0] === greeting)
  writeChatHistory(toSave)
}

function copyMessage(content: string) {
  const nav = globalThis.navigator
  if (nav && nav.clipboard) {
    nav.clipboard.writeText(content).then(() => {
      ElMessage.success('已复制到剪贴板')
    }).catch(() => {
      ElMessage.warning('复制失败')
    })
  } else {
    ElMessage.warning('当前浏览器不支持剪贴板操作')
  }
}

function typeOut(full: string, set: (t: string) => void): Promise<void> {
  return new Promise((resolve) => {
    let i = 0
    const step = Math.max(2, Math.floor(full.length / 60))
    const timer = window.setInterval(() => {
      i += step
      set(full.slice(0, i))
      scrollBottom()
      if (i >= full.length) {
        set(full)
        window.clearInterval(timer)
        resolve()
      }
    }, 16)
  })
}

function saveSettings() {
  settings.save({ apiKey: form.apiKey, baseUrl: form.baseUrl, model: form.model })
  showSettings.value = false
  ElMessage.success(settings.hasApi ? '已启用在线模型' : '已保存，当前为离线模式')
}

watch(showSettings, (v) => {
  if (v) {
    form.apiKey = settings.apiKey
    form.baseUrl = settings.baseUrl
    form.model = settings.model
  }
})

function render(md: string): string {
  return renderMarkdown(md)
}
</script>

<style scoped>
.ai-root { position: fixed; z-index: 2000; }

/* 鈥斺€?鎮诞鎸夐挳 鈥斺€?*/
.ai-fab {
  position: fixed;
  right: 26px;
  bottom: 26px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: var(--brand-gradient);
  box-shadow: 0 10px 30px rgba(99,102,241,0.45);
  display: grid;
  place-items: center;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.ai-fab:hover { transform: translateY(-3px) scale(1.06); box-shadow: 0 16px 40px rgba(99,102,241,0.6); }
.fab-icon {
  color: #ffffff;
  font-size: 28px;
}
.fab-pulse {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid var(--brand-2);
  animation: pulse 2.2s ease-out infinite;
}
@keyframes pulse {
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0; }
}

/* 鈥斺€?闈㈡澘 鈥斺€?*/
.ai-panel {
  position: fixed;
  right: 26px;
  bottom: 26px;
  width: 390px;
  max-width: calc(100vw - 36px);
  height: 600px;
  max-height: calc(100vh - 52px);
  background: rgba(22, 27, 50, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--brand-gradient-soft);
  border-bottom: 1px solid var(--border-soft);
}
.ai-head-title { display: flex; align-items: center; gap: 10px; }
.ai-avatar {
  width: 38px; height: 38px; border-radius: 11px;
  background: var(--brand-gradient);
  display: grid; place-items: center; font-size: 20px;
  box-shadow: var(--glow);
}
.ai-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.ai-status { font-size: 11px; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; margin-top: 2px; }
.ai-status .dot { width: 7px; height: 7px; border-radius: 50%; }
.ai-status .dot.on { background: var(--success); box-shadow: 0 0 8px var(--success); }
.ai-status .dot.local { background: var(--warning); box-shadow: 0 0 8px var(--warning); }
.ai-head-actions { display: flex; gap: 4px; }
.icon-btn {
  width: 30px; height: 30px; border-radius: 8px;
  border: none; background: transparent; cursor: pointer;
  color: var(--text-secondary); font-size: 14px;
  display: grid; place-items: center;
  transition: background 0.2s ease, color 0.2s ease;
}
.icon-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }

/* 鈥斺€?娑堟伅鍖?鈥斺€?*/
.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.msg { display: flex; }
.msg.user { justify-content: flex-end; }
.bubble {
  max-width: 84%;
  padding: 11px 14px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.65;
  word-break: break-word;
}
.msg.assistant .bubble {
  background: var(--bg-surface-2);
  border: 1px solid var(--border-soft);
  border-top-left-radius: 4px;
  color: var(--text-primary);
}
.msg.user .bubble {
  background: var(--brand-gradient);
  color: #fff;
  border-top-right-radius: 4px;
}
.bubble :deep(h3) { font-size: 15px; margin: 6px 0; color: var(--accent); }
.bubble :deep(h4) { font-size: 13.5px; margin: 5px 0; color: var(--accent); }
.bubble :deep(ul) { margin: 6px 0; padding-left: 18px; }
.bubble :deep(li) { margin: 3px 0; }
.bubble :deep(code.inline) {
  background: rgba(34,211,238,0.14); color: #a5f3fc;
  padding: 1px 6px; border-radius: 5px; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 12px;
}
.bubble :deep(.code-block) {
  background: #0c0f20; border: 1px solid var(--border-soft);
  border-radius: 9px; padding: 10px 12px; margin: 8px 0; overflow-x: auto;
}
.bubble :deep(.code-block code) { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 12px; color: #c7d2fe; }
.bubble :deep(blockquote) {
  border-left: 3px solid var(--warning); padding: 4px 10px; margin: 8px 0;
  background: rgba(251,191,36,0.08); border-radius: 0 8px 8px 0; color: var(--text-secondary); font-size: 12.5px;
}
.bubble :deep(strong) { color: inherit; }
.msg.assistant .bubble :deep(strong) { color: #c7d2fe; }

.spin {
  width: 16px;
  height: 16px;
  display: inline-block;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

/* 鈥斺€?寤鸿 鈥斺€?*/
.ai-suggestions {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 0 16px 12px;
}
.chip {
  font-size: 12px; padding: 7px 12px; border-radius: 999px;
  background: var(--bg-surface-2); border: 1px solid var(--border-soft);
  color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease;
}
.chip:hover { border-color: var(--brand-1); color: #c7d2fe; background: var(--brand-gradient-soft); }

/* 鈥斺€?杈撳叆 鈥斺€?*/
.ai-foot {
  display: flex; align-items: flex-end; gap: 10px;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--border-soft);
}
.ai-input {
  flex: 1; resize: none; max-height: 110px;
  background: var(--bg-surface-2); border: 1px solid var(--border-soft);
  border-radius: 12px; padding: 10px 12px; color: var(--text-primary);
  font-family: inherit; font-size: 13.5px; line-height: 1.5; outline: none;
  transition: border-color 0.2s ease;
}
.ai-input:focus { border-color: var(--brand-1); }
.send-btn {
  width: 40px; height: 40px; border-radius: 11px; border: none; cursor: pointer;
  background: var(--brand-gradient); color: #fff; font-size: 16px; flex-shrink: 0;
  display: grid; place-items: center;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.send-btn:hover:not(:disabled) { transform: scale(1.06); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.copy-btn {
  opacity: 0;
  width: 28px; height: 28px; border-radius: 6px;
  border: none; background: rgba(255,255,255,0.06); cursor: pointer;
  color: var(--text-muted); font-size: 13px; flex-shrink: 0;
  display: grid; place-items: center;
  transition: opacity 0.2s ease, background 0.2s ease;
  margin-top: 4px;
}
.msg.assistant:hover .copy-btn,
.copy-btn:hover { opacity: 1; }
.copy-btn:hover { background: rgba(255,255,255,0.12); color: var(--text-primary); }

@keyframes spin { to { transform: rotate(360deg); } }

/* 鈥斺€?璁剧疆琛ㄥ崟 鈥斺€?*/
.settings-form label { display: block; font-size: 12px; color: var(--text-secondary); margin: 12px 0 5px; }
.settings-hint { font-size: 12.5px; color: var(--text-muted); line-height: 1.6; margin-bottom: 6px; }

/* 鈥斺€?杩囨浮 鈥斺€?*/
.fab-enter-active, .fab-leave-active { transition: all 0.3s ease; }
.fab-enter-from, .fab-leave-to { transform: scale(0); opacity: 0; }
.panel-enter-active, .panel-leave-active { transition: all 0.3s cubic-bezier(0.22,1,0.36,1); transform-origin: bottom right; }
.panel-enter-from, .panel-leave-to { transform: scale(0.85) translateY(20px); opacity: 0; }
</style>
