/**
 * 小型对象池，用于粒子、临时坐标等高频对象复用，降低动画期间 GC 压力。
 */
export class ObjectPool<T extends object> {
  private readonly free: T[] = []
  private readonly create: () => T
  private readonly reset: (item: T) => void
  private readonly maxSize: number

  constructor(
    create: () => T,
    reset: (item: T) => void,
    maxSize = 500,
  ) {
    this.create = create
    this.reset = reset
    this.maxSize = maxSize
  }

  acquire(): T {
    return this.free.pop() ?? this.create()
  }

  release(item: T): void {
    if (this.free.length >= this.maxSize) return
    this.reset(item)
    this.free.push(item)
  }

  clear(): void {
    this.free.length = 0
  }
}
