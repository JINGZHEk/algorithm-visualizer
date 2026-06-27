export interface PerformanceSnapshot {
  fps: number
  frameTime: number
  usedJSHeapSize?: number
}

interface MemoryLikePerformance extends Performance {
  memory?: {
    usedJSHeapSize: number
  }
}

export class PerformanceMonitor {
  private last = performance.now()
  private frames = 0
  private fps = 0
  private frameTime = 0

  markFrame(): PerformanceSnapshot {
    const now = performance.now()
    this.frames += 1
    this.frameTime = now - this.last

    if (now - this.last >= 1000) {
      this.fps = Math.round((this.frames * 1000) / (now - this.last))
      this.frames = 0
      this.last = now
    }

    return this.snapshot()
  }

  snapshot(): PerformanceSnapshot {
    const memory = (performance as MemoryLikePerformance).memory
    return {
      fps: this.fps,
      frameTime: this.frameTime,
      usedJSHeapSize: memory?.usedJSHeapSize,
    }
  }
}
