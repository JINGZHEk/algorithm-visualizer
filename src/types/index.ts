export type AlgorithmType = 'bubble' | 'quick' | 'dijkstra' | 'huffman' | 'maze'

export type RendererBackend = 'canvas' | 'd3'

export type JsonPrimitive = string | number | boolean | null

export type SerializableValue =
  | JsonPrimitive
  | SerializableValue[]
  | { [key: string]: SerializableValue }

export interface AlgorithmStep<TData = unknown> {
  description: string
  highlightLine: number
  data: TData
  highlights?: number[]
  comparing?: number[]
  swapping?: number[]
  sorted?: number[]
  extra?: Record<string, unknown>
}

export interface AlgorithmInfo {
  id: AlgorithmType
  name: string
  category: string
  difficulty: string
  timeComplexity: string
  spaceComplexity: string
  description: string
  pseudocode: string[]
}

export interface TestCase<TInput = unknown> {
  name: string
  input: TInput
  description: string
}

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'finished'

// 迷宫格子语义类型（设计文档 §3.6.3）
export type MazeCellType = 'road' | 'wall' | 'current' | 'visited' | 'path' | 'backtracked'

// 图节点访问状态（设计文档 §3.6.3）
export type NodeStatus = 'unvisited' | 'current' | 'confirmed' | 'checking' | 'updated'

export interface ExecutionLog {
  algorithmName: string
  input: string
  steps: { step: number; description: string; state: string }[]
  result: string
  timeComplexity: string
  spaceComplexity: string
  timestamp: string
}

export interface ValidationResult<T> {
  ok: boolean
  data?: T
  message?: string
}

export interface AlgorithmExecutionRequest<TInput = unknown> {
  id: string
  algorithm: AlgorithmType
  input: TInput
}

export interface AlgorithmExecutionSuccess<TData = unknown> {
  id: string
  ok: true
  steps: AlgorithmStep<TData>[]
  duration: number
}

export interface AlgorithmExecutionFailure {
  id: string
  ok: false
  message: string
}

export type AlgorithmExecutionResponse<TData = unknown> =
  | AlgorithmExecutionSuccess<TData>
  | AlgorithmExecutionFailure
