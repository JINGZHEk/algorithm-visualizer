/**
 * 排序算法模块 (Sorting Algorithms Module)
 *
 * 本模块实现两种经典排序算法的步骤生成器，用于算法可视化：
 *
 * 1. **冒泡排序 (Bubble Sort)**
 *    - 核心思想：重复遍历数组，依次比较相邻元素。若顺序错误则交换，每轮遍历
 *      将当前未排序部分的最大元素"冒泡"到最终位置。
 *    - 时间复杂度：O(n^2) 最坏/平均，O(n) 最优（已排序时可提前终止的变体；
 *      本实现在展示层面始终执行完整遍历以呈现完整动画）。
 *    - 空间复杂度：O(1)，原地排序。
 *    - 稳定性：稳定（相等元素不交换）。
 *    - 关键设计：外层循环 i 控制已排序尾部的边界（每轮末尾 i+1 个元素归位），
 *      内层循环 j 扫描 [0, n-1-i) 执行比较与交换。sorted 数组追踪已归位的索引，
 *      用于可视化中高亮已排序区域。
 *
 * 2. **快速排序 (Quick Sort)**
 *    - 核心思想：分治策略。选取一个基准值 (pivot)，通过划分操作 (partition)
 *      将数组分为左右两部分——左侧所有元素 <= pivot，右侧所有元素 > pivot，
 *      然后递归地对左右子数组排序。
 *    - 时间复杂度：O(n log n) 平均，O(n^2) 最坏（已排序或逆序数组且选取策略不当）。
 *    - 空间复杂度：O(log n)，递归调用栈深度。
 *    - 稳定性：不稳定（划分过程中等值元素的相对顺序可能改变）。
 *    - 关键设计：采用 Lomuto 划分方案——选取子数组最后一个元素作为 pivot。
 *      i 指针维护"小于等于 pivot 的区域的末尾边界"，j 指针从头扫描。
 *      当 arr[j] <= pivot 时，i 前移并交换 arr[i] 与 arr[j]。
 *      扫描完成后将 pivot 放到 i+1 位置，使其到达最终排序位置。
 *      sorted Set 用于记录已在最终位置的元素索引。
 *
 * 使用方式：
 * - 调用 generateBubbleSortSteps(arr) / generateQuickSortSteps(arr) 传入待排序数组，
 *   返回 AlgorithmStep[] 数组，每个 Step 包含当前数组快照、高亮信息、描述文本，
 *   供前端逐步播放排序过程。
 * - sortingTestCases 提供预置测试用例，覆盖常规乱序、极端退化、边界条件等场景。
 */

import type { AlgorithmStep } from '../types'

/**
 * 生成冒泡排序的逐步可视化数据
 *
 * 每次外层循环（第 i 轮）最多将第 i+1 大的元素"冒泡"到数组末尾的正确位置。
 * 内层循环依次比较相邻元素 data[j] 和 data[j+1]，若前者大于后者则交换。
 * 每轮结束后，数组右侧 i+1 个元素已处于最终位置。
 *
 * @param arr - 待排序的原始数组
 * @returns AlgorithmStep[] - 排序过程的步骤数组，每个步骤包含：
 *   - description: 当前操作的中文描述
 *   - data: 当前数组的快照（浅拷贝）
 *   - comparing/swapping: 正在比较/交换的元素索引对
 *   - sorted: 已归位的元素索引数组（从右侧向左侧累积）
 *   - highlightLine: 伪代码对应行号
 */
export function generateBubbleSortSteps(arr: number[]): AlgorithmStep[] {
  const steps: AlgorithmStep[] = []
  const data = [...arr]

  // 记录初始状态，使可视化从原始数组开始展示
  steps.push({
    description: `初始数组: [${data.join(', ')}]`,
    highlightLine: 0,
    data: [...data],
    highlights: [],
    sorted: []
  })

  const n = data.length

  // 外层循环：第 i 轮结束后，数组末尾 i+1 个元素已归位
  // 共需要 n-1 轮（n 个元素排序需要 n-1 轮，因为最后一个元素自动归位）
  for (let i = 0; i < n - 1; i++) {

    // 内层循环：从数组头部扫描到 n-1-i（未排序区域的末尾）
    // j 是当前比较窗口的左索引，j+1 是右索引
    for (let j = 0; j < n - 1 - i; j++) {

      // 步骤1：比较相邻两个元素
      steps.push({
        description: `比较 ${data[j]} 和 ${data[j + 1]}`,
        highlightLine: 3,
        data: [...data],
        comparing: [j, j + 1],
        // 已排序区域：数组最右侧 i 个元素（索引从 n-1 递减到 n-i）
        sorted: Array.from({ length: i }, (_, k) => n - 1 - k)
      })

      // 步骤2：若前一个大于后一个，则交换（升序排序的核心判断）
      if (data[j] > data[j + 1]) {
        // 使用解构赋值原地交换两个元素
        ;[data[j], data[j + 1]] = [data[j + 1], data[j]]
        steps.push({
          description: `交换 ${data[j + 1]} 和 ${data[j]}（${data[j + 1]} > ${data[j]}）`,
          highlightLine: 4,
          data: [...data],
          swapping: [j, j + 1],
          sorted: Array.from({ length: i }, (_, k) => n - 1 - k)
        })
      }
      // 注意：若 data[j] <= data[j+1]，不产生交换步骤，体现冒泡排序的稳定性
    }

    // 本轮结束：第 i+1 大的元素已冒泡到索引 n-1-i 处
    steps.push({
      description: `第 ${i + 1} 轮结束，${data[n - 1 - i]} 已到达正确位置`,
      highlightLine: 6,
      data: [...data],
      sorted: Array.from({ length: i + 1 }, (_, k) => n - 1 - k)
    })
  }

  // 排序完成，所有元素归位
  steps.push({
    description: `排序完成: [${data.join(', ')}]`,
    highlightLine: 7,
    data: [...data],
    sorted: Array.from({ length: n }, (_, k) => k)
  })

  return steps
}

/**
 * 生成快速排序的逐步可视化数据
 *
 * 采用 Lomuto 划分方案（选取子数组最后一个元素作为 pivot）。
 * partition 函数将数组分为 [low..i] <= pivot 和 [i+1..high-1] > pivot 两部分，
 * 返回 pivot 最终位置。然后递归对左右子数组执行相同操作。
 *
 * 核心不变量（循环中）：
 * - [low..i]    区域：元素均 <= pivot
 * - [i+1..j-1]  区域：元素均 > pivot
 * - [j..high-1] 区域：尚未检查的元素
 * - high        位置：pivot 元素
 *
 * @param arr - 待排序的原始数组
 * @returns AlgorithmStep[] - 排序过程的步骤数组，每个步骤包含：
 *   - description: 当前操作的中文描述
 *   - data: 当前数组的快照
 *   - comparing/highlights/swapping: 当前关注的元素索引
 *   - extra: 包含 pivot 值、当前边界指针 (i, j, low, high) 等划分上下文
 *   - sorted: sorted Set 在完成时转为所有索引
 */
export function generateQuickSortSteps(arr: number[]): AlgorithmStep[] {
  const steps: AlgorithmStep[] = []
  const data = [...arr]
  // 使用 Set 追踪已到达最终位置的元素索引
  // 当一个元素被分区函数放置到正确位置后，其索引被加入此集合
  const sorted: Set<number> = new Set()

  // 初始状态
  steps.push({
    description: `初始数组: [${data.join(', ')}]`,
    highlightLine: 0,
    data: [...data],
    highlights: [],
    sorted: []
  })

  /**
   * 划分函数 (Lomuto Partition)
   *
   * 选取 data[high] 作为 pivot（基准值）。
   * 维护指针 i = low - 1，表示"<= pivot 区域"的末尾。
   * 遍历 j 从 low 到 high-1：
   *   若 data[j] <= pivot，则 i 前移一位，交换 data[i] 和 data[j]，
   *   将小元素归入左侧区域。
   * 遍历结束后，将 pivot 放到 i+1 位置（左右区域的交界处）。
   *
   * 返回 pivot 的最终索引（已归位）。
   *
   * @param low - 当前子数组的起始索引
   * @param high - 当前子数组的结束索引（也是 pivot 初始位置）
   * @returns number - pivot 元素归位后的索引
   */
  function partition(low: number, high: number): number {
    const pivot = data[high]

    // 记录选取 pivot 的步骤
    steps.push({
      description: `选择基准值 pivot = ${pivot}（索引 ${high}）`,
      highlightLine: 2,
      data: [...data],
      highlights: [high],
      extra: { pivot, low, high }
    })

    // i 指针：追踪"<= pivot 区域"的末尾边界（初始在 low 之前）
    let i = low - 1

    // j 指针：从 low 扫描到 high-1，检查每个元素与 pivot 的关系
    for (let j = low; j < high; j++) {

      // 比较当前元素与 pivot
      steps.push({
        description: `比较 ${data[j]} 与 pivot=${pivot}`,
        highlightLine: 4,
        data: [...data],
        comparing: [j, high],
        extra: { pivot, i, j, low, high }
      })

      // 关键判断：若当前元素 <= pivot，将其归入左侧区域
      if (data[j] <= pivot) {
        i++ // 扩展 <= pivot 区域的右边界

        // 只有当 i 和 j 不同时才交换，避免无意义的自我交换
        if (i !== j) {
          ;[data[i], data[j]] = [data[j], data[i]]
          steps.push({
            description: `${data[j]} <= ${pivot}，交换 data[${i}] 和 data[${j}]`,
            highlightLine: 5,
            data: [...data],
            swapping: [i, j],
            extra: { pivot, i, j, low, high }
          })
        }
      }
      // 若 data[j] > pivot，不做任何操作，j 继续前进（元素自然留在右侧）
    }

    // 扫描完成，将 pivot 放到 i+1 位置——左右子数组的交界处
    // 此时 data[i+1] >= pivot 必然成立（或被自身覆盖），交换后 pivot 归位
    ;[data[i + 1], data[high]] = [data[high], data[i + 1]]
    steps.push({
      description: `将 pivot=${pivot} 放到正确位置 ${i + 1}`,
      highlightLine: 7,
      data: [...data],
      swapping: [i + 1, high],
      extra: { pivot, partitionIndex: i + 1 }
    })

    // 记录 pivot 的最终位置（此元素不再参与后续划分）
    sorted.add(i + 1)
    return i + 1
  }

  /**
   * 快速排序递归函数
   *
   * 递归基准条件：low >= high（子数组长度为 0 或 1，自然有序）。
   * 递归步骤：
   *   1. partition(low, high) 确定一个元素的最终位置 pi
   *   2. quickSort(low, pi-1) 递归排序左子数组
   *   3. quickSort(pi+1, high) 递归排序右子数组
   *
   * @param low - 当前子数组起始索引
   * @param high - 当前子数组结束索引
   */
  function quickSort(low: number, high: number) {
    // 递归条件：子数组长度 >= 2 时才需要排序
    if (low < high) {
      // 记录进入递归子数组的步骤
      steps.push({
        description: `递归处理子数组 [${low}...${high}]`,
        highlightLine: 1,
        data: [...data],
        highlights: Array.from({ length: high - low + 1 }, (_, k) => low + k)
      })

      // 划分操作：确定 pivot 位置
      const pi = partition(low, high)

      // 递归排序 pivot 左侧和右侧的子数组
      // 注意：pivot 本身 (pi) 已归位，不参与后续递归
      quickSort(low, pi - 1)
      quickSort(pi + 1, high)
    } else if (low === high) {
      // 单个元素的子数组直接视为已排序
      sorted.add(low)
    }
    // low > high 时为空子数组，直接返回
  }

  // 从整个数组范围开始快速排序
  quickSort(0, data.length - 1)

  // 排序完成
  steps.push({
    description: `排序完成: [${data.join(', ')}]`,
    highlightLine: 9,
    data: [...data],
    sorted: Array.from({ length: data.length }, (_, k) => k)
  })

  return steps
}

/** 冒泡排序算法元信息，用于前端展示算法简介、伪代码等 */
export const bubbleSortInfo = {
  id: 'bubble',
  name: '冒泡排序',
  category: '排序算法',
  difficulty: '简单',
  timeComplexity: 'O(n²)',
  spaceComplexity: 'O(1)',
  description: '冒泡排序通过重复遍历数组，比较相邻元素并在必要时交换它们。每次遍历后，最大的未排序元素会"冒泡"到其最终位置。',
  pseudocode: [
    'function bubbleSort(arr):',
    '  n = arr.length',
    '  for i = 0 to n-2:',
    '    for j = 0 to n-2-i:',
    '      if arr[j] > arr[j+1]:',
    '        swap(arr[j], arr[j+1])',
    '    // 第i轮结束',
    '  return arr'
  ]
}

/** 快速排序算法元信息，用于前端展示算法简介、伪代码等 */
export const quickSortInfo = {
  id: 'quick',
  name: '快速排序',
  category: '排序算法',
  difficulty: '中等',
  timeComplexity: 'O(n log n) 平均 / O(n²) 最坏',
  spaceComplexity: 'O(log n)',
  description: '快速排序选择一个基准元素，将数组划分为两部分：小于基准的和大于基准的，然后递归地对两部分排序。',
  pseudocode: [
    'function quickSort(arr, low, high):',
    '  if low < high:',
    '    pivot = arr[high]',
    '    i = low - 1',
    '    for j = low to high-1:',
    '      if arr[j] <= pivot:',
    '        i++; swap(arr[i], arr[j])',
    '    swap(arr[i+1], arr[high])',
    '    pi = i + 1',
    '    quickSort(arr, low, pi-1)',
    '    quickSort(arr, pi+1, high)'
  ]
}

/**
 * 排序算法预置测试用例
 *
 * 为每种排序算法提供多组测试数据，覆盖以下场景：
 * - 常规乱序数组：展示算法标准行为
 * - 极端情况（最坏/最优）：验证边界处理和性能退化特征
 * - 重复元素：验证稳定性与等值处理逻辑
 */
export const sortingTestCases = {
  bubble: [
    { name: '常规乱序', input: [64, 34, 25, 12, 22, 11, 90], description: '7个无序整数，演示完整多次交换过程' },
    { name: '完全倒序（最坏O(n²)）', input: [90, 80, 70, 60, 50, 40], description: '每次比较必须交换，演示最坏情况' },
    { name: '已排序/全等（最优）', input: [5, 5, 5, 5, 5], description: '验证边界死循环防御，演示最优情况' }
  ],
  quick: [
    { name: '常规乱序', input: [45, 12, 89, 33, 67, 21, 9], description: '演示基准值选取与左右指针移动划分区间' },
    { name: '极端偏斜（正序退化）', input: [10, 20, 30, 40, 50], description: '演示快排在正序数组下的退化情况O(n²)' },
    { name: '大量重复元素', input: [2, 8, 2, 8, 2, 2, 8], description: '含有大量重复值，演示交换处理逻辑' }
  ]
}
