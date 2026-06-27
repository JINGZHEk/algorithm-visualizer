/**
 * 算法 Worker 客户端 —— Promise 包装 + 同步降级
 *
 * ## 架构角色
 * 本模块是主线程与 Web Worker 之间的**门面（Facade）**，
 * 将 Worker 的 `postMessage` / `onmessage` 异步模型封装为 Promise API，
 * 并在 Worker 不可用时自动降级为同步执行。
 *
 * ## 核心设计模式
 *
 * ### 1. Lazy Singleton + Lazy Initialization
 * Worker 实例是模块级的惰性单例：首次调用 `generateAlgorithmStepsInWorker`
 * 时按需创建，后续调用复用同一个 Worker。
 *
 * ### 2. Promise Bridge / Request-Reply 模式
 * 每个请求携带一个唯一 `id`（`algorithm-timestamp-random`），
 * 客户端将 `{ resolve, reject }` 存入 `pendingJobs` Map。
 * Worker 响应携带相同的 `id`，客户端据此路由到对应的 Promise。
 *
 * ```
 * Main Thread                          Worker Thread
 * ──────────                          ─────────────
 * generateAlgorithmStepsInWorker()
 *   ├─ id = "bubble-1719001234-abc"
 *   ├─ pendingJobs.set(id, {resolve, reject})
 *   ├─ worker.postMessage({id, ...})
 *   │                                        onmessage
 *   │                                          ├─ generateSteps()
 *   │                                          └─ postMessage({id, ok: true, steps})
 *   ├─ onmessage → pendingJobs.get(id)
 *   └─ resolve(steps)
 * ```
 *
 * ### 3. Graceful Degradation（优雅降级）
 * 当浏览器不支持 Web Worker（`typeof Worker === 'undefined'`）时，
 * `createWorker()` 返回 null，客户端自动切换到同步生成路径。
 *
 * ## 错误处理
 * - 单请求错误：Worker 返回 `ok: false` → 对应 Promise reject
 * - Worker 全局错误（`onerror`）：所有 pending Promise 全部 reject，
 *   防止死等待。此后 Worker 实例置 null，下次请求会重新创建。
 * - 同步降级路径：异常直接抛出到调用方
 */

import {
  generateBubbleSortSteps,
  generateQuickSortSteps,
} from '../algorithms/sorting'
import { generateDijkstraSteps, type DijkstraGraph } from '../algorithms/dijkstra'
import { generateHuffmanSteps } from '../algorithms/huffman'
import { generateMazeSteps, type MazeGrid } from '../algorithms/maze'
import type {
  AlgorithmExecutionRequest,
  AlgorithmExecutionResponse,
  AlgorithmStep,
  AlgorithmType,
} from '../types'

/**
 * 待处理任务 —— Promise Bridge 模式
 *
 * 保存一个异步请求的 resolve/reject 回调，
 * Worker 响应到达时根据 id 查找并调用对应的回调。
 */
interface PendingJob {
  resolve: (steps: AlgorithmStep[]) => void
  reject: (error: Error) => void
}

/** 客户端内部的 Dijkstra 输入形状（与 Worker 端一致） */
interface DijkstraClientInput {
  graph: DijkstraGraph
  source: number
}

/** 客户端内部的哈夫曼输入项形状 */
interface HuffmanClientInput {
  char: string
  freq: number
}

/** 模块级 Worker 单例引用，惰性创建 */
let worker: Worker | null = null

/** 待处理请求映射表：id → Promise 控制函数 */
const pendingJobs = new Map<string, PendingJob>()

/**
 * 惰性创建 Worker（Lazy Singleton）
 *
 * 设计要点：
 * - 仅在首次调用时创建，避免不必要的线程开销
 * - 浏览器不支持 Worker 时返回 null，触发同步降级
 * - Worker 全局错误时拒绝所有 pending 请求并清理状态，
 *   但不提前终止 Worker（留给调用方 `terminateAlgorithmWorker()` 处理）
 *
 * @returns Worker 实例，或 null（表示降级到同步执行）
 */
function createWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (worker) return worker

  // 使用 Vite 的 new URL + import.meta.url 语法创建 module worker
  worker = new Worker(new URL('../workers/algorithmWorker.ts', import.meta.url), { type: 'module' })

  /**
   * Worker 消息处理器 —— 路由响应到对应的 Promise
   *
   * 通过 response.id 在 pendingJobs 中查找匹配的 Promise，
   * 找到后根据 ok 字段决定 resolve 或 reject，随后清除该 job。
   * 找不到对应 job 时静默忽略（可能已被超时或外部取消清理）。
   */
  worker.onmessage = (event: MessageEvent<AlgorithmExecutionResponse>) => {
    const response = event.data
    const job = pendingJobs.get(response.id)
    if (!job) return
    pendingJobs.delete(response.id)

    if (response.ok) {
      job.resolve(response.steps)
    } else {
      job.reject(new Error(response.message))
    }
  }

  /**
   * Worker 全局错误处理 —— 防死等待
   *
   * Worker 级别的 onerror 在 Worker 内部未捕获的异常发生时触发。
   * 此时所有 pending 请求都永远得不到响应，因此全部 reject 并清空队列。
   * 这确保 UI 不会永久卡在 loading 状态。
   */
  worker.onerror = (event) => {
    const error = new Error(event.message || '算法 Worker 执行失败')
    pendingJobs.forEach((job) => job.reject(error))
    pendingJobs.clear()
  }

  return worker
}

/**
 * 同步生成步骤 —— Worker 不可用时的降级路径
 *
 * 直接在主线程调用算法生成函数。对于小型输入（如 20 元素排序），
 * 同步执行的时间 < 50ms，对 UI 帧率影响可忽略。
 *
 * @param algorithm - 算法标识
 * @param input     - 算法输入数据
 * @returns 算法步骤数组
 */
function generateSynchronously(algorithm: AlgorithmType, input: unknown): AlgorithmStep[] {
  // 同步路径与 Worker 内部的 generateSteps 保持相同的分发逻辑
  switch (algorithm) {
    case 'bubble':
      return generateBubbleSortSteps(input as number[])
    case 'quick':
      return generateQuickSortSteps(input as number[])
    case 'dijkstra': {
      const payload = input as DijkstraClientInput
      return generateDijkstraSteps(payload.graph, payload.source)
    }
    case 'huffman':
      return generateHuffmanSteps(input as HuffmanClientInput[])
    case 'maze':
      return generateMazeSteps(input as MazeGrid)
  }
}

/**
 * 在 Worker 中执行算法步骤生成（带自动降级）
 *
 * 这是使用者（store / UI）调用的唯一入口函数。
 *
 * 执行流程：
 * 1. 尝试创建/获取 Worker
 * 2. 若 Worker 不可用 → 同步执行并返回已 resolve 的 Promise
 * 3. 若 Worker 可用 → 生成唯一 id，构造请求，发往 Worker，
 *    返回 Promise 等待 Worker 响应
 *
 * @typeParam TInput - 算法输入类型
 * @param algorithm - 算法标识（'bubble' | 'quick' | 'dijkstra' | 'huffman' | 'maze'）
 * @param input     - 算法输入数据
 * @returns Promise，resolve 为步骤数组，reject 为错误
 */
export function generateAlgorithmStepsInWorker<TInput>(
  algorithm: AlgorithmType,
  input: TInput,
): Promise<AlgorithmStep[]> {
  const activeWorker = createWorker()

  // 降级路径：Worker 不可用，同步执行
  if (!activeWorker) return Promise.resolve(generateSynchronously(algorithm, input))

  // 生成唯一请求 ID：算法类型 + 时间戳 + 随机短串
  const id = `${algorithm}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const request: AlgorithmExecutionRequest<TInput> = { id, algorithm, input }

  // Promise Bridge：将 resolve/reject 注册到 pendingJobs，等待 Worker 响应
  return new Promise((resolve, reject) => {
    pendingJobs.set(id, { resolve, reject })
    activeWorker.postMessage(request)
  })
}

/**
 * 销毁 Worker 并清理所有待处理请求
 *
 * 调用时机：页面卸载 / 路由切换 / 用户主动停止等场景。
 * 终止后 Worker 引用置 null，下次调用会重新创建。
 */
export function terminateAlgorithmWorker(): void {
  worker?.terminate()
  worker = null
  pendingJobs.clear()
}
