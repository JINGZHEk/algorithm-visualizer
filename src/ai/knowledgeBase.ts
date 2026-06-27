export interface KnowledgeEntry {
  keywords: string[]
  topic: string
  answer: string
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    topic: 'bubble',
    keywords: ['冒泡', 'bubble', '冒泡排序'],
    answer: `**冒泡排序（Bubble Sort）**

核心思想：反复比较相邻元素，如果顺序错误就交换。每一轮结束后，当前未排序区间中最大的元素会“冒泡”到末尾。

- 时间复杂度：最好 O(n)，平均/最坏 O(n^2)
- 空间复杂度：O(1)
- 稳定性：稳定

关键点：如果某一轮没有发生交换，说明数组已经有序，可以提前结束。`,
  },
  {
    topic: 'quick',
    keywords: ['快排', 'quick', '快速排序', '基准', 'pivot', '分治'],
    answer: `**快速排序（Quick Sort）**

核心思想：使用分治法。选择一个基准值 pivot，通过划分把较小元素放到左侧、较大元素放到右侧，再递归排序左右区间。

- 时间复杂度：平均 O(n log n)，最坏 O(n^2)
- 空间复杂度：平均 O(log n)，主要来自递归栈
- 稳定性：通常不稳定

关键点：基准选择会明显影响性能。随机 pivot 或三数取中可以降低退化风险。`,
  },
  {
    topic: 'dijkstra',
    keywords: ['dijkstra', '最短路', '最短路径', '迪ijkstra', '单源'],
    answer: `**Dijkstra 单源最短路径**

核心思想：贪心。每次从未确定的顶点中选出当前距离源点最近的顶点，并用它去松弛相邻边。

- 邻接矩阵复杂度：O(V^2)
- 优先队列 + 邻接表复杂度：O((V + E) log V)
- 限制：不能处理负权边

松弛操作可以理解为：如果经过 u 到 v 更短，就更新 dist[v]。`,
  },
  {
    topic: 'huffman',
    keywords: ['哈夫曼', 'huffman', '前缀编码', '编码', '最优编码'],
    answer: `**哈夫曼树与哈夫曼编码**

核心思想：贪心。每次取出频率最小的两个节点合并成新节点，再放回优先队列，直到只剩一个根节点。

- 时间复杂度：O(n log n)
- 空间复杂度：O(n)
- 性质：得到的是最优前缀编码，频率越高的字符编码越短

关键点：从根到叶子的路径就是该字符编码，常用左分支记 0、右分支记 1。`,
  },
  {
    topic: 'maze',
    keywords: ['迷宫', 'maze', '回溯', 'dfs', '深度优先', '路径'],
    answer: `**迷宫求解（DFS + 回溯）**

核心思想：从起点出发沿一个方向深入探索；走到死路时退回到上一个还有可尝试方向的位置，再继续尝试。

- 时间复杂度：通常接近 O(n * m)，每个格子访问有限次
- 空间复杂度：O(n * m)，来自递归栈和访问标记
- 关键机制：标记已访问，避免重复走回头路

回溯的本质是“尝试、失败、撤销、再尝试”。`,
  },
  {
    topic: 'general',
    keywords: ['时间复杂度', '复杂度', '大o', 'o(n)', 'big o'],
    answer: `**时间复杂度**

时间复杂度描述算法运行时间随输入规模 n 增长的趋势，通常使用大 O 记号表示渐进上界。

常见量级从快到慢：
- O(1)
- O(log n)
- O(n)
- O(n log n)
- O(n^2)
- O(2^n)
- O(n!)

在 AlgoVista 里，可以通过对比页面观察冒泡排序 O(n^2) 和快速排序平均 O(n log n) 的步骤差异。`,
  },
  {
    topic: 'general',
    keywords: ['稳定', '稳定性', 'stable'],
    answer: `**排序稳定性**

如果两个相等元素在排序后仍保持原来的相对顺序，这个排序算法就是稳定的。

- 稳定：冒泡排序、插入排序、归并排序
- 不稳定：快速排序、选择排序、堆排序

稳定性在多关键字排序中很重要，比如先按姓名排，再按成绩排时，需要保留前一次排序的相对结果。`,
  },
  {
    topic: 'general',
    keywords: ['贪心', 'greedy'],
    answer: `**贪心算法**

贪心算法每一步都选择当前看起来最优的方案，希望由局部最优推出全局最优。

适用前提通常包括：
- 贪心选择性质
- 最优子结构

本平台中的 Dijkstra 和哈夫曼树都是典型贪心应用。`,
  },
  {
    topic: 'general',
    keywords: ['用法', '怎么用', '如何使用', '操作', '帮助', '功能', '日志'],
    answer: `**平台使用提示**

1. 在首页选择算法卡片进入可视化页面。
2. 在左侧面板输入数据或选择预设用例。
3. 点击开始可视化后，观察中间动画和右侧伪代码高亮。
4. 底部控制栏可以播放、暂停、单步、重置和调速。
5. 对比页面可以并排观察冒泡排序与快速排序的效率差异。
6. 键盘快捷键：Space播放/暂停、←→单步、R重置、1~5调速。`,
  },
  {
    topic: 'general',
    keywords: ['分治', 'divide', 'conquer', '分而治之'],
    answer: `**分治算法（Divide and Conquer）**

核心思想：将原问题分解为若干个规模更小的子问题，递归求解子问题，最后合并子问题的解得到原问题的解。

三个步骤：
1. 分解（Divide）：将问题分成子问题
2. 解决（Conquer）：递归求解子问题
3. 合并（Combine）：组合子问题的解

典型应用：快速排序、归并排序、二分查找。本平台中快速排序是分治思想的典型代表。`,
  },
  {
    topic: 'general',
    keywords: ['BFS', 'DFS', '广度优先', '深度优先', '对比', '区别'],
    answer: `**BFS（广度优先搜索）与 DFS（深度优先搜索）**

- BFS：逐层扩展，使用队列，适合找最短路径（无权图）。时间和空间均为 O(V+E)。
- DFS：一直走到尽头再回溯，使用递归或栈，适合穷举、迷宫、拓扑排序。

本平台迷宫求解使用 DFS+回溯策略。Dijkstra 可以看作带权重的 BFS 变体。`,
  },
  {
    topic: 'dijkstra',
    keywords: ['负权', '负边', 'dijkstra限制'],
    answer: `**Dijkstra 算法的局限性**

Dijkstra 算法**不能处理负权边**。原因：一旦节点被标记为"已确认"，其最短距离就不再更新。负权边可能导致后面发现更短的路径，但该节点已经被锁定。

如果需要处理负权边，应该使用 Bellman-Ford 算法。`,
  },
  {
    topic: 'huffman',
    keywords: ['压缩', '压缩率', '哈夫曼编码效率'],
    answer: `**哈夫曼编码压缩率**

哈夫曼编码的压缩效果取决于字符频率分布的不均匀程度。频率越不均匀，编码越高效。

平均编码长度 = Σ(频率_i × 编码长度_i) / 总频率

极端的例子：如果某个字符频率占 99%，其他字符共占 1%，高频字符可能只用 1bit 编码，极大地节省空间。`,
  },
  {
    topic: 'general',
    keywords: ['排列', '组合', '阶乘', 'n!'],
    answer: `**排列与组合复杂度**

O(n!) 是最常见阶乘复杂度算法的时间上界，典型出现在需要枚举全排列的场景。

- n=5 时 n! = 120，尚可处理
- n=10 时 n! ≈ 3.6×10^6，已经很大
- n=20 时 n! ≈ 2.4×10^18，完全不可行

N皇后问题的朴素解法复杂度为 O(n!)，但通过剪枝回溯可在实际中大幅减少搜索空间。`,
  },
]

export function searchKnowledge(query: string, contextTopic?: string): string | null {
  const q = query.toLowerCase()
  let best: KnowledgeEntry | null = null
  let bestScore = 0

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0
    for (const keyword of entry.keywords) {
      if (q.includes(keyword.toLowerCase())) score += 2
    }
    if (contextTopic && entry.topic === contextTopic) score += 1
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  return bestScore > 0 ? best!.answer : null
}
