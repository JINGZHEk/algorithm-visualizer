import type { AlgorithmType } from '../types'
import type { ChatMessage } from '../ai/aiService'

// ============================================================
// localStorage Schema（对齐设计文档 §3.3.1）
// Key 前缀统一为 algovista:
// ============================================================

const KEYS = {
  aiConfig: 'algovista:ai-config',
  uiPreferences: 'algovista:ui-preferences',
  chatHistory: 'algovista:chat-history',
  lastInputs: 'algovista:last-inputs',
  theme: 'algovista_theme',
  splashSeen: 'algovista_splash_seen',
} as const

export interface UiPreferences {
  speed: number
  theme: 'dark' | 'light' | 'contrast'
  showLabels: boolean
}

export interface ChatHistoryEntry {
  items: ChatMessage[]
  updatedAt: string
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* localStorage 满或私有模式下写入失败，静默处理 */
  }
}

// ---- AI 配置（现有 settings store 使用，此处提供备用读取） ----
export function readAiConfig() {
  return read<{ apiKey: string; baseUrl: string; model: string }>(KEYS.aiConfig, {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  })
}

// ---- 用户偏好 ----
export function readUiPreferences(): UiPreferences {
  return read<UiPreferences>(KEYS.uiPreferences, {
    speed: 500,
    theme: 'dark',
    showLabels: true,
  })
}

export function writeUiPreferences(prefs: Partial<UiPreferences>): void {
  const current = readUiPreferences()
  write(KEYS.uiPreferences, { ...current, ...prefs })
}

// ---- AI 对话历史 ----
export function readChatHistory(): ChatHistoryEntry {
  return read<ChatHistoryEntry>(KEYS.chatHistory, {
    items: [],
    updatedAt: new Date().toISOString(),
  })
}

export function writeChatHistory(items: ChatMessage[]): void {
  // 最多保存 50 条消息
  const trimmed = items.slice(-50)
  write<ChatHistoryEntry>(KEYS.chatHistory, {
    items: trimmed,
    updatedAt: new Date().toISOString(),
  })
}

// ---- 各算法最近输入 —— 验收标准关键项 ----
export function readLastInputs(): Partial<Record<AlgorithmType, string>> {
  return read<Partial<Record<AlgorithmType, string>>>(KEYS.lastInputs, {})
}

export function writeLastInput(algorithm: AlgorithmType, input: string): void {
  const current = readLastInputs()
  current[algorithm] = input
  write(KEYS.lastInputs, current)
}
