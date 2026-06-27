export type FrameTick = (frame: { now: number; delta: number; elapsed: number }) => void

/**
 * requestAnimationFrame 驱动的步进调度器。
 * 与 setTimeout 相比，它会跟随浏览器刷新节奏暂停/恢复，减少隐藏标签页和低端设备上的抖动。
 */
export class AnimationScheduler {
  private rafId: number | null = null
  private lastFrameAt = 0
  private elapsed = 0
  private accumulator = 0
  private intervalMs = 500
  private tick: FrameTick | null = null

  get running(): boolean {
    return this.rafId !== null
  }

  start(intervalMs: number, tick: FrameTick): void {
    this.stop()
    this.intervalMs = intervalMs
    this.tick = tick
    this.lastFrameAt = performance.now()
    this.elapsed = 0
    this.accumulator = 0
    this.rafId = requestAnimationFrame(this.loop)
  }

  setInterval(intervalMs: number): void {
    this.intervalMs = Math.max(16, intervalMs)
  }

  pause(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  stop(): void {
    this.pause()
    this.tick = null
    this.lastFrameAt = 0
    this.elapsed = 0
    this.accumulator = 0
  }

  private readonly loop = (now: number): void => {
    if (!this.tick) return

    const delta = Math.min(now - this.lastFrameAt, 120)
    this.lastFrameAt = now
    this.elapsed += delta
    this.accumulator += delta

    if (this.accumulator >= this.intervalMs) {
      this.accumulator %= this.intervalMs
      this.tick({ now, delta, elapsed: this.elapsed })
    }

    this.rafId = requestAnimationFrame(this.loop)
  }
}
