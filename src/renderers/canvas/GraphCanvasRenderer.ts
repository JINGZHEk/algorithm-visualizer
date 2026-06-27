import type { AlgorithmStep } from '../../types'
import { BaseCanvasRenderer } from './BaseCanvasRenderer'

function isDijkstraStep(data: unknown): data is DijkstraStepData {
  const d = data as DijkstraStepData | undefined
  return d !== undefined && d.graph !== undefined && d.dist !== undefined
}

interface DijkstraStepData {
  dist: number[]
  visited: boolean[]
  prev: number[]
  current: number
  checking?: number
  updated?: number
  edge?: { from: number; to: number; weight: number }
  graph: {
    nodes: { id: number; label: string; x: number; y: number }[]
    edges: { from: number; to: number; weight: number }[]
  }
}

export class GraphCanvasRenderer extends BaseCanvasRenderer<AlgorithmStep<DijkstraStepData>> {
  render(step: AlgorithmStep<DijkstraStepData> | null): void {
    if (!this.ctx) return
    this.clear()
    this.drawStaticLayer()

    if (!step || !isDijkstraStep(step.data)) {
      this.ctx.fillStyle = '#a9b2d6'
      this.ctx.font = '16px Microsoft YaHei'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('等待算法执行...', this.width / 2, this.height / 2)
      return
    }

    const data = step.data
    const graph = data.graph
    const scaleX = this.width / 600
    const scaleY = this.height / 400

    // Draw edges
    for (const edge of graph.edges) {
      const from = graph.nodes[edge.from]
      const to = graph.nodes[edge.to]
      if (!from || !to) continue
      const x1 = from.x * scaleX
      const y1 = from.y * scaleY
      const x2 = to.x * scaleX
      const y2 = to.y * scaleY

      this.ctx.beginPath()
      this.ctx.moveTo(x1, y1)
      this.ctx.lineTo(x2, y2)

      const isActiveEdge =
        data.edge &&
        ((data.edge.from === edge.from && data.edge.to === edge.to) ||
          (data.edge.from === edge.to && data.edge.to === edge.from))

      if (isActiveEdge) {
        this.ctx.strokeStyle = '#e6a23c'
        this.ctx.lineWidth = 3
      } else {
        this.ctx.strokeStyle = '#2a4a7f'
        this.ctx.lineWidth = 2
      }
      this.ctx.stroke()

      // Weight label
      const mx = (x1 + x2) / 2
      const my = (y1 + y2) / 2
      this.ctx.fillStyle = '#0d1117'
      this.ctx.fillRect(mx - 12, my - 9, 24, 18)
      this.ctx.fillStyle = '#e6a23c'
      this.ctx.font = '12px Consolas'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(String(edge.weight), mx, my)
    }

    // Draw nodes
    for (const node of graph.nodes) {
      const x = node.x * scaleX
      const y = node.y * scaleY
      const radius = 24

      this.ctx.beginPath()
      this.ctx.arc(x, y, radius, 0, Math.PI * 2)

      if (data.current === node.id) {
        this.ctx.fillStyle = '#e6a23c'
      } else if (data.checking === node.id || data.updated === node.id) {
        this.ctx.fillStyle = '#409eff'
      } else if (data.visited?.[node.id]) {
        this.ctx.fillStyle = '#67c23a'
      } else {
        this.ctx.fillStyle = '#0f3460'
      }
      this.ctx.fill()
      this.ctx.strokeStyle = '#00d4ff'
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = 'bold 14px Consolas'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(node.label, x, y)

      // Distance label
      if (data.dist) {
        const d = data.dist[node.id]
        this.ctx.font = '11px Consolas'
        this.ctx.fillStyle = '#00d4ff'
        this.ctx.fillText(d === Infinity ? '∞' : String(d), x, y + radius + 14)
      }
    }
  }
}
