import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'algovista_ai_settings'

interface PersistedSettings {
  apiKey: string
  baseUrl: string
  model: string
}

function load(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }
}

/**
 * AI 助手配置：OpenAI 兼容接口（key / baseUrl / model）。
 * 未配置 apiKey 时，助手自动回退到本地知识库（混合模式）。
 */
export const useSettingsStore = defineStore('settings', () => {
  const persisted = load()
  const apiKey = ref(persisted.apiKey)
  const baseUrl = ref(persisted.baseUrl)
  const model = ref(persisted.model)

  const hasApi = computed(() => apiKey.value.trim().length > 0)

  function save(next: Partial<PersistedSettings>) {
    if (next.apiKey !== undefined) apiKey.value = next.apiKey.trim()
    if (next.baseUrl !== undefined) baseUrl.value = next.baseUrl.trim().replace(/\/$/, '')
    if (next.model !== undefined) model.value = next.model.trim()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      apiKey: apiKey.value, baseUrl: baseUrl.value, model: model.value
    }))
  }

  return { apiKey, baseUrl, model, hasApi, save }
})
