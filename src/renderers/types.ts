import type { AlgorithmStep, AlgorithmType, RendererBackend } from '../types'

export interface RendererMountOptions {
  container: HTMLElement
  canvas?: HTMLCanvasElement | null
}

export interface VisualRenderer<TStep extends AlgorithmStep = AlgorithmStep> {
  readonly backend: RendererBackend
  mount(options: RendererMountOptions): void
  render(step: TStep | null): void
  resize(): void
  destroy(): void
}

export interface RendererFactoryOptions {
  algorithm: AlgorithmType | 'sorting'
  backend: RendererBackend
}
