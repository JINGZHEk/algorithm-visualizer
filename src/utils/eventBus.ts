import type { AlgorithmStep, AlgorithmType } from '../types'

export interface AppEvents {
  'playback:step-changed': { index: number; step: AlgorithmStep }
  'playback:finished': { algorithmId: AlgorithmType }
  'renderer:resized': { width: number; height: number }
  'log:exported': { filename: string }
  'ai:open': { source: 'nav' | 'floating' | 'shortcut' }
  'ai:error': { message: string }
}

type EventHandler<T> = (payload: T) => void

class EventBusImpl {
  private handlers = new Map<string, Set<EventHandler<unknown>>>()

  emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
    const set = this.handlers.get(event)
    if (!set) return
    for (const handler of set) {
      try {
        ;(handler as EventHandler<AppEvents[K]>)(payload)
      } catch {
        /* 避免一个处理器报错影响其他处理器 */
      }
    }
  }

  on<K extends keyof AppEvents>(event: K, handler: EventHandler<AppEvents[K]>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>)
  }

  off<K extends keyof AppEvents>(event: K, handler: EventHandler<AppEvents[K]>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>)
  }

  removeAll(): void {
    this.handlers.clear()
  }
}

export const eventBus = new EventBusImpl()
