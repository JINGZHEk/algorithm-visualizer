import type { AlgorithmStep } from '../../types'
import { BaseCanvasRenderer } from './BaseCanvasRenderer'

interface HuffmanNode {
  id: number
  char: string
  freq: number
  left: HuffmanNode | null
  right: HuffmanNode | null
}

interface HuffmanStepData {
  nodes?: HuffmanNode[]
  tree?: HuffmanNode | null
  queue?: { char: string; freq: number }[]
  codes?: Record<string, string>
  merging?: [HuffmanNode, HuffmanNode]
}

function isHuffmanStep(data: unknown): data is HuffmanStepData {
  const d = data as HuffmanStepData | undefined
  return d !== undefined && (d.nodes !== undefined || d.tree !== undefined || d.queue !== undefined)
}

export class TreeCanvasRenderer extends BaseCanvasRenderer<AlgorithmStep<HuffmanStepData>> {
  private drawTree(
    ctx: CanvasRenderingContext2D,
    node: HuffmanNode | null,
    x: number,
    y: number,
    spread: number,
  ): void {
    if (!node) return
    const radius = 20

    if (node.left) {
      const childX = x - spread
      const childY = y + 60
      ctx.beginPath()
      ctx.moveTo(x, y + radius)
      ctx.lineTo(childX, childY - radius)
      ctx.strokeStyle = '#2a4a7f'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#67c23a'
      ctx.font = '11px Consolas'
      ctx.textAlign = 'center'
      ctx.fillText('0', (x + childX) / 2 - 8, (y + childY) / 2)
      this.drawTree(ctx, node.left, childX, childY, spread / 2)
    }

    if (node.right) {
      const childX = x + spread
      const childY = y + 60
      ctx.beginPath()
      ctx.moveTo(x, y + radius)
      ctx.lineTo(childX, childY - radius)
      ctx.strokeStyle = '#2a4a7f'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#f56c6c'
      ctx.font = '11px Consolas'
      ctx.textAlign = 'center'
      ctx.fillText('1', (x + childX) / 2 + 8, (y + childY) / 2)
      this.drawTree(ctx, node.right, childX, childY, spread / 2)
    }

    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    const isLeaf = !node.left && !node.right
    ctx.fillStyle = isLeaf ? '#0f3460' : '#16213e'
    ctx.fill()
    ctx.strokeStyle = isLeaf ? '#00d4ff' : '#2a4a7f'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = isLeaf ? 'bold 12px Microsoft YaHei' : '11px Consolas'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(isLeaf ? node.char : String(node.freq), x, y)
    if (isLeaf) {
      ctx.font = '10px Consolas'
      ctx.fillStyle = '#a0a0a0'
      ctx.fillText(String(node.freq), x, y + radius + 12)
    }
  }

  render(step: AlgorithmStep<HuffmanStepData> | null): void {
    if (!this.ctx) return
    this.clear()
    this.drawStaticLayer()

    if (!step || !isHuffmanStep(step.data)) {
      this.ctx.fillStyle = '#a9b2d6'
      this.ctx.font = '16px Microsoft YaHei'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('等待算法执行...', this.width / 2, this.height / 2)
      return
    }

    const data = step.data

    if (data.tree) {
      this.drawTree(this.ctx, data.tree, this.width / 2, 40, this.width / 4)
    } else if (data.nodes && data.nodes.length > 0) {
      const nodes = data.nodes
      const spacing = Math.min(80, (this.width - 40) / nodes.length)
      const startX = (this.width - (nodes.length - 1) * spacing) / 2
      for (let i = 0; i < nodes.length; i++) {
        const x = startX + i * spacing
        const y = this.height / 2
        const radius = 24

        this.ctx.beginPath()
        this.ctx.arc(x, y, radius, 0, Math.PI * 2)
        // Highlight merging nodes
        const isMerging =
          data.merging &&
          (data.merging[0].id === nodes[i].id || data.merging[1].id === nodes[i].id)
        this.ctx.fillStyle = isMerging ? '#e6a23c' : '#0f3460'
        this.ctx.fill()
        this.ctx.strokeStyle = isMerging ? '#fbbf24' : '#00d4ff'
        this.ctx.lineWidth = isMerging ? 3 : 2
        this.ctx.stroke()

        this.ctx.fillStyle = '#ffffff'
        this.ctx.font = 'bold 12px Microsoft YaHei'
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillText(nodes[i].char, x, y - 6)
        this.ctx.font = '10px Consolas'
        this.ctx.fillStyle = '#a0a0a0'
        this.ctx.fillText(String(nodes[i].freq), x, y + 10)
      }
    }
  }
}
