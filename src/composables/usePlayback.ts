import { computed, onBeforeUnmount, ref, type Ref } from 'vue'
import type { AlgorithmStep, PlaybackState } from '../types'
import { AnimationScheduler } from '../utils/AnimationScheduler'

export interface UsePlaybackOptions {
  initialSpeed?: number
  autoResetOnFinish?: boolean
}

export function usePlayback<TStep extends AlgorithmStep>(
  steps: Ref<TStep[]>,
  options: UsePlaybackOptions = {},
) {
  const scheduler = new AnimationScheduler()
  const state = ref<PlaybackState>('idle')
  const currentIndex = ref(-1)
  const speed = ref(options.initialSpeed ?? 500)

  const total = computed(() => steps.value.length)
  const currentStep = computed(() => {
    if (currentIndex.value < 0 || currentIndex.value >= steps.value.length) return null
    return steps.value[currentIndex.value]
  })
  const progress = computed(() => (total.value === 0 ? 0 : ((currentIndex.value + 1) / total.value) * 100))

  function finish(): void {
    scheduler.stop()
    state.value = 'finished'
  }

  function nextInternal(): void {
    if (currentIndex.value >= steps.value.length - 1) {
      finish()
      return
    }
    currentIndex.value += 1
  }

  function play(): void {
    if (!steps.value.length) return
    if (state.value === 'finished' && options.autoResetOnFinish !== false) currentIndex.value = -1
    if (currentIndex.value < 0) currentIndex.value = 0
    state.value = 'playing'
    scheduler.start(speed.value, nextInternal)
  }

  function pause(): void {
    scheduler.pause()
    state.value = 'paused'
  }

  function stop(): void {
    scheduler.stop()
    currentIndex.value = -1
    state.value = 'idle'
  }

  function next(): void {
    scheduler.pause()
    nextInternal()
    if (state.value !== 'finished') state.value = 'paused'
  }

  function prev(): void {
    scheduler.pause()
    if (currentIndex.value > 0) currentIndex.value -= 1
    state.value = 'paused'
  }

  function seek(index: number): void {
    if (!steps.value.length) return
    currentIndex.value = Math.min(Math.max(index, 0), steps.value.length - 1)
    state.value = 'paused'
  }

  function setSpeed(ms: number): void {
    speed.value = Math.min(Math.max(ms, 50), 2000)
    scheduler.setInterval(speed.value)
  }

  onBeforeUnmount(() => scheduler.stop())

  return {
    state,
    currentIndex,
    speed,
    total,
    currentStep,
    progress,
    play,
    pause,
    stop,
    next,
    prev,
    seek,
    setSpeed,
  }
}
