import type { AlgorithmStep } from '../../types'
import type { RendererMountOptions, VisualRenderer } from '../types'
import { OffscreenCanvasBuffer } from './OffscreenCanvasBuffer'

export abstract class BaseCanvasRenderer<TStep extends AlgorithmStep = AlgorithmStep>
  implements VisualRenderer<TStep>
{
  readonly backend = 'canvas'
  protected container: HTMLElement | null = null
  protected canvas: HTMLCanvasElement | null = null
  protected ctx: CanvasRenderingContext2D | null = null
  protected width = 0
  protected height = 0
  protected dpr = 1
  protected staticLayer = new OffscreenCanvasBuffer()

  mount(options: RendererMountOptions): void {
    this.container = options.container
    this.canvas = options.canvas ?? options.container.querySelector('canvas') ?? document.createElement('canvas')
    if (!this.canvas.parentElement) options.container.appendChild(this.canvas)
    this.canvas.style.display = 'block'
    options.container.querySelectorAll('svg.visual-renderer').forEach((node) => node.remove())

    const context = this.canvas.getContext('2d')
    if (!context) throw new Error('无法创建 Canvas 2D 上下文')
    this.ctx = context
    this.resize()
  }

  resize(): void {
    if (!this.container || !this.canvas) return
    this.dpr = window.devicePixelRatio || 1
    this.width = this.container.clientWidth
    this.height = this.container.clientHeight
    this.canvas.width = Math.max(1, Math.floor(this.width * this.dpr))
    this.canvas.height = Math.max(1, Math.floor(this.height * this.dpr))
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.staticLayer.resize(this.canvas.width, this.canvas.height)
    this.paintStaticLayer()
  }

  destroy(): void {
    this.container = null
    this.canvas = null
    this.ctx = null
  }

  protected clear(): void {
    if (!this.ctx) return
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  protected paintStaticLayer(): void {
    const ctx = this.staticLayer.context
    this.staticLayer.clear()
    ctx.save()
    ctx.scale(this.dpr, this.dpr)
    const gradient = ctx.createRadialGradient(this.width / 2, 0, 0, this.width / 2, 0, this.width)
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.18)')
    gradient.addColorStop(1, 'rgba(14, 17, 36, 0)')
    ctx.fillStyle = '#0e1124'
    ctx.fillRect(0, 0, this.width, this.height)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)
    ctx.restore()
  }

  protected drawStaticLayer(): void {
    if (!this.ctx) return
    this.ctx.save()
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.staticLayer.paintTo(this.ctx)
    this.ctx.restore()
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  abstract render(step: TStep | null): void
}
