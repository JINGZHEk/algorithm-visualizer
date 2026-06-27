/**
 * AI 助手服务 —— 上下文感知路由 + 流式 LLM + 本地知识库降级
 *
 * ## 架构角色
 * 本模块是 AI 助手功能的**门面层**，作为 UI 组件与底层 AI 能力
 * （远程 LLM / 本地知识库）之间的中间层。它负责：
 * - 根据用户当前所在算法页面注入**上下文 Prompt**（context-aware routing）
 * - 调用流式聊天接口并传递 delta 回调
 * - 在未配置 LLM 时提供**本地知识库降级**
 *
 * ## 核心设计模式
 *
 * ### 1. Context-Aware Routing（上下文感知路由）
 * `ROUTE_TOPIC_MAP` 将算法标识映射到中文名称和知识库 topic。
 * `streamChat` 接收 `contextName` 后，将其注入 system prompt 的附录中，
 * 引导 LLM 优先围绕当前算法作答。
 *
 * ### 2. Strategy 模式（LLM vs Local）
 * `streamChat` 和 `localAnswer` 是两种回答策略：
 * - `streamChat`: 在线流式 LLM（需要 API key 配置）
 * - `localAnswer`: 离线知识库匹配（零依赖，永远可用）
 *
 * UI 层根据是否配置了 API key 来选择调用哪个策略。
 *
 * ### 3. Token Windowing（通过 delegation）
 * 调用 `createWindowedHistory` 确保消息历史不超过 token 预算，
 * 避免超出模型上下文窗口。详见 `streaming.ts`。
 *
 * ## 数据流
 * ```
 * UI 组件
 *   ├─ 有 API key → streamChat(config, history, context, onDelta)
 *   │                 ├─ 注入 context prompt
 *   │                 ├─ createWindowedHistory (token 窗口化)
 *   │                 └─ streamOpenAIChat (SSE 流式请求)
 *   │
 *   └─ 无 API key → localAnswer(query, topic)
 *                     └─ searchKnowledge (本地知识库)
 * ```
 */

import { searchKnowledge } from './knowledgeBase'
import { createWindowedHistory, streamOpenAIChat } from './streaming'

/** 聊天消息 —— OpenAI 兼容格式 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** AI 服务配置（用户通过设置面板填写） */
export interface AiConfig {
  apiKey: string
  baseUrl: string
  model: string
}

/**
 * 路由-主题映射表 —— Context-Aware Routing 的核心
 *
 * 将算法页面标识（route）映射到：
 * - `topic`: 知识库搜索的 topic 参数
 * - `name`:  注入 system prompt 的中文名称
 *
 * 当用户从一个算法页面发送消息时，系统自动携带该算法的上下文。
 */
export const ROUTE_TOPIC_MAP: Record<string, { topic: string; name: string }> = {
  bubble: { topic: 'bubble', name: '冒泡排序' },
  quick: { topic: 'quick', name: '快速排序' },
  dijkstra: { topic: 'dijkstra', name: 'Dijkstra 最短路径' },
  huffman: { topic: 'huffman', name: '哈夫曼树构造' },
  maze: { topic: 'maze', name: '迷宫求解（DFS 回溯）' },
  compare: { topic: 'general', name: '排序算法对比' },
}

/**
 * 系统提示词 —— 定义 AI 助手的行为、语调和知识范围
 *
 * 每次对话都会作为 `system` 消息发送，
 * 确保 LLM 始终以算法教学助手的角色回答。
 */
const SYSTEM_PROMPT = `你是 AlgoVista 算法可视化平台内置的算法学习助手。

回答规则：
- 始终使用简体中文，语气友好、专业、循序渐进。
- 优先围绕数据结构与算法教学回答，包括排序、图、树、回溯、复杂度分析和平台可视化步骤。
- 如果用户正在查看某个算法页面，先结合该算法解释，再补充通用概念。
- 涉及复杂度时给出时间复杂度、空间复杂度，并说明最好/平均/最坏情况的差异。
- 代码片段使用 Markdown 代码块；伪代码要短，便于学生照着可视化过程理解。
- 不要编造平台不存在的按钮或功能；不确定时说明可以从当前页面的控件或步骤日志观察。
- 回答保持简洁，优先给出清晰结构和关键结论。`

/**
 * 流式聊天 —— 在线 LLM 策略
 *
 * 执行流程：
 * 1. 构造 system prompt（基础 prompt + 可选的上下文 prompt）
 * 2. 调用 `createWindowedHistory` 进行 token 预算管理
 * 3. 委托 `streamOpenAIChat` 发送 SSE 请求，沿途调用 `onDelta` 回调
 *
 * @param config      - AI 服务配置（apiKey / baseUrl / model）
 * @param history     - 对话历史（不含 system 消息，由本函数注入）
 * @param contextName - 当前算法页面名称（如"冒泡排序"），undefined 表示无上下文
 * @param onDelta     - 每个增量文本的回调（由 UI 层更新消息显示）
 * @param signal      - 可选 AbortSignal，用于用户取消请求
 */
export async function streamChat(
  config: AiConfig,
  history: ChatMessage[],
  contextName: string | undefined,
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  // 构造上下文感知的 system prompt：
  // 如果有上下文，在基础 prompt 后追加一行引导
  const contextPrompt = contextName
    ? `\n\n当前用户正在查看「${contextName}」的可视化页面，请优先结合这个算法和可视化执行过程作答。`
    : ''

  // Token 窗口化处理：确保总 token 数不超过 2800（留给模型回复空间）
  const messages: ChatMessage[] = createWindowedHistory([
    { role: 'system', content: SYSTEM_PROMPT + contextPrompt },
    ...history,
  ], 2800)

  // 委托底层流式引擎发送请求
  // timeoutMs=25s 为单次请求的超时时间
  // flushIntervalMs=18ms 约等于 55fps 的文本刷新率
  await streamOpenAIChat(config, messages, onDelta, {
    signal,
    timeoutMs: 25_000,
    flushIntervalMs: 18,
  })
}

/**
 * 本地知识库回答 —— 离线降级策略
 *
 * 在用户未配置 LLM API key 时使用。
 * 通过 `searchKnowledge` 在预置知识库中匹配问题。
 *
 * 设计要点：
 * - `contextTopic` 用于缩小搜索范围（仅搜索当前算法相关条目）
 * - 未命中时返回引导性提示，帮助用户提出有效问题
 *
 * @param query        - 用户输入的问题文本
 * @param contextTopic - 当前算法 topic（用于知识库子集搜索），可选
 * @returns 知识库匹配结果或引导提示
 */
export function localAnswer(query: string, contextTopic?: string): string {
  const hit = searchKnowledge(query, contextTopic)
  if (hit) {
    // 匹配成功：返回知识库条目 + 提示配置 LLM 可获得更好体验
    return `${hit}\n\n> 当前为离线知识库模式。配置大模型 API 后，可以获得更灵活的问答能力。`
  }

  // 未匹配：给用户提供可尝试的问题方向
  return `我在离线知识库中没有找到直接匹配的内容。

你可以试着问这些方向：
- 某个算法的原理、复杂度或稳定性，比如"快速排序为什么不稳定？"
- 概念解释，比如时间复杂度、贪心算法、回溯。
- 平台用法，比如怎么对比算法、怎么看执行步骤。

> 想要更自由的对话，可以点击助手右上角的设置按钮配置 OpenAI 兼容接口。`
}
