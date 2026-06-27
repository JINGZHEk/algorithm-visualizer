import type { AlgorithmStep } from '../../types'
import { BaseCanvasRenderer } from './BaseCanvasRenderer'

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

export class SortingCanvasRenderer extends BaseCanvasRenderer<AlgorithmStep<number[]>> {
  render(step: AlgorithmStep<number[]> | null): void {
    if (!this.ctx) return
    this.clear()
    this.drawStaticLayer()

    if (!step) {
      this.ctx.fillStyle = '#a9b2d6'
      this.ctx.font = '16px Microsoft YaHei'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('等待算法执行...', this.width / 2, this.height / 2)
      return
    }

    const data = step.data
    const n = data.length
    const padding = 42
    const gap = 6
    const barWidth = Math.min(64, (this.width - padding * 2) / n - gap)
    const totalWidth = n * (barWidth + gap) - gap
    const startX = (this.width - totalWidth) / 2
    const maxVal = Math.max(...data.map((item) => Math.abs(item)), 1)
    const barAreaHeight = Math.max(80, this.height - padding * 3)

    this.drawLegend()

    for (let index = 0; index < n; index += 1) {
      const value = data[index]
      const barHeight = (Math.abs(value) / maxVal) * barAreaHeight
      const x = startX + index * (barWidth + gap)
      const y = this.height - padding - barHeight

      this.ctx.fillStyle = this.resolveColor(index, step)
      this.ctx.shadowColor = this.ctx.fillStyle
      this.ctx.shadowBlur = step.swapping?.includes(index) ? 18 : 8
      drawRoundRect(this.ctx, x, y, barWidth, barHeight, 6)
      this.ctx.fill()
      this.ctx.shadowBlur = 0

      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = `${Math.max(10, Math.min(14, barWidth - 4))}px Consolas`
      this.ctx.textAlign = 'center'
      this.ctx.fillText(String(value), x + barWidth / 2, y - 8)

      this.ctx.fillStyle = '#6b76a3'
      this.ctx.font = '10px Consolas'
      this.ctx.fillText(String(index), x + barWidth / 2, this.height - padding + 16)
    }
  }

  private resolveColor(index: number, step: AlgorithmStep<number[]>): string {
    if (step.sorted?.includes(index)) return '#34d399'
    if (step.swapping?.includes(index)) return '#fb7185'
    if (step.comparing?.includes(index)) return '#fbbf24'
    if (step.highlights?.includes(index)) return '#38bdf8'
    return '#22d3ee'
  }

  private drawLegend(): void {
    if (!this.ctx) return
    const legends = [
      ['#22d3ee', '未排序'],
      ['#fbbf24', '比较'],
      ['#fb7185', '交换'],
      ['#34d399', '已排序'],
    ] as const

    let x = 20
    const y = 20
    this.ctx.font = '12px Microsoft YaHei'
    for (const [color, label] of legends) {
      this.ctx.fillStyle = color
      drawRoundRect(this.ctx, x, y, 12, 12, 3)
      this.ctx.fill()
      this.ctx.fillStyle = '#e0e7ff'
      this.ctx.fillText(label, x + 36, y + 10)
      x += 78
    }
  }
}
