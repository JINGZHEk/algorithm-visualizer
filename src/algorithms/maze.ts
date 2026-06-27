/**
 * 迷宫求解模块 (Maze Solving Module)
 *
 * 本模块实现基于深度优先搜索 (DFS) 结合回溯法 (Backtracking) 的迷宫路径求解器，
 * 并提供随机迷宫生成与预置迷宫测试数据，用于算法可视化。
 *
 * **核心思想 —— DFS 回溯：**
 * 回溯法是一种系统化搜索解空间的算法范式。对于迷宫问题，将每一步移动视为
 * 一个"决策点"，算法尝试所有可能的路径（深度优先），当发现某条路径走不通时
 * （遇到墙、已访问格或越界），回退到上一个决策点尝试其他方向。
 *
 * **算法流程（solve 函数）：**
 * 1. **边界检查：** 若当前格越界、是墙或已访问，返回 false（此路不通）
 * 2. **标记访问：** 将当前格标记为已访问，加入路径
 * 3. **目标检查：** 若当前格是终点，返回 true（找到解）
 * 4. **方向探索：** 按顺序尝试四个方向（右→下→左→上），对每个方向递归调用 solve
 * 5. **回溯：** 若所有方向均失败，从路径中移除当前格（pop），返回 false
 *    —— 这一步是回溯法的精髓：撤销当前决策，返回上层尝试其他分支
 *
 * **复杂度：**
 * - 时间复杂度：O(2^(rows*cols)) 最坏情况（需要探索几乎全部可能路径）；
 *   实际中通常为 O(rows*cols)，因为 visited 数组确保每个格子只被访问一次
 * - 空间复杂度：O(rows*cols)，用于 visited 数组和递归调用栈
 *
 * **关键设计决策：**
 * - 使用显式 visited 二维数组防止重复访问，避免无限循环
 * - `path` 数组追踪当前探索路径，用于可视化中高亮"正在尝试的路径"
 * - `allVisited` 数组记录所有被访问过的格子（包括回溯后离开的），
 *   用于可视化中区分"已探索区域"与"当前路径"
 * - 方向探索顺序为右→下→左→上，影响路径偏好但不影响正确性
 * - `found` 全局标志追踪是否已找到解，允许快速退出递归
 * - generateMaze 确保起点和终点区域至少有通行路径（附近格子强制非墙），
 *   避免生成完全无解的迷宫（尽管随机迷宫仍有可能无解）
 *
 * 使用方式：
 * - 调用 generateMaze(rows, cols) 随机生成迷宫，返回 MazeGrid
 * - 调用 generateMazeSteps(grid) 求解迷宫，返回 AlgorithmStep[] 供前端逐步播放
 * - 调用 parseMazeFromArray(arr) 将 2D 数字数组 (0=通路, 1=墙) 转换为 MazeGrid
 * - mazeTestCases 提供预置迷宫（唯一解、无解、多解），确保可重现的演示效果
 */

import type { AlgorithmStep } from '../types'

/**
 * 迷宫中的单个格子
 *
 * @param row - 格子所在行索引
 * @param col - 格子所在列索引
 * @param isWall - 是否为墙体（不可通行）
 * @param isStart - 是否为起点
 * @param isEnd - 是否为终点
 */
export interface MazeCell {
  row: number
  col: number
  isWall: boolean
  isStart: boolean
  isEnd: boolean
}

/**
 * 迷宫网格类型 —— 二维 MazeCell 数组
 *
 * MazeGrid[row][col] 表示第 row 行、第 col 列的格子。
 * 行索引从上到下递增，列索引从左到右递增。
 */
export type MazeGrid = MazeCell[][]

/**
 * 随机生成迷宫网格
 *
 * 生成规则：
 * - 每个格子有 30% 概率成为墙（Math.random() < 0.3）
 * - 起点 (0,0) 和终点 (rows-1, cols-1) 强制为非墙
 * - 起点和终点周围的格子（右邻居和下邻居 / 左邻居和上邻居）也强制为非墙，
 *   以确保起点和终点至少有基本可达性
 *
 * 注意：此方法生成的迷宫不保证一定有解。随机生成的墙体可能形成无法穿越的屏障。
 * 对于需要保证有解的演示场景，建议使用 mazeTestCases 中的预置迷宫。
 *
 * @param rows - 迷宫行数（高度）
 * @param cols - 迷宫列数（宽度）
 * @returns MazeGrid - 随机生成的迷宫网格
 */
export function generateMaze(rows: number, cols: number): MazeGrid {
  const grid: MazeGrid = []
  for (let r = 0; r < rows; r++) {
    const row: MazeCell[] = []
    for (let c = 0; c < cols; c++) {
      // 30% 概率生成墙，70% 概率生成通路
      row.push({
        row: r,
        col: c,
        isWall: Math.random() < 0.3,
        isStart: false,
        isEnd: false
      })
    }
    grid.push(row)
  }

  // 确保起点 (0,0) 及其相邻右/下格子为通路
  grid[0][0].isWall = false
  grid[0][0].isStart = true
  grid[rows - 1][cols - 1].isWall = false
  grid[rows - 1][cols - 1].isEnd = true
  grid[0][1].isWall = false   // 起点右侧
  grid[1][0].isWall = false   // 起点下方

  // 确保终点及其相邻左/上格子为通路
  grid[rows - 1][cols - 2].isWall = false   // 终点左侧
  grid[rows - 2][cols - 1].isWall = false   // 终点上方

  return grid
}

/**
 * 使用 DFS 回溯法求解迷宫，生成逐步可视化数据
 *
 * 核心递归函数 solve(r, c) 从位置 (r, c) 出发尝试找到通往终点的路径。
 * 每一步操作（进入新格子、尝试方向、回溯）均生成一个 AlgorithmStep，
 * 供前端以动画形式播放整个探索过程。
 *
 * **回溯机制详解：**
 * 当 solve(r, c) 的四个方向探索全部失败时：
 * 1. 执行 path.pop() —— 将当前格子从"有效路径"中移除
 * 2. 返回 false —— 告知上层调用者"此路不通"
 * 3. 上层调用者继续尝试下一个方向
 * 这个过程就是"回溯"——撤销不成功的决策，回到上一个决策点尝试其他可能。
 *
 * **visited 数组的作用：**
 * visited 确保每个格子最多被访问一次，防止在环路中无限递归。
 * 这与回溯并不冲突：回溯时格子仍然保留 visited=true，
 * 只是从 path 中移除（表示不再属于当前探索路径）。
 *
 * @param grid - 迷宫网格（MazeGrid 二维数组）
 * @returns AlgorithmStep[] - 探索过程的步骤数组，每个步骤包含：
 *   - description: 当前操作的中文描述
 *   - data.grid: 迷宫网格引用
 *   - data.visited: 当前已访问标记状态
 *   - data.path: 当前探索路径（从起点到当前格的有效移动轨迹）
 *   - data.current: 当前所在位置 [row, col]
 *   - data.trying: 正在尝试移动到的目标位置（方向探索步骤）
 *   - data.backtrack: 是否为回溯步骤
 *   - data.found: 最终是否找到路径
 *   - data.allVisited: 所有曾被访问过的格子（包括已回溯离开的）
 */
export function generateMazeSteps(grid: MazeGrid): AlgorithmStep[] {
  const steps: AlgorithmStep[] = []
  const rows = grid.length
  const cols = grid[0].length

  // visited[r][c] = true 表示格子已被探索过（防止重复访问和无限循环）
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))

  // path 追踪当前有效路径上的格子（不包括已回溯离开的格子）
  // 每个元素为 [row, col] 坐标对
  const path: [number, number][] = []

  // allVisited 记录所有曾被访问过的格子（包括已回溯离开的）
  // 用于前端可视化——区分"曾经探索过"和"当前路径"
  const allVisited: [number, number][] = []

  // 初始状态：迷宫概览
  steps.push({
    description: `开始求解迷宫（${rows}x${cols}），起点(0,0)，终点(${rows - 1},${cols - 1})`,
    highlightLine: 0,
    data: { grid, visited: JSON.parse(JSON.stringify(visited)), path: [...path], current: null, allVisited: [...allVisited] }
  })

  // 四个探索方向及其中文名称
  // 探索顺序：右 → 下 → 左 → 上（影响路径选择偏好）
  // 修改此顺序可改变算法在等权路径中的偏好方向
  const directions: [number, number, string][] = [
    [0, 1, '右'],   // (行+0, 列+1) —— 向右
    [1, 0, '下'],   // (行+1, 列+0) —— 向下
    [0, -1, '左'],  // (行+0, 列-1) —— 向左
    [-1, 0, '上']   // (行-1, 列+0) —— 向上
  ]

  // found 标志：一旦找到终点路径，所有递归层快速退出
  let found = false

  /**
   * DFS 回溯求解递归函数
   *
   * 从位置 (r, c) 出发，尝试找到一条通往终点的路径。
   * 返回 true 表示从该位置出发找到了路径；返回 false 表示此路不通。
   *
   * @param r - 当前行索引
   * @param c - 当前列索引
   * @returns boolean - 是否从 (r, c) 找到了通往终点的路径
   */
  function solve(r: number, c: number): boolean {
    // 越界检查：行或列超出迷宫边界
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false

    // 障碍检查：遇到墙或已访问过的格子（防止回头路和死循环）
    if (grid[r][c].isWall || visited[r][c]) return false

    // 标记当前格子为已访问
    visited[r][c] = true

    // 将当前格子加入路径（假设这是一个有效步骤）
    path.push([r, c])

    // 记录到 allVisited（所有探索过的格子，不回撤）
    allVisited.push([r, c])

    // 记录探索步骤
    steps.push({
      description: `探索位置 (${r}, ${c})${grid[r][c].isEnd ? ' —— 到达终点！' : ''}`,
      highlightLine: 2,
      data: { grid, visited: JSON.parse(JSON.stringify(visited)), path: [...path], current: [r, c], allVisited: [...allVisited] }
    })

    // 目标检查：若当前格子是终点，搜索成功
    if (grid[r][c].isEnd) {
      found = true
      return true
    }

    // 按顺序尝试四个方向（右→下→左→上）
    for (const [dr, dc, dir] of directions) {
      const nr = r + dr  // 新行 = 当前行 + 行偏移
      const nc = c + dc  // 新列 = 当前列 + 列偏移

      // 有效性预检：确保目标格在迷宫内、不是墙、未被访问
      // 此检查也方便可视化中展示"尝试某方向"的步骤
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].isWall && !visited[nr][nc]) {
        // 记录方向尝试步骤（仅在目标有效时展示）
        steps.push({
          description: `从 (${r},${c}) 尝试向${dir}移动到 (${nr},${nc})`,
          highlightLine: 4,
          data: { grid, visited: JSON.parse(JSON.stringify(visited)), path: [...path], current: [r, c], trying: [nr, nc], allVisited: [...allVisited] }
        })
      }

      // 递归探索该方向
      // 若返回 true，说明从该方向找到了终点——
      // 利用短路求值 (short-circuit evaluation) 快速向上层传递成功信号
      if (solve(nr, nc)) return true
    }

    // 回溯：四个方向均无法到达终点
    // 将当前格子从路径中移除——这是回溯法的核心操作
    // 撤销之前"假设这是一个有效步骤"的决策
    path.pop()

    steps.push({
      description: `(${r},${c}) 所有方向均不通，回溯`,
      highlightLine: 6,
      data: { grid, visited: JSON.parse(JSON.stringify(visited)), path: [...path], current: [r, c], backtrack: true, allVisited: [...allVisited] }
    })

    return false
  }

  // 从起点 (0, 0) 开始求解
  solve(0, 0)

  // 根据 found 标志生成最终结果步骤
  if (found) {
    steps.push({
      description: `找到路径！路径长度: ${path.length} 步`,
      highlightLine: 8,
      data: { grid, visited: JSON.parse(JSON.stringify(visited)), path: [...path], current: null, found: true, allVisited: [...allVisited] }
    })
  } else {
    steps.push({
      description: `无法到达终点，迷宫无解`,
      highlightLine: 8,
      data: { grid, visited: JSON.parse(JSON.stringify(visited)), path: [], current: null, found: false, allVisited: [...allVisited] }
    })
  }

  return steps
}

/** 迷宫求解算法元信息，用于前端展示算法简介、伪代码等 */
export const mazeInfo = {
  id: 'maze',
  name: '迷宫求解（回溯法）',
  category: '回溯算法',
  difficulty: '中-高',
  timeComplexity: 'O(2^(n*m))（最坏）/ O(n*m)（一般）',
  spaceComplexity: 'O(n*m)',
  description: '使用深度优先搜索(DFS)结合回溯法探索迷宫。从起点出发，逐步尝试各个方向，遇到死路时回退到上一个分支点，直到找到通往终点的路径。',
  pseudocode: [
    'function solveMaze(maze, row, col):',
    '  if 越界 or 是墙 or 已访问: return false',
    '  标记 (row, col) 已访问, 加入路径',
    '  if 到达终点: return true',
    '  for each direction in [右,下,左,上]:',
    '    if solveMaze(maze, newRow, newCol):',
    '      return true',
    '  从路径中移除 (row, col) // 回溯',
    '  return false'
  ]
}

/**
 * 迷宫算法预置测试用例
 *
 * 提供三组预置迷宫（以 2D 数字数组表示，0=通路，1=墙），覆盖：
 * 1. 唯一解迷宫 (5x5)：经典单解迷宫，演示标准 DFS 寻路过程
 * 2. 无解死胡同 (5x5)：入口被墙体包围，演示回溯撤销动画
 * 3. 多解迷宫 (8x8)：存在多条可行路径，演示算法找到的路径类型
 *
 * 使用预置迷宫而非随机迷宫，确保演示效果可重现。
 */
export const mazeTestCases = [
  {
    name: '唯一解迷宫（5x5）',
    input: [
      [0,1,0,0,0],
      [0,0,0,1,0],
      [0,1,1,1,0],
      [0,1,0,0,0],
      [0,0,0,1,0]
    ],
    description: '5x5经典单路迷宫，演示DFS深度优先的标准寻路铺色动画'
  },
  {
    name: '无解死胡同',
    input: [
      [0,1,1,0,0],
      [0,0,0,1,0],
      [1,1,1,1,0],
      [0,0,0,0,1],
      [0,1,1,0,0]
    ],
    description: '5x5迷宫，入口区域被墙体包围导致无解，演示回溯撤销动画'
  },
  {
    name: '多解迷宫（8x8）',
    input: [
      [0,0,1,0,0,0,0,0],
      [0,1,0,0,1,1,1,0],
      [0,0,0,1,0,0,0,0],
      [1,1,0,0,0,1,1,0],
      [0,0,0,1,0,0,0,1],
      [0,1,1,0,0,1,0,0],
      [0,0,0,0,1,0,1,0],
      [1,1,1,0,0,0,0,0]
    ],
    description: '8x8曲折迷宫，存在多条可行路径'
  }
]

/**
 * 将二维数字数组转换为 MazeGrid 格式
 *
 * 转换规则：
 * - 值为 1 的格子 → isWall = true（墙）
 * - 值为 0 的格子 → isWall = false（通路）
 * - (0, 0) → isStart = true（起点）
 * - (rows-1, cols-1) → isEnd = true（终点）
 *
 * 此函数用于将预置测试用的数字数组转换为算法可处理的 MazeGrid 格式。
 *
 * @param arr - 二维数字数组：0 表示通路，1 表示墙体
 * @returns MazeGrid - 转换后的迷宫网格，可直接传入 generateMazeSteps
 */
export function parseMazeFromArray(arr: number[][]): MazeGrid {
  const rows = arr.length
  const cols = arr[0].length
  const grid: MazeGrid = []
  for (let r = 0; r < rows; r++) {
    const row: MazeCell[] = []
    for (let c = 0; c < cols; c++) {
      row.push({
        row: r,
        col: c,
        isWall: arr[r][c] === 1,                    // 1 = 墙，0（或其他值）= 通路
        isStart: r === 0 && c === 0,                 // 左上角为起点
        isEnd: r === rows - 1 && c === cols - 1      // 右下角为终点
      })
    }
    grid.push(row)
  }
  return grid
}
