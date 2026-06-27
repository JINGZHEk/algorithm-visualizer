/**
 * 哈夫曼树构造模块 (Huffman Tree Construction Module)
 *
 * 本模块实现哈夫曼编码 (Huffman Coding) 树构造的步骤生成器，用于算法可视化。
 *
 * **核心思想：**
 * 哈夫曼编码是一种贪心算法，用于生成最优前缀编码（无歧义、无分隔符的二进制编码）。
 * 算法基于"频率越高，编码越短"的原则，通过自底向上构造一棵哈夫曼树来实现。
 *
 * **算法流程（贪心合并）：**
 * 1. 为每个字符创建一个叶子节点，以其频率作为节点的权值
 * 2. 将所有叶子节点放入优先队列（按频率排序）
 * 3. 重复以下操作直到队列中只剩一个节点：
 *    a. 从队列中取出频率最小的两个节点（贪心选择）
 *    b. 创建一个新的父节点，其频率为两子节点频率之和
 *    c. 将父节点放回队列
 * 4. 队列中剩余的最后一个节点即为哈夫曼树的根
 * 5. 从根节点出发，分配编码：遍历左子树加 '0'，遍历右子树加 '1'
 *    叶子节点对应的路径即为该字符的哈夫曼编码
 *
 * **为何贪心选择保证最优？**
 * 在最优前缀编码树中，频率最低的两个字符必定是深度最深的兄弟节点。
 * 将它们最先合并实际上是将它们推到树的最深处（编码最长），
 * 符合"低频字符用长编码"的优化目标。
 *
 * **复杂度：**
 * - 时间复杂度：O(n log n)
 *   - 本实现每轮使用 Array.sort() (O(n log n))，共 n-1 轮，
 *     总体 O(n^2 log n)；使用真正的最小堆可将每轮提取降至 O(log n)，
 *     总体降至 O(n log n)
 * - 空间复杂度：O(n)，存储所有节点
 *
 * **编码性质：**
 * - 前缀性：任何字符的编码都不是另一个字符编码的前缀，保证解码无歧义
 * - 最优性：对于给定的字符频率分布，哈夫曼编码生成最短的期望编码长度
 *
 * **关键设计决策：**
 * - 使用 nodeId 全局计数器为每个节点分配唯一 ID，
 *   generateHuffmanSteps 每次调用时重置为 0 以保证幂等性
 * - 步骤数据中保留 `queue` 字段，展示当前优先队列中待处理的节点
 * - 步骤数据中保留 `tree` 字段，展示新创建的合并节点（父节点及其子树）
 * - 最终步骤输出所有字符的编码对照表 (codes)
 *
 * 使用方式：
 * - 调用 generateHuffmanSteps(frequencies) 传入字符频率数组，
 *   返回 AlgorithmStep[] 供前端逐步播放树的构造过程
 * - huffmanTestCases 提供预置测试用例（均匀频率、极端悬殊、英文高频字母）
 */

import type { AlgorithmStep } from '../types'

/**
 * 哈夫曼树节点
 *
 * 叶子节点代表单个字符及其频率；内部节点代表两个子树的合并，
 * 其 char 为子节点字符的拼接（如 "[AB]"），仅用于可视化标识。
 *
 * @param id - 节点唯一标识符（全局自增）
 * @param char - 节点代表的字符：叶子节点为单字符，内部节点为 "[子字符组合]"
 * @param freq - 节点权值/频率：叶子节点为字符本身频率，内部节点为子节点频率之和
 * @param left - 左子节点（叶子节点或 null）
 * @param right - 右子节点（叶子节点或 null）
 * @param x - 节点在画布上的 x 坐标（由前端布局计算，算法生成时可选）
 * @param y - 节点在画布上的 y 坐标（由前端布局计算，算法生成时可选）
 */
export interface HuffmanNode {
  id: number
  char: string
  freq: number
  left: HuffmanNode | null
  right: HuffmanNode | null
  x?: number
  y?: number
}

/**
 * 全局节点 ID 计数器
 *
 * 用于为哈夫曼树中的每个节点分配唯一 ID。
 * generateHuffmanSteps 每次调用时重置为 0。
 */
let nodeId = 0

/**
 * 生成哈夫曼树构造过程的逐步可视化数据
 *
 * 模拟贪心合并过程：每轮将频率最小的两个节点合并为一个父节点，
 * 直到只剩一个根节点。构造完成后遍历树为每个字符生成编码。
 *
 * **构建编码 (buildCodes) 详解：**
 * 从根节点开始深度优先遍历：
 * - 向左子节点前进时，当前编码追加 '0'
 * - 向右子节点前进时，当前编码追加 '1'
 * - 到达叶子节点时，累积的编码串即为该字符的哈夫曼编码
 * - 特殊处理：若只有一个叶子节点（所有频率相同或只有一种字符），
 *   编码设为 '0'（确保非空前缀编码）
 *
 * @param frequencies - 字符及其频率的数组，如 [{ char: 'A', freq: 5 }, ...]
 * @returns AlgorithmStep[] - 树构造过程的步骤数组，每个步骤包含：
 *   - description: 当前操作的中文描述
 *   - data.nodes: 当前优先队列中的所有节点（浅拷贝后的深拷贝）
 *   - data.merging: 当前正在合并的两个子节点（仅合并步骤）
 *   - data.tree: 新合并生成的父节点/子树
 *   - data.queue: 队列摘要（字符:频率对），用于前端展示
 *   - data.codes: 最终编码对照表（仅最后一步）
 */
export function generateHuffmanSteps(frequencies: { char: string; freq: number }[]): AlgorithmStep[] {
  const steps: AlgorithmStep[] = []
  // 每次调用重置全局 ID 计数器，确保节点 ID 从 0 开始
  nodeId = 0

  // 步骤1：创建叶子节点——每个字符一个节点
  // 这些节点最初组成待处理的优先队列
  const nodes: HuffmanNode[] = frequencies.map(f => ({
    id: nodeId++,
    char: f.char,
    freq: f.freq,
    left: null,
    right: null
  }))

  // 记录初始状态：所有叶子节点
  steps.push({
    description: `初始化：创建 ${nodes.length} 个叶子节点，每个节点代表一个字符及其频率`,
    highlightLine: 1,
    data: { nodes: JSON.parse(JSON.stringify(nodes)), tree: null, queue: nodes.map(n => ({ char: n.char, freq: n.freq })) }
  })

  // 主循环：贪心合并——每次取出频率最小的两个节点
  // 当队列中只剩一个节点时停止，该节点即为哈夫曼树的根
  while (nodes.length > 1) {

    // 按频率升序排序——模拟最小优先队列的 dequeue 操作
    // 注意：本实现每次循环都完整排序，O(n log n) per iteration
    // 生产级实现应使用最小堆以优化为 O(log n) per extraction
    nodes.sort((a, b) => a.freq - b.freq)

    // 记录排序后的队列状态，用于可视化
    steps.push({
      description: `按频率排序队列：[${nodes.map(n => `${n.char}:${n.freq}`).join(', ')}]`,
      highlightLine: 3,
      data: { nodes: JSON.parse(JSON.stringify(nodes)), tree: null, queue: nodes.map(n => ({ char: n.char, freq: n.freq })) }
    })

    // 取出频率最小的两个节点（shift 从数组头部移除）
    // 这是贪心选择的核心——每次选择当前最优（频率最小）的两个节点
    const left = nodes.shift()!
    const right = nodes.shift()!

    // 记录取出两个最小频率节点的步骤
    steps.push({
      description: `取出频率最小的两个节点：${left.char}(${left.freq}) 和 ${right.char}(${right.freq})`,
      highlightLine: 4,
      data: { nodes: JSON.parse(JSON.stringify(nodes)), merging: [left, right], queue: nodes.map(n => ({ char: n.char, freq: n.freq })) }
    })

    // 创建父节点——合并两个子节点
    // 父节点频率 = 左子频率 + 右子频率（代表子树中所有字符的总频率）
    // 父节点字符 = 子节点字符拼接（如 "A"+"B" → "[AB]"），仅用于显示
    const parent: HuffmanNode = {
      id: nodeId++,
      char: `[${left.char}${right.char}]`,
      freq: left.freq + right.freq,
      left,
      right
    }

    // 将新父节点放回队列
    nodes.push(parent)

    // 记录合并结果步骤
    steps.push({
      description: `合并为新节点 ${parent.char}，频率 = ${left.freq} + ${right.freq} = ${parent.freq}`,
      highlightLine: 5,
      data: { nodes: JSON.parse(JSON.stringify(nodes)), tree: JSON.parse(JSON.stringify(parent)), queue: nodes.map(n => ({ char: n.char, freq: n.freq })) }
    })
  }

  // 哈夫曼树构造完成，nodes[0] 为树的根节点
  const root = nodes[0]

  // 从根节点出发遍历树，为每个叶子节点（字符）生成哈夫曼编码
  const codes: Record<string, string> = {}

  /**
   * 递归遍历哈夫曼树，生成前缀编码
   *
   * 遍历策略：
   * - 向左子树递归时，当前路径编码追加 '0'
   * - 向右子树递归时，当前路径编码追加 '1'
   * - 到达叶子节点（无左右子树）时，将累积的 code 字符串存入 codes 表
   * - 特殊处理：若整棵树只有一根节点（单字符），编码设为 '0'
   *
   * @param node - 当前遍历到的节点
   * @param code - 从根到当前节点的路径编码字符串
   */
  function buildCodes(node: HuffmanNode | null, code: string) {
    if (!node) return

    // 叶子节点：左右子节点均为 null
    // 记录该字符的编码；若 code 为空串（单节点树），默认赋值 '0'
    if (!node.left && !node.right) {
      codes[node.char] = code || '0'
    }

    // 递归遍历左子树：路径追加 '0'（向左走）
    buildCodes(node.left, code + '0')

    // 递归遍历右子树：路径追加 '1'（向右走）
    buildCodes(node.right, code + '1')
  }

  // 从根节点开始，空编码串出发，生成所有编码
  buildCodes(root, '')

  // 最终步骤：构造完成，展示完整的哈夫曼编码表
  steps.push({
    description: `哈夫曼树构造完成！编码结果：${Object.entries(codes).map(([c, code]) => `${c}→${code}`).join(', ')}`,
    highlightLine: 7,
    data: { nodes: JSON.parse(JSON.stringify([root])), tree: JSON.parse(JSON.stringify(root)), codes, queue: [] }
  })

  return steps
}

/** 哈夫曼树构造算法元信息，用于前端展示算法简介、伪代码等 */
export const huffmanInfo = {
  id: 'huffman',
  name: '哈夫曼树构造',
  category: '树结构',
  difficulty: '中等',
  timeComplexity: 'O(n log n)',
  spaceComplexity: 'O(n)',
  description: '哈夫曼编码是一种贪心算法，通过构造最优二叉树实现前缀编码。频率越高的字符，其编码越短，从而实现数据压缩。',
  pseudocode: [
    'function buildHuffmanTree(frequencies):',
    '  创建叶子节点集合 Q',
    '  while Q.size > 1:',
    '    按频率排序 Q',
    '    left = Q.extractMin()',
    '    right = Q.extractMin()',
    '    parent = new Node(left.freq + right.freq)',
    '    parent.left = left, parent.right = right',
    '    Q.insert(parent)',
    '  return Q[0] // 根节点'
  ]
}

/**
 * 哈夫曼编码预置测试用例
 *
 * 提供三组字符频率分布，覆盖不同场景：
 * 1. 均匀频率分布：5个字符频率呈阶梯下降，演示标准的森林合并过程
 * 2. 极端悬殊频率：一个字符频率远大于其他，树严重不平衡——
 *    此时高频字符编码很短（路径短），体现哈夫曼编码核心优势
 * 3. 英文高频字母：6个常见英文字母及其近似自然语言频率，
 *    演示算法在实际压缩场景下的表现
 */
export const huffmanTestCases = [
  {
    name: '均匀频率分布',
    input: [
      { char: 'A', freq: 5 },
      { char: 'B', freq: 4 },
      { char: 'C', freq: 3 },
      { char: 'D', freq: 2 },
      { char: 'E', freq: 1 }
    ],
    description: '5个字符频率呈阶梯分布，演示常规森林合并与自底向上构建'
  },
  {
    name: '极端悬殊频率',
    input: [
      { char: 'A', freq: 100 },
      { char: 'B', freq: 2 },
      { char: 'C', freq: 1 }
    ],
    description: '演示A频率远大于B和C时，哈夫曼树出现极度不平衡的深度'
  },
  {
    name: '英文字母频率（6字符）',
    input: [
      { char: 'e', freq: 13 },
      { char: 't', freq: 9 },
      { char: 'a', freq: 8 },
      { char: 'o', freq: 7 },
      { char: 'i', freq: 7 },
      { char: 'n', freq: 7 }
    ],
    description: '6个常见英文字母及其近似频率'
  }
]
