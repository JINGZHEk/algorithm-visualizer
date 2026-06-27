/**
 * 算法执行 Web Worker
 *
 * ## 架构角色
 * 本 Worker 将算法的步骤生成（可能耗时）从主线程迁移到独立线程，
 * 保证 UI 在算法执行期间保持 60fps 流畅响应。
 *
 * ## 通信协议
 * Worker 与主线程通过双向 `postMessage` 通信，消息格式为：
 *
 * **请求（Main → Worker）**: `AlgorithmExecutionRequest`
 * ```ts
 * { id: string, algorithm: AlgorithmType, input: unknown }
 * ```
 *
 * **响应（Worker → Main）**:
 * - 成功: `AlgorithmExecutionSuccess` — `{ id, ok: true, steps, duration }`
 * - 失败: `AlgorithmExecutionFailure` — `{ id, ok: false, message }`
 *
 * `id` 字段用于将响应路由回对应的 Promise（由 WorkerClient 管理）。
 *
 * ## 设计模式
 * - **Command / Dispatcher**: `onmessage` 接收请求，根据 `algorithm` 字段分发到对应的生成函数。
 * - **Facade 模式**: Worker 封装了 5 种算法的生成逻辑，对外表现为单一人机接口。
 *
 * ## 关键设计决策
 * - Worker 使用 ES Module 类型（通过 `{ type: 'module' }` 创建），
 *   因此可以直接 import TypeScript 源文件（Vite 在构建时处理）。
 * - `performance.now()` 用于精确计时，报告算法生成耗时。
 * - 错误被统一捕获并包装为失败响应，绝不抛出到主线程导致 Worker 崩溃。
 *
 * ## 安全性
 * - Worker 仅接受结构化可克隆数据，不访问 DOM / window。
 * - 未注册的算法类型会抛出错误并被 catch 兜底。
 */

import {
  generateBubbleSortSteps,
  generateQuickSortSteps,
} from '../algorithms/sorting'
import { generateDijkstraSteps, type DijkstraGraph } from '../algorithms/dijkstra'
import { generateHuffmanSteps } from '../algorithms/huffman'
import { generateMazeSteps, type MazeGrid } from '../algorithms/maze'
import type {
  AlgorithmExecutionFailure,
  AlgorithmExecutionRequest,
  AlgorithmExecutionSuccess,
  AlgorithmStep,
} from '../types'

/**
 * Worker 内部的 Dijkstra 输入形状
 * （与 client 端保持一致，确保 postMessage 可序列化）
 */
interface DijkstraWorkerInput {
  graph: DijkstraGraph
  source: number
}

/**
 * Worker 内部的哈夫曼输入项形状
 */
interface HuffmanWorkerInput {
  char: string
  freq: number
}

/**
 * 算法步骤分发器 —— Command / Dispatcher 模式
 *
 * 根据 `request.algorithm` 将请求路由到对应的生成函数。
 * 这是 Worker 的核心逻辑：单一入口，多种算法，相同的输入/输出契约。
 *
 * @param request - 来自主线程的执行请求
 * @returns 算法生成的步骤数组
 * @throws 当算法类型未注册时抛出 Error
 */
function generateSteps(request: AlgorithmExecutionRequest): AlgorithmStep[] {
  // 使用 switch 进行静态分发 —— 比动态注册表更简单，
  // 且 TypeScript 可以对每个 case 进行精确的类型收窄
  switch (request.algorithm) {
    case 'bubble':
      return generateBubbleSortSteps(request.input as number[])
    case 'quick':
      return generateQuickSortSteps(request.input as number[])
    case 'dijkstra': {
      const input = request.input as DijkstraWorkerInput
      return generateDijkstraSteps(input.graph, input.source)
    }
    case 'huffman':
      return generateHuffmanSteps(request.input as HuffmanWorkerInput[])
    case 'maze':
      return generateMazeSteps(request.input as MazeGrid)
    default:
      throw new Error(`Worker 不支持算法: ${request.algorithm}`)
  }
}

/**
 * Worker 入口：监听主线程消息
 *
 * 执行流程：
 * 1. 记录起始时间（performance.now()）
 * 2. 调用分发器生成步骤
 * 3. 构造成功/失败响应并通过 postMessage 发回
 * 4. 异常被统一捕获，保证 Worker 不因单次请求失败而终止
 */
self.onmessage = (event: MessageEvent<AlgorithmExecutionRequest>) => {
  const startedAt = performance.now()
  const request = event.data

  try {
    const steps = generateSteps(request)
    const response: AlgorithmExecutionSuccess = {
      id: request.id,
      ok: true,
      steps,
      // 精确到亚毫秒级，用于性能监控
      duration: performance.now() - startedAt,
    }
    self.postMessage(response)
  } catch (error: unknown) {
    // 兜底：将任何异常转换为标准失败响应
    const response: AlgorithmExecutionFailure = {
      id: request.id,
      ok: false,
      message: error instanceof Error ? error.message : '算法执行失败',
    }
    self.postMessage(response)
  }
}
