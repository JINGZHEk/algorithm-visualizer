/**
 * Dijkstra 最短路径算法模块 (Dijkstra's Shortest Path Module)
 *
 * 本模块实现 Dijkstra 单源最短路径算法的步骤生成器，用于算法可视化。
 *
 * **核心思想：**
 * Dijkstra 算法是一种贪心算法，用于计算加权图中从单一源点到所有其他顶点的
 * 最短路径。算法维护两个关键数据结构：
 * - `dist[]` 数组：记录从源点到每个顶点的当前已知最短距离
 * - `visited[]` 数组：标记已确定最短距离的顶点（即已"收敛"的顶点）
 *
 * **算法流程：**
 * 1. 初始化：将源点距离设为 0，其余顶点距离设为 Infinity
 * 2. 每轮迭代中，从未访问顶点中选择 dist 值最小的顶点 u（贪心选择）
 * 3. 标记 u 为已访问——此时 dist[u] 即为源点到 u 的最终最短距离
 * 4. 对 u 的每个邻居 v 执行**松弛操作** (relaxation)：
 *    若 dist[u] + weight(u,v) < dist[v]，则更新 dist[v] = dist[u] + weight(u,v)
 *    并记录 prev[v] = u（用于最终回溯路径）
 * 5. 重复步骤 2-4 直到所有可达顶点均已访问
 *
 * **复杂度：**
 * - 时间复杂度：
 *   - 本实现使用朴素 O(V^2) 选取最小距离顶点的方式（线性扫描 visited[] + dist[]）
 *   - 使用优先队列（二叉堆）可优化为 O((V+E) log V)
 * - 空间复杂度：O(V)，存储 dist, visited, prev 三个数组
 *
 * **适用条件：**
 * - 图中所有边的权重必须非负（贪心策略依赖此性质保证正确性）
 * - 若存在负权边，需使用 Bellman-Ford 或 SPFA 算法
 *
 * **关键设计决策：**
 * - 图使用邻接边列表表示（而非邻接矩阵），每条边包含 from, to, weight
 * - 边被视为无向的：代码在查找邻居时检查 edge.from === u 或 edge.to === u
 * - 每一步生成 AlgorithmStep 快照，包含当前 dist/visited/prev 状态及图中节点坐标，
 *   前端可用这些数据渲染动画
 *
 * 使用方式：
 * - 调用 generateDijkstraSteps(graph, source) 传入图结构和源点索引，
 *   返回 AlgorithmStep[] 供前端逐步播放
 * - dijkstraTestCases 提供预置测试图（普通连通图、非连通图、等权多路径图）
 */

import type { AlgorithmStep } from '../types'

/**
 * 图中一条加权边
 *
 * @param from - 边的一个端点索引（对应 graph.nodes 中的节点 id）
 * @param to - 边的另一个端点索引
 * @param weight - 边的权重（必须为非负数）
 */
interface GraphEdge {
  from: number
  to: number
  weight: number
}

/**
 * 图中的一个顶点（节点）
 *
 * @param id - 节点唯一标识符
 * @param label - 节点显示标签（如 'A', 'B' 等）
 * @param x - 节点在画布上的 x 坐标（用于可视化渲染）
 * @param y - 节点在画布上的 y 坐标（用于可视化渲染）
 */
interface GraphNode {
  id: number
  label: string
  x: number
  y: number
}

/**
 * Dijkstra 算法使用的图结构
 *
 * 包含顶点集合（含坐标信息）和边集合（含权重信息）。
 * 边是无向的——算法在遍历时会检查 from 和 to 两个方向。
 */
export interface DijkstraGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/**
 * 生成 Dijkstra 最短路径算法的逐步可视化数据
 *
 * 从指定源点出发，逐步计算到图中所有其他顶点的最短距离。
 * 每一步记录当前 dist、visited、prev 状态以及正在操作的节点。
 *
 * **松弛操作 (Relaxation) 详解：**
 * 对于边 (u, v)，若通过 u 到达 v 的距离 (dist[u] + weight(u,v))
 * 比当前已知的 dist[v] 更短，则更新 dist[v] 并记录 prev[v] = u。
 * 这表示"通过 u 走这条路到 v 更近"。
 *
 * @param graph - 加权无向图，包含节点坐标和边信息
 * @param source - 源点在 graph.nodes 中的索引
 * @returns AlgorithmStep[] - 算法执行的步骤数组，每个步骤包含：
 *   - description: 当前操作的中文描述
 *   - data.dist: 当前各顶点最短距离（Infinity 表示不可达）
 *   - data.visited: 各顶点是否已确定最短距离
 *   - data.prev: 各顶点的前驱节点（用于路径回溯，-1 表示无前驱）
 *   - data.current: 当前正在处理的顶点
 *   - data.graph: 图结构引用
 */
export function generateDijkstraSteps(graph: DijkstraGraph, source: number): AlgorithmStep[] {
  const steps: AlgorithmStep[] = []
  const n = graph.nodes.length

  // dist[i] = 从源点到顶点 i 的当前已知最短距离
  // 初始化为 Infinity 表示"尚未发现路径"
  const dist: number[] = Array(n).fill(Infinity)

  // visited[i] = true 表示顶点 i 的最短距离已最终确定
  const visited: boolean[] = Array(n).fill(false)

  // prev[i] = 在最短路径树上顶点 i 的前驱节点索引
  // 用于算法结束后回溯完整路径；-1 表示无前驱
  const prev: number[] = Array(n).fill(-1)

  // 源点到自身的距离为 0——这是算法唯一已知的初始确定值
  dist[source] = 0

  // 记录初始状态
  steps.push({
    description: `初始化：设置源点 ${graph.nodes[source].label} 距离为 0，其余为 ∞`,
    highlightLine: 1,
    data: { dist: [...dist], visited: [...visited], prev: [...prev], current: -1, graph }
  })

  // 主循环：最多 n 轮，每轮确定一个顶点的最短距离
  for (let count = 0; count < n; count++) {

    // 贪心选择：从未访问顶点中找到 dist 最小的顶点 u
    // 这是 Dijkstra 算法的核心——局部最优选择导出全局最优解
    let u = -1
    let minDist = Infinity
    for (let i = 0; i < n; i++) {
      if (!visited[i] && dist[i] < minDist) {
        minDist = dist[i]
        u = i
      }
    }

    // 若找不到可达的未访问顶点（剩余顶点均不可达），算法提前终止
    // 这是处理非连通图的关键逻辑
    if (u === -1) break

    // 记录选择最小距离顶点的步骤
    steps.push({
      description: `选择未访问的最小距离顶点：${graph.nodes[u].label}（距离=${dist[u]}）`,
      highlightLine: 3,
      data: { dist: [...dist], visited: [...visited], prev: [...prev], current: u, graph }
    })

    // 标记 u 为已访问——dist[u] 此时即为源点到 u 的最终最短距离
    // 原因：任何未访问顶点到源点的距离 >= dist[u]（根据选取规则），
    //       且所有边权非负，因此不可能通过其他未访问顶点获得更短路径
    visited[u] = true

    steps.push({
      description: `标记 ${graph.nodes[u].label} 为已访问`,
      highlightLine: 4,
      data: { dist: [...dist], visited: [...visited], prev: [...prev], current: u, graph }
    })

    // 遍历顶点 u 的所有邻边，对每个邻居 v 执行松弛操作
    // 由于边是无向的，需要检查 from 和 to 两个方向
    const neighbors = graph.edges.filter(e => e.from === u || e.to === u)
    for (const edge of neighbors) {
      // 确定邻居顶点 v（边的另一端）
      const v = edge.from === u ? edge.to : edge.from

      // 已确定最短距离的顶点跳过（其 dist 值不会再改变）
      if (visited[v]) continue

      // 计算通过 u 到达 v 的候选距离
      const newDist = dist[u] + edge.weight

      // 记录检查步骤
      steps.push({
        description: `检查边 ${graph.nodes[u].label} → ${graph.nodes[v].label}（权重=${edge.weight}）：当前距离=${dist[v] === Infinity ? '∞' : dist[v]}，新距离=${newDist}`,
        highlightLine: 6,
        data: { dist: [...dist], visited: [...visited], prev: [...prev], current: u, checking: v, edge, graph }
      })

      // 松弛操作：若发现更短路径，则更新
      if (newDist < dist[v]) {
        dist[v] = newDist // 更新最短距离
        prev[v] = u       // 记录前驱节点，用于路径回溯
        steps.push({
          description: `更新 ${graph.nodes[v].label} 的最短距离为 ${newDist}（经过 ${graph.nodes[u].label}）`,
          highlightLine: 7,
          data: { dist: [...dist], visited: [...visited], prev: [...prev], current: u, updated: v, graph }
        })
      }
      // 若 newDist >= dist[v]，说明当前路径不如已知路径优，不做更新
    }
  }

  // 算法结束，输出最终结果
  // 距离为 Infinity 的顶点表示从源点不可达
  steps.push({
    description: `算法结束。最短距离：${graph.nodes.map((node, i) => `${node.label}=${dist[i] === Infinity ? '∞' : dist[i]}`).join(', ')}`,
    highlightLine: 9,
    data: { dist: [...dist], visited: [...visited], prev: [...prev], current: -1, graph }
  })

  return steps
}

/** Dijkstra 算法元信息，用于前端展示算法简介、伪代码等 */
export const dijkstraInfo = {
  id: 'dijkstra',
  name: 'Dijkstra 最短路径',
  category: '图算法',
  difficulty: '中等',
  timeComplexity: 'O(V²)（邻接矩阵）/ O((V+E)logV)（优先队列）',
  spaceComplexity: 'O(V)',
  description: 'Dijkstra算法用于计算加权图中单源最短路径。通过贪心策略，每次选择距离最小的未访问顶点进行松弛操作。',
  pseudocode: [
    'function dijkstra(graph, source):',
    '  dist[source] = 0, 其余 = ∞',
    '  while 存在未访问顶点:',
    '    u = 未访问中dist最小的顶点',
    '    标记 u 为已访问',
    '    for each 邻居 v of u:',
    '      if dist[u] + weight(u,v) < dist[v]:',
    '        dist[v] = dist[u] + weight(u,v)',
    '        prev[v] = u',
    '  return dist, prev'
  ]
}

/**
 * Dijkstra 算法预置测试用例
 *
 * 提供三组典型图结构，覆盖不同场景：
 * 1. 普通连通图：验证标准最短路径计算
 * 2. 非连通图（含孤立节点）：验证不可达节点距离保持为 Infinity
 * 3. 等权多路径图：存在总权重相同的不同路径，验证算法正确选定其中一条
 */
export const dijkstraTestCases: { name: string; input: DijkstraGraph; source: number; description: string }[] = [
  {
    name: '普通连通图（5节点）',
    source: 0,
    description: '5个节点的加权无向连通图，从A出发',
    input: {
      nodes: [
        { id: 0, label: 'A', x: 100, y: 200 },
        { id: 1, label: 'B', x: 250, y: 80 },
        { id: 2, label: 'C', x: 250, y: 320 },
        { id: 3, label: 'D', x: 400, y: 80 },
        { id: 4, label: 'E', x: 400, y: 320 }
      ],
      edges: [
        { from: 0, to: 1, weight: 4 },
        { from: 0, to: 2, weight: 2 },
        { from: 1, to: 2, weight: 1 },
        { from: 1, to: 3, weight: 5 },
        { from: 2, to: 4, weight: 3 },
        { from: 3, to: 4, weight: 1 }
      ]
    }
  },
  {
    name: '非连通图（含孤立节点）',
    source: 0,
    description: '含1个孤立节点F，演示其最终距离仍为∞',
    input: {
      nodes: [
        { id: 0, label: 'A', x: 100, y: 120 },
        { id: 1, label: 'B', x: 100, y: 240 },
        { id: 2, label: 'C', x: 250, y: 120 },
        { id: 3, label: 'D', x: 250, y: 240 },
        { id: 4, label: 'E', x: 400, y: 180 },
        { id: 5, label: 'F(孤立)', x: 500, y: 100 }
      ],
      edges: [
        { from: 0, to: 1, weight: 3 },
        { from: 0, to: 2, weight: 6 },
        { from: 1, to: 3, weight: 4 },
        { from: 2, to: 3, weight: 2 },
        { from: 2, to: 4, weight: 5 },
        { from: 3, to: 4, weight: 1 }
      ]
    }
  },
  {
    name: '等权多路径图',
    source: 0,
    description: '存在两条总权重相同的路径A→D，验证算法能正确选出其中一条',
    input: {
      nodes: [
        { id: 0, label: 'A', x: 80, y: 200 },
        { id: 1, label: 'B', x: 220, y: 100 },
        { id: 2, label: 'C', x: 220, y: 300 },
        { id: 3, label: 'D', x: 400, y: 200 },
        { id: 4, label: 'E', x: 500, y: 100 }
      ],
      edges: [
        { from: 0, to: 1, weight: 2 },
        { from: 0, to: 2, weight: 2 },
        { from: 1, to: 3, weight: 3 },
        { from: 2, to: 3, weight: 3 },
        { from: 3, to: 4, weight: 1 }
      ]
    }
  }
]
