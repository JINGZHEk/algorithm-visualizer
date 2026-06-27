/**
 * 算法播放状态管理 —— Pinia Composition Store
 *
 * ## 架构角色
 * 本 store 是可视化播放的**唯一状态源（Single Source of Truth）**，
 * 管理步骤序列、播放位置、播放状态和动画调度。
 * Vue 组件通过此 store 获取当前步骤并响应状态变化，不直接持有播放状态。
 *
 * ## 状态机设计
 * 播放状态遵循严格的状态机模型（Finite State Machine）：
 *
 * ```
 *               ┌──────────┐
 *               │   idle   │  ← 加载新步骤 / 调用 stop()
 *               └────┬─────┘
 *                    │ play()
 *                    ▼
 *        ┌───────────────────────┐
 *        │       playing         │─── 定时器驱动 tick() ──→ 步骤递增
 *        └───┬───────────────┬───┘
 *            │ pause()       │ 最后一步到达
 *            ▼               ▼
 *   ┌────────────┐    ┌──────────────┐
 *   │   paused   │    │   finished   │  ← 不可恢复播放，需 stop() 重置
 *   └─────┬──────┘    └──────────────┘
 *         │ play()
 *         ▼
 *   (回到 playing)
 * ```
 *
 * ## 核心依赖
 * - `AnimationScheduler`: 封装 requestAnimationFrame 的定时调度器，替代 setInterval
 *   以避免后台标签页的节流问题，同时提供暂停/恢复能力。
 *
 * ## 数据流
 * ```
 * AlgorithmWorkerClient → loadSteps(steps) → 设置 steps[] → play() →
 *   AnimationScheduler → tick() → currentStepIndex++ → 组件 reactively 更新
 * ```
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AlgorithmStep, PlaybackState, ExecutionLog } from '../types'
import { AnimationScheduler } from '../utils/AnimationScheduler'

export const useAlgorithmStore = defineStore('algorithm', () => {
  /** 步骤序列 —— 由算法生成后一次性加载 */
  const steps = ref<AlgorithmStep[]>([])
  /** 当前步骤索引：-1 表示未开始，0 表示第一步 */
  const currentStepIndex = ref(-1)
  /** 播放状态机当前状态 */
  const playbackState = ref<PlaybackState>('idle')
  /** 播放速度（ms/步），默认 500ms */
  const speed = ref(500)
  /** 动画调度器实例 —— 持有定时器引用 */
  const scheduler = new AnimationScheduler()

  // -------------------------------------------------------------------------
  // 派生状态（computed getters）
  // -------------------------------------------------------------------------

  /** 当前步骤数据，无步骤或未开始时返回 null */
  const currentStep = computed(() => {
    if (currentStepIndex.value >= 0 && currentStepIndex.value < steps.value.length) {
      return steps.value[currentStepIndex.value]
    }
    return null
  })

  /** 步骤总数 */
  const totalSteps = computed(() => steps.value.length)

  /**
   * 播放进度百分比（0~100）
   * 以 (currentStepIndex + 1) / totalSteps 计算，
   * 这样在第一步时显示 >0% 而非 0%
   */
  const progress = computed(() => {
    if (totalSteps.value === 0) return 0
    return ((currentStepIndex.value + 1) / totalSteps.value) * 100
  })

  // -------------------------------------------------------------------------
  // 步骤加载
  // -------------------------------------------------------------------------

  /**
   * 加载新的步骤序列，重置所有状态到 idle
   * 调用时机：用户在 UI 上点击"开始"或切换算法后获得新步骤
   *
   * @param newSteps - 算法生成的完整步骤数组
   */
  function loadSteps(newSteps: AlgorithmStep[]) {
    stop()
    steps.value = newSteps
    currentStepIndex.value = -1
    playbackState.value = 'idle'
  }

  // -------------------------------------------------------------------------
  // 播放控制 —— 状态机转换
  // -------------------------------------------------------------------------

  /**
   * 开始 / 恢复播放
   *
   * 状态转换规则：
   * - idle / paused / finished（索引在末尾时回绕到 0）→ playing
   * - finished 状态下当前索引在末尾时，重置到 0 重新开始
   * - playing 状态下调用无效果（由 scheduler 去重）
   */
  function play() {
    if (steps.value.length === 0) return
    // 如果已经播完且在最后一步，回绕到开头重新播放
    if (currentStepIndex.value >= steps.value.length - 1) {
      currentStepIndex.value = -1
    }
    // 未开始时从第 0 步开始
    if (currentStepIndex.value < 0) {
      currentStepIndex.value = 0
    }
    playbackState.value = 'playing'
    scheduler.start(speed.value, tick)
  }

  /**
   * 播放 tick 回调 —— 每 speed ms 由 AnimationScheduler 调用一次
   *
   * 关键逻辑：
   * - 检查当前是否仍在 playing 状态（防止竞态）
   * - 到达最后一步时自动进入 finished 状态并停止定时器
   */
  function tick() {
    if (playbackState.value !== 'playing') return
    if (currentStepIndex.value >= steps.value.length - 1) {
      scheduler.stop()
      playbackState.value = 'finished'
      return
    }
    currentStepIndex.value++
  }

  /** 暂停播放 → paused 状态 */
  function pause() {
    playbackState.value = 'paused'
    scheduler.pause()
  }

  /** 完全停止 → idle 状态，索引回到 -1 */
  function stop() {
    playbackState.value = 'idle'
    currentStepIndex.value = -1
    scheduler.stop()
  }

  // -------------------------------------------------------------------------
  // 逐帧导航
  // -------------------------------------------------------------------------

  /**
   * 前进一帧
   * 无论当前状态如何，先暂停调度器再前进。
   * 到达末尾后进入 finished 状态，否则进入 paused。
   */
  function stepForward() {
    scheduler.pause()
    if (currentStepIndex.value < steps.value.length - 1) {
      currentStepIndex.value++
      if (currentStepIndex.value >= steps.value.length - 1) {
        playbackState.value = 'finished'
      } else {
        playbackState.value = 'paused'
      }
    }
  }

  /**
   * 后退一帧
   * 仅在索引 > 0 时有效，退到 0 后不再后退（保持 paused）。
   */
  function stepBackward() {
    scheduler.pause()
    if (currentStepIndex.value > 0) {
      currentStepIndex.value--
      playbackState.value = 'paused'
    }
  }

  // -------------------------------------------------------------------------
  // 速度与跳转
  // -------------------------------------------------------------------------

  /**
   * 设置播放速度并更新调度器间隔
   * @param newSpeed - 每步间隔（毫秒）
   */
  function setSpeed(newSpeed: number) {
    speed.value = newSpeed
    scheduler.setInterval(newSpeed)
  }

  /**
   * 跳转到指定步骤索引
   * 暂停调度器后设置索引，进入 paused 状态。
   * @param index - 目标步骤索引（0-based），越界时无操作
   */
  function jumpTo(index: number) {
    if (index >= 0 && index < steps.value.length) {
      scheduler.pause()
      currentStepIndex.value = index
      playbackState.value = 'paused'
    }
  }

  // -------------------------------------------------------------------------
  // 日志导出
  // -------------------------------------------------------------------------

  /**
   * 将当前执行记录导出为纯文本格式
   *
   * 生成的文本包含：
   * - 算法名称、执行时间、输入数据
   * - 时间/空间复杂度
   * - 每一步的描述与状态快照（JSON 序列化）
   * - 最终结果
   *
   * @param algorithmName - 算法中文名称
   * @param input          - 原始输入（用于日志头部展示）
   * @param timeComplexity - 时间复杂度描述
   * @param spaceComplexity- 空间复杂度描述
   * @returns 格式化后的纯文本日志字符串
   */
  function exportLog(algorithmName: string, input: string, timeComplexity: string, spaceComplexity: string): string {
    // 构建 ExecutionLog 结构化对象
    const log: ExecutionLog = {
      algorithmName,
      input,
      steps: steps.value.map((s, i) => ({
        step: i + 1,
        description: s.description,
        state: JSON.stringify(s.data)
      })),
      result: steps.value.length > 0 ? JSON.stringify(steps.value[steps.value.length - 1].data) : '',
      timeComplexity,
      spaceComplexity,
      timestamp: new Date().toLocaleString('zh-CN')
    }

    // 拼接为可读的纯文本格式
    let text = `算法执行日志\n`
    text += `========================================\n`
    text += `算法名称: ${log.algorithmName}\n`
    text += `执行时间: ${log.timestamp}\n`
    text += `输入数据: ${log.input}\n`
    text += `时间复杂度: ${log.timeComplexity}\n`
    text += `空间复杂度: ${log.spaceComplexity}\n`
    text += `总步骤数: ${log.steps.length}\n`
    text += `========================================\n\n`

    log.steps.forEach(s => {
      text += `[步骤 ${s.step}] ${s.description}\n`
      text += `  状态: ${s.state}\n\n`
    })

    text += `========================================\n`
    text += `最终结果: ${log.result}\n`

    return text
  }

  // 返回公共 API（Vue 组件通过 useAlgorithmStore() 解构使用）
  return {
    steps,
    currentStepIndex,
    playbackState,
    speed,
    currentStep,
    totalSteps,
    progress,
    loadSteps,
    play,
    pause,
    stop,
    stepForward,
    stepBackward,
    setSpeed,
    jumpTo,
    exportLog
  }
})
