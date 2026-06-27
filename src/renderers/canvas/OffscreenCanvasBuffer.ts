type BufferedCanvas = OffscreenCanvas | HTMLCanvasElement
type BufferedContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

function createBufferedCanvas(width: number, height: number): BufferedCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export class OffscreenCanvasBuffer {
  private canvas: BufferedCanvas
  private ctx: BufferedContext
  private width = 1
  private height = 1

  constructor(width = 1, height = 1) {
    this.canvas = createBufferedCanvas(width, height)
    const context = this.canvas.getContext('2d') as BufferedContext | null
    if (!context) throw new Error('无法创建离屏 Canvas 上下文')
    this.ctx = context
    this.resize(width, height)
  }

  get context(): BufferedContext {
    return this.ctx
  }

  resize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.floor(width))
    const nextHeight = Math.max(1, Math.floor(height))
    if (nextWidth === this.width && nextHeight === this.height) return

    this.width = nextWidth
    this.height = nextHeight
    this.canvas.width = nextWidth
    this.canvas.height = nextHeight
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  paintTo(target: CanvasRenderingContext2D): void {
    target.drawImage(this.canvas, 0, 0)
  }
}
