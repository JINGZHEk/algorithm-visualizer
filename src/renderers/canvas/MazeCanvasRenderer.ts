import type { AlgorithmStep } from '../../types'
import { BaseCanvasRenderer } from './BaseCanvasRenderer'

type Position = [number, number]

interface MazeCell {
  row: number
  col: number
  isWall: boolean
  isStart: boolean
  isEnd: boolean
}

interface MazeStepData {
  grid: MazeCell[][]
  visited: boolean[][]
  path: Position[]
  current: Position | null
  allVisited: Position[]
  trying?: Position
  backtrack?: boolean
  found?: boolean
}

function isMazeStep(data: unknown): data is MazeStepData {
  const d = data as MazeStepData | undefined
  return d !== undefined && Array.isArray(d.grid) && d.grid.length > 0
}

export class MazeCanvasRenderer extends BaseCanvasRenderer<AlgorithmStep<MazeStepData>> {
  render(step: AlgorithmStep<MazeStepData> | null): void {
    if (!this.ctx) return
    this.clear()
    this.drawStaticLayer()

    if (!step || !isMazeStep(step.data)) {
      this.ctx.fillStyle = '#a9b2d6'
      this.ctx.font = '16px Microsoft YaHei'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('等待算法执行...', this.width / 2, this.height / 2)
      return
    }

    const data = step.data
    const grid = data.grid
    const rows = grid.length
    const cols = grid[0].length
    const cellSize = Math.min((this.width - 40) / cols, (this.height - 40) / rows)
    const offsetX = (this.width - cols * cellSize) / 2
    const offsetY = (this.height - rows * cellSize) / 2

    const pathSet = new Set<string>()
    const visitedSet = new Set<string>()
    if (data.path) {
      for (const [r, c] of data.path) pathSet.add(`${r},${c}`)
    }
    if (data.allVisited) {
      for (const [r, c] of data.allVisited) visitedSet.add(`${r},${c}`)
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize
        const y = offsetY + r * cellSize
        const cell = grid[r][c]
        const key = `${r},${c}`

        if (cell.isWall) {
          this.ctx.fillStyle = '#1a1a2e'
        } else if (cell.isStart || cell.isEnd) {
          this.ctx.fillStyle = '#00d4ff'
        } else if (data.current && data.current[0] === r && data.current[1] === c) {
          this.ctx.fillStyle = data.backtrack ? '#f56c6c' : '#e6a23c'
        } else if (pathSet.has(key)) {
          this.ctx.fillStyle = '#67c23a'
        } else if (visitedSet.has(key)) {
          this.ctx.fillStyle = 'rgba(230, 162, 60, 0.3)'
        } else {
          this.ctx.fillStyle = '#0f3460'
        }

        this.ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)

        if (cell.isStart) {
          this.ctx.fillStyle = '#ffffff'
          this.ctx.font = `${cellSize * 0.4}px Microsoft YaHei`
          this.ctx.textAlign = 'center'
          this.ctx.textBaseline = 'middle'
          this.ctx.fillText('S', x + cellSize / 2, y + cellSize / 2)
        } else if (cell.isEnd) {
          this.ctx.fillStyle = '#ffffff'
          this.ctx.font = `${cellSize * 0.4}px Microsoft YaHei`
          this.ctx.textAlign = 'center'
          this.ctx.textBaseline = 'middle'
          this.ctx.fillText('E', x + cellSize / 2, y + cellSize / 2)
        }
      }
    }

    // Draw trying indicator
    if (data.trying) {
      const [tr, tc] = data.trying
      const x = offsetX + tc * cellSize
      const y = offsetY + tr * cellSize
      this.ctx.strokeStyle = '#ffffff'
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4)
    }
  }
}
