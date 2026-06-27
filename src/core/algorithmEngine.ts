/**
 * 算法引擎核心模块 —— Strategy Pattern 实现
 *
 * ## 架构角色
 * 本模块是算法可视化平台的**核心执行层**，负责算法的注册、验证和步骤生成。
 * 它不依赖任何 UI 框架，纯逻辑、可测试，被 Pinia store 和 Web Worker 共同消费。
 *
 * ## 设计模式
 * - **Strategy（策略模式）**: `AlgorithmStrategy` 接口定义统一契约，
 *   `BaseAlgorithmStrategy` 提供模板方法，5 个具体策略类各自封装一种算法。
 *   调用方（store / worker）通过接口编程，无需知道具体算法实现。
 * - **Registry（注册表模式）**: `AlgorithmRegistry` 是类型安全的服务定位器，
 *   配合工厂函数 `createDefaultAlgorithmRegistry()` 完成依赖组装。
 *
 * ## 类型参数说明
 * - `TInput`:  算法生成步骤所需的输入数据类型（如 number[]、DijkstraInput）
 * - `TData`:   每一步快照的数据类型（默认 unknown，通常与输入同构）
 * - `TResult`: 从步骤列表中提取的最终结果类型（默认 unknown）
 */

import type {
  AlgorithmInfo,
  AlgorithmStep,
  AlgorithmType,
  ValidationResult,
} from '../types'
import {
  bubbleSortInfo,
  generateBubbleSortSteps,
  generateQuickSortSteps,
  quickSortInfo,
} from '../algorithms/sorting'
import {
  dijkstraInfo,
  generateDijkstraSteps,
  type DijkstraGraph,
} from '../algorithms/dijkstra'
import {
  generateHuffmanSteps,
  huffmanInfo,
} from '../algorithms/huffman'
import {
  generateMazeSteps,
  mazeInfo,
  type MazeGrid,
} from '../algorithms/maze'

/**
 * 算法策略接口 —— Strategy 模式的抽象契约
 *
 * 每种算法必须实现：
 * 1. `validate` — 输入校验，返回带类型的成功/失败结果
 * 2. `generate` — 生成可视化步骤数组
 * 3. `getResult` — 从最终步骤中提取结果
 *
 * @typeParam TInput  - 算法输入类型
 * @typeParam TData   - 每一步快照的数据类型
 * @typeParam TResult - 最终结果类型
 */
export interface AlgorithmStrategy<TInput, TData = unknown, TResult = unknown> {
  /** 算法唯一标识，如 'bubble' | 'quick' | 'dijkstra' */
  readonly id: AlgorithmType
  /** 算法元信息（名称/复杂度/描述等） */
  readonly info: AlgorithmInfo
  /**
   * 校验原始输入，失败时返回可读的错误消息
   * @param input - 未经过滤的原始输入（来自用户或 API）
   */
  validate(input: unknown): ValidationResult<TInput>
  /**
   * 执行算法并生成动画步骤序列
   * @param input - 已通过 validate 校验的合法输入
   */
  generate(input: TInput): AlgorithmStep<TData>[]
  /**
   * 从步骤数组中提取最终结果
   * @param steps - 算法生成的完整步骤数组
   */
  getResult(steps: readonly AlgorithmStep<TData>[]): TResult
}

/**
 * 算法策略抽象基类 —— Template Method 模式
 *
 * 提供通用的 `getResult`（取最后一步的 data）和两个受保护的工厂方法
 * `success` / `failure`，减少具体策略类的样板代码。
 *
 * @typeParam TInput  - 算法输入类型
 * @typeParam TData   - 每一步快照的数据类型
 * @typeParam TResult - 最终结果类型
 */
export abstract class BaseAlgorithmStrategy<TInput, TData = unknown, TResult = unknown>
  implements AlgorithmStrategy<TInput, TData, TResult>
{
  abstract readonly id: AlgorithmType
  abstract readonly info: AlgorithmInfo

  abstract validate(input: unknown): ValidationResult<TInput>
  abstract generate(input: TInput): AlgorithmStep<TData>[]

  /**
   * 默认实现：取最后一步的 data 作为结果
   * 子类可按需重写（例如返回多值结果时）
   */
  getResult(steps: readonly AlgorithmStep<TData>[]): TResult {
    return steps.at(-1)?.data as TResult
  }

  /** 工厂方法：构造校验成功结果 */
  protected success(input: TInput): ValidationResult<TInput> {
    return { ok: true, data: input }
  }

  /** 工厂方法：构造校验失败结果 */
  protected failure(message: string): ValidationResult<TInput> {
    return { ok: false, message }
  }
}

// ---------------------------------------------------------------------------
// 共享校验辅助函数
// ---------------------------------------------------------------------------

/**
 * 类型守卫：检查一个值是否为合法的 number[]
 * 排除 NaN 和 Infinity，因为它们在排序和可视化中无意义
 */
function isNumberArray(input: unknown): input is number[] {
  return Array.isArray(input) && input.every((item) => typeof item === 'number' && Number.isFinite(item))
}

/**
 * 排序算法通用输入校验：
 * - 必须是 number[]
 * - 长度 2~20（超过 20 个元素可视化会拥挤）
 * - 元素范围 -999~999（防止极端值影响布局）
 */
function validateSortingInput(input: unknown): ValidationResult<number[]> {
  if (!isNumberArray(input)) return { ok: false, message: '排序输入必须是数字数组' }
  if (input.length < 2 || input.length > 20) return { ok: false, message: '排序数组长度需在 2 到 20 之间' }
  if (input.some((item) => item < -999 || item > 999)) {
    return { ok: false, message: '排序元素范围需在 -999 到 999 之间' }
  }
  return { ok: true, data: input }
}

// ---------------------------------------------------------------------------
// 具体策略实现 —— 每种算法一个 Strategy 类
// ---------------------------------------------------------------------------

/**
 * 冒泡排序策略
 *
 * 经典稳定排序，O(n^2) 时间 / O(1) 空间。
 * 每轮将最大元素"冒泡"到数组末尾，适合教学比较和交换操作。
 */
export class BubbleSortStrategy extends BaseAlgorithmStrategy<number[], number[], number[]> {
  readonly id = 'bubble'
  readonly info = bubbleSortInfo as AlgorithmInfo

  validate(input: unknown): ValidationResult<number[]> {
    return validateSortingInput(input)
  }

  generate(input: number[]): AlgorithmStep<number[]>[] {
    return generateBubbleSortSteps(input) as AlgorithmStep<number[]>[]
  }
}

/**
 * 快速排序策略
 *
 * 不稳定原地排序，平均 O(n log n) / 最坏 O(n^2)。
 * 使用分治（Divide & Conquer）策略，通过 pivot 分区递归排序。
 */
export class QuickSortStrategy extends BaseAlgorithmStrategy<number[], number[], number[]> {
  readonly id = 'quick'
  readonly info = quickSortInfo as AlgorithmInfo

  validate(input: unknown): ValidationResult<number[]> {
    return validateSortingInput(input)
  }

  generate(input: number[]): AlgorithmStep<number[]>[] {
    return generateQuickSortSteps(input) as AlgorithmStep<number[]>[]
  }
}

/**
 * Dijkstra 最短路径算法输入
 * @property graph  - 图的邻接表/边列表表示
 * @property source - 源点编号
 */
export interface DijkstraInput {
  graph: DijkstraGraph
  source: number
}

/**
 * Dijkstra 最短路径策略
 *
 * 贪心算法，O((V+E)log V) 时间（使用优先队列）。
 * 每次选取未处理节点中距离最短的节点进行松弛（Relaxation）操作。
 */
export class DijkstraStrategy extends BaseAlgorithmStrategy<DijkstraInput> {
  readonly id = 'dijkstra'
  readonly info = dijkstraInfo as AlgorithmInfo

  validate(input: unknown): ValidationResult<DijkstraInput> {
    const candidate = input as Partial<DijkstraInput>
    if (!candidate.graph || !Array.isArray(candidate.graph.nodes) || !Array.isArray(candidate.graph.edges)) {
      return this.failure('Dijkstra 输入必须包含 graph.nodes 与 graph.edges')
    }
    if (typeof candidate.source !== 'number') return this.failure('Dijkstra 输入必须包含 source 源点')
    return this.success({ graph: candidate.graph, source: candidate.source })
  }

  generate(input: DijkstraInput): AlgorithmStep[] {
    return generateDijkstraSteps(input.graph, input.source)
  }
}

/**
 * 哈夫曼编码输入项
 * @property char - 字符（单字串）
 * @property freq - 出现频率（正数）
 */
export interface HuffmanInputItem {
  char: string
  freq: number
}

/**
 * 哈夫曼树构造策略
 *
 * 贪心算法，O(n log n) 时间。
 * 每次合并两个频率最小的节点构建二叉树，用于最优前缀编码。
 */
export class HuffmanStrategy extends BaseAlgorithmStrategy<HuffmanInputItem[]> {
  readonly id = 'huffman'
  readonly info = huffmanInfo as AlgorithmInfo

  validate(input: unknown): ValidationResult<HuffmanInputItem[]> {
    // 至少需要 2 个节点才能构建树
    if (!Array.isArray(input) || input.length < 2) return this.failure('哈夫曼输入至少需要 2 个字符频率')
    const valid = input.every((item) => {
      const candidate = item as Partial<HuffmanInputItem>
      return typeof candidate.char === 'string' && typeof candidate.freq === 'number' && candidate.freq > 0
    })
    if (!valid) return this.failure('哈夫曼输入格式应为 { char: string, freq: number }[]')
    return this.success(input as HuffmanInputItem[])
  }

  generate(input: HuffmanInputItem[]): AlgorithmStep[] {
    return generateHuffmanSteps(input)
  }
}

/**
 * 迷宫求解策略（DFS 回溯）
 *
 * 使用深度优先搜索（DFS）+ 回溯（Backtracking）在二维网格中寻找路径。
 * 时间复杂度 O(rows * cols)，可视化展示探索和回退过程。
 */
export class MazeDfsStrategy extends BaseAlgorithmStrategy<MazeGrid> {
  readonly id = 'maze'
  readonly info = mazeInfo as AlgorithmInfo

  validate(input: unknown): ValidationResult<MazeGrid> {
    if (!Array.isArray(input) || !Array.isArray(input[0])) return this.failure('迷宫输入必须是二维网格')
    return this.success(input as MazeGrid)
  }

  generate(input: MazeGrid): AlgorithmStep[] {
    return generateMazeSteps(input)
  }
}

// ---------------------------------------------------------------------------
// 算法注册表 —— Registry 模式
// ---------------------------------------------------------------------------

/**
 * 算法注册表 —— 服务定位器 / Registry 模式
 *
 * 维护一个 `Map<AlgorithmType, AlgorithmStrategy>` 的内部注册表。
 * 支持运行时动态注册/注销策略（便于插件式扩展新算法）。
 * 通过工厂函数 `createDefaultAlgorithmRegistry()` 完成初始装配。
 *
 * 设计要点：
 * - 使用泛型 `register<TInput>` / `get<TInput>` 保持类型安全
 * - `get` 在未找到时抛出异常，强制调用方处理缺失情况
 */
export class AlgorithmRegistry {
  private readonly strategies = new Map<AlgorithmType, AlgorithmStrategy<unknown>>()

  /**
   * 注册一个算法策略
   * @param strategy - 实现了 AlgorithmStrategy 接口的策略实例
   */
  register<TInput>(strategy: AlgorithmStrategy<TInput>): void {
    this.strategies.set(strategy.id, strategy as AlgorithmStrategy<unknown>)
  }

  /**
   * 根据算法标识获取策略实例
   * @param type - 算法标识，如 'bubble' | 'dijkstra'
   * @throws 当算法未注册时抛出 Error
   */
  get<TInput = unknown>(type: AlgorithmType): AlgorithmStrategy<TInput> {
    const strategy = this.strategies.get(type)
    if (!strategy) throw new Error(`未注册算法策略: ${type}`)
    return strategy as AlgorithmStrategy<TInput>
  }

  /** 返回所有已注册策略的列表（用于 UI 算法选择菜单等） */
  list(): AlgorithmStrategy<unknown>[] {
    return Array.from(this.strategies.values())
  }
}

/**
 * 工厂函数：创建预装全部 5 种算法的默认注册表
 *
 * 这是应用启动时的装配点 —— 新增算法只需在此注册一个 Strategy 实例即可
 */
export function createDefaultAlgorithmRegistry(): AlgorithmRegistry {
  const registry = new AlgorithmRegistry()
  registry.register(new BubbleSortStrategy())
  registry.register(new QuickSortStrategy())
  registry.register(new DijkstraStrategy())
  registry.register(new HuffmanStrategy())
  registry.register(new MazeDfsStrategy())
  return registry
}

/** 应用级单例：默认算法注册表，由 store 和 worker 共享 */
export const algorithmRegistry = createDefaultAlgorithmRegistry()
