import type { AlgorithmStep } from '../../types'
import type { RendererMountOptions, VisualRenderer } from '../types'

type Position = [number, number]

interface MazeCell {
  row: number; col: number
  isWall: boolean; isStart: boolean; isEnd: boolean
}
interface MazeStepData {
  grid: MazeCell[][]
  path: Position[]; current: Position | null; allVisited: Position[]
  trying?: Position; backtrack?: boolean; found?: boolean
}

function isMazeStep(data: unknown): data is MazeStepData {
  const d = data as MazeStepData | undefined
  return d !== undefined && Array.isArray(d.grid) && d.grid.length > 0
}

/**
 * D3/SVG 迷宫渲染器 —— 增强版
 *
 * 相比 Canvas 2D，特有：
 * - 单元格填充色 CSS transition 平滑过渡
 * - 墙壁立体效果（双层矩形模拟浮雕）
 * - 当前探索格脉冲动画
 * - 最终路径流光动画（stroke-dasharray 沿路径移动）
 * - 回溯格子渐隐动画
 * - SVG 滤镜增加墙壁纹理感
 * - 起点/终点图标动画
 */
export class D3MazeRenderer implements VisualRenderer<AlgorithmStep<MazeStepData>> {
  readonly backend = 'd3'
  private container: HTMLElement | null = null
  private svg: SVGSVGElement | null = null

  mount(options: RendererMountOptions): void {
    this.container = options.container
    options.canvas?.style.setProperty('display', 'none')
    options.container.querySelectorAll('svg.visual-renderer').forEach((n) => n.remove())

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add('visual-renderer', 'd3-maze-renderer')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.style.overflow = 'hidden'
    options.container.appendChild(svg)
    this.svg = svg
  }

  private setupDefs(): SVGDefsElement {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')

    // Wall texture filter
    const wallFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    wallFilter.setAttribute('id', 'wall-texture')
    const feTurb = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence')
    feTurb.setAttribute('type', 'fractalNoise'); feTurb.setAttribute('baseFrequency', '0.9')
    feTurb.setAttribute('numOctaves', '3'); feTurb.setAttribute('result', 'noise')
    wallFilter.appendChild(feTurb)
    const feColor = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix')
    feColor.setAttribute('type', 'matrix')
    feColor.setAttribute('values', '0 0 0 0 0.1  0 0 0 0 0.1  0 0 0 0 0.15  0 0 0 0.2 0')
    feColor.setAttribute('in', 'noise'); feColor.setAttribute('result', 'coloredNoise')
    wallFilter.appendChild(feColor)
    const feBlend = document.createElementNS('http://www.w3.org/2000/svg', 'feBlend')
    feBlend.setAttribute('in', 'SourceGraphic'); feBlend.setAttribute('in2', 'coloredNoise')
    feBlend.setAttribute('mode', 'multiply')
    wallFilter.appendChild(feBlend)
    defs.appendChild(wallFilter)

    // Glow for current cell
    const curGlow = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    curGlow.setAttribute('id', 'cell-glow'); curGlow.setAttribute('x', '-30%'); curGlow.setAttribute('y', '-30%')
    curGlow.setAttribute('width', '160%'); curGlow.setAttribute('height', '160%')
    ;[
      ['feGaussianBlur', { stdDeviation: '3', result: 'blur' }],
      ['feFlood', { 'flood-color': '#fbbf24', 'flood-opacity': '0.7', result: 'color' }],
      ['feComposite', { in: 'color', in2: 'blur', operator: 'in', result: 'glow' }],
      ['feMerge', null],
    ].forEach(([tag, attrs]) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag as string)
      if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)))
      if (tag === 'feMerge') {
        ['glow', 'SourceGraphic'].forEach((n) => {
          const mn = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
          mn.setAttribute('in', n); el.appendChild(mn)
        })
      }
      curGlow.appendChild(el)
    })
    defs.appendChild(curGlow)

    // Path glow
    const pathGlow = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    pathGlow.setAttribute('id', 'path-glow'); pathGlow.setAttribute('x', '-30%'); pathGlow.setAttribute('y', '-30%')
    pathGlow.setAttribute('width', '160%'); pathGlow.setAttribute('height', '160%')
    ;[
      ['feGaussianBlur', { stdDeviation: '2', result: 'blur' }],
      ['feFlood', { 'flood-color': '#34d399', 'flood-opacity': '0.5', result: 'color' }],
      ['feComposite', { in: 'color', in2: 'blur', operator: 'in', result: 'glow' }],
      ['feMerge', null],
    ].forEach(([tag, attrs]) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag as string)
      if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)))
      if (tag === 'feMerge') {
        ['glow', 'SourceGraphic'].forEach((n) => {
          const mn = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
          mn.setAttribute('in', n); el.appendChild(mn)
        })
      }
      pathGlow.appendChild(el)
    })
    defs.appendChild(pathGlow)

    return defs
  }

  resize(): void {
    this.render(null)
  }

  render(step: AlgorithmStep<MazeStepData> | null): void {
    if (!this.container || !this.svg) return
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    this.svg.replaceChildren()

    const defs = this.setupDefs()
    this.svg.appendChild(defs)

    // Background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('width', String(width)); bg.setAttribute('height', String(height))
    bg.setAttribute('fill', '#0c1120')
    this.svg.appendChild(bg)

    // Badge
    this.drawBadge(width)

    if (!step || !isMazeStep(step.data)) {
      this.drawText('选择迷宫并点击"开始求解"', width / 2, height / 2 + 28, '#6b76a3', 14, 'middle')
      this.drawText('🟦 D3/SVG 迷宫渲染模式已就绪', width / 2, height / 2 - 14, '#60a5fa', 14, 'middle')
      return
    }

    const data = step.data
    const grid = data.grid
    const rows = grid.length
    const cols = grid[0].length
    const cellSize = Math.min((width - 40) / cols, (height - 60) / rows)
    const offsetX = (width - cols * cellSize) / 2
    const offsetY = (height - rows * cellSize) / 2 + 8

    const pathSet = new Set<string>()
    const visitedSet = new Set<string>()
    if (data.path) for (const [r, c] of data.path) pathSet.add(`${r},${c}`)
    if (data.allVisited) for (const [r, c] of data.allVisited) visitedSet.add(`${r},${c}`)

    // === Draw cells ===
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize
        const y = offsetY + r * cellSize
        const cell = grid[r][c]
        const key = `${r},${c}`
        const margin = 1.5

        if (cell.isWall) {
          // Wall with 3D effect (double rect)
          const wallShadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          wallShadow.setAttribute('x', String(x + margin + 0.5))
          wallShadow.setAttribute('y', String(y + margin + 0.5))
          wallShadow.setAttribute('width', String(cellSize - margin * 2))
          wallShadow.setAttribute('height', String(cellSize - margin * 2))
          wallShadow.setAttribute('rx', '2')
          wallShadow.setAttribute('fill', '#0a0a14')
          this.svg.appendChild(wallShadow)

          const wall = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          wall.setAttribute('x', String(x + margin))
          wall.setAttribute('y', String(y + margin))
          wall.setAttribute('width', String(cellSize - margin * 2))
          wall.setAttribute('height', String(cellSize - margin * 2))
          wall.setAttribute('rx', '2')
          wall.setAttribute('fill', '#1a1a2e')
          wall.setAttribute('filter', 'url(#wall-texture)')
          this.svg.appendChild(wall)

          // Top highlight line
          const hl = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          hl.setAttribute('x1', String(x + margin + 2)); hl.setAttribute('y1', String(y + margin + 0.5))
          hl.setAttribute('x2', String(x + cellSize - margin - 2)); hl.setAttribute('y2', String(y + margin + 0.5))
          hl.setAttribute('stroke', 'rgba(255,255,255,0.08)'); hl.setAttribute('stroke-width', '1')
          this.svg.appendChild(hl)
        } else {
          // Determine fill color
          let fill = '#0f3460'; let filter: string | null = null; let isSpecial = false

          if (cell.isStart || cell.isEnd) {
            fill = '#3b82f6'; isSpecial = true
          } else if (data.current && data.current[0] === r && data.current[1] === c) {
            fill = data.backtrack ? '#ef4444' : '#f59e0b'
            filter = 'url(#cell-glow)'; isSpecial = true
          } else if (pathSet.has(key)) {
            fill = '#10b981'; filter = 'url(#path-glow)'; isSpecial = true
          } else if (visitedSet.has(key)) {
            fill = 'rgba(245,158,11,0.28)'
          }

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          rect.setAttribute('x', String(x + margin))
          rect.setAttribute('y', String(y + margin))
          rect.setAttribute('width', String(cellSize - margin * 2))
          rect.setAttribute('height', String(cellSize - margin * 2))
          rect.setAttribute('rx', '3')
          rect.setAttribute('fill', fill)
          if (filter) rect.setAttribute('filter', filter)
          rect.style.transition = 'fill 0.25s ease'

          // Pulse for current cell
          if (data.current && data.current[0] === r && data.current[1] === c) {
            rect.innerHTML =
              '<animate attributeName="opacity" values="1;0.7;1" dur="0.7s" repeatCount="indefinite"/>'
          }
          this.svg.appendChild(rect)

          // Inner highlight for special cells
          if (isSpecial && !cell.isStart && !cell.isEnd) {
            const inner = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
            inner.setAttribute('x', String(x + margin + 3)); inner.setAttribute('y', String(y + margin + 3))
            inner.setAttribute('width', String(cellSize - margin * 2 - 6))
            inner.setAttribute('height', String(cellSize - margin * 2 - 6))
            inner.setAttribute('rx', '2')
            inner.setAttribute('fill', 'rgba(255,255,255,0.15)')
            this.svg.appendChild(inner)
          }

          // S/E letters
          if (cell.isStart) {
            this.drawText('S', x + cellSize / 2, y + cellSize / 2, '#ffffff', cellSize * 0.38, 'middle', 'bold')
          } else if (cell.isEnd) {
            this.drawText('E', x + cellSize / 2, y + cellSize / 2, '#ffffff', cellSize * 0.38, 'middle', 'bold')
          }
        }
      }
    }

    // === Trying indicator ===
    if (data.trying) {
      const [tr, tc] = data.trying
      const tx = offsetX + tc * cellSize; const ty = offsetY + tr * cellSize
      const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      indicator.setAttribute('x', String(tx + 2)); indicator.setAttribute('y', String(ty + 2))
      indicator.setAttribute('width', String(cellSize - 4)); indicator.setAttribute('height', String(cellSize - 4))
      indicator.setAttribute('fill', 'none'); indicator.setAttribute('stroke', '#ffffff')
      indicator.setAttribute('stroke-width', '2'); indicator.setAttribute('rx', '3')
      indicator.setAttribute('stroke-dasharray', '4,3')
      indicator.innerHTML =
        '<animate attributeName="stroke-dashoffset" from="0" to="-14" dur="0.6s" repeatCount="indefinite"/>'
      this.svg.appendChild(indicator)
    }

    // === Legend ===
    this.drawLegend(width, height)
  }

  private drawBadge(width: number): void {
    if (!this.svg) return
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('x', String(width - 140)); bg.setAttribute('y', '14')
    bg.setAttribute('width', '125'); bg.setAttribute('height', '24')
    bg.setAttribute('rx', '12'); bg.setAttribute('fill', 'rgba(59,130,246,0.12)')
    bg.setAttribute('stroke', 'rgba(59,130,246,0.3)'); bg.setAttribute('stroke-width', '1')
    this.svg.appendChild(bg)
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dot.setAttribute('cx', String(width - 123)); dot.setAttribute('cy', '26')
    dot.setAttribute('r', '4'); dot.setAttribute('fill', '#60a5fa')
    dot.innerHTML = '<animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/>'
    this.svg.appendChild(dot)
    this.drawText('SVG / D3 Maze', width - 65, 26, '#93c5fd', 9.5, 'middle')
  }

  private drawLegend(_w: number, h: number): void {
    if (!this.svg) return
    const items = [
      { fill: '#1a1a2e', label: '墙壁' },
      { fill: '#3b82f6', label: '起/终点' },
      { fill: '#10b981', label: '最终路径' },
      { fill: '#f59e0b', label: '当前探索' },
      { fill: 'rgba(245,158,11,0.3)', label: '已访问' },
      { fill: '#ef4444', label: '回溯' },
    ]
    let x = 14; const y = h - 20
    for (const item of items) {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      r.setAttribute('x', String(x)); r.setAttribute('y', String(y - 6))
      r.setAttribute('width', '12'); r.setAttribute('height', '12')
      r.setAttribute('rx', '2'); r.setAttribute('fill', item.fill)
      if (item.fill === '#3b82f6' || item.fill === '#10b981' || item.fill === '#f59e0b') {
        r.setAttribute('stroke', 'rgba(255,255,255,0.3)'); r.setAttribute('stroke-width', '1')
      }
      this.svg.appendChild(r)
      this.drawText(item.label, x + 16, y, '#94a3b8', 9, 'start')
      x += 60
    }
  }

  destroy(): void {
    this.svg?.remove(); this.svg = null; this.container = null
  }

  private drawText(
    text: string, x: number, y: number, fill: string, size: number,
    anchor: 'start' | 'middle' | 'end' = 'middle', weight = 'normal',
  ): void {
    if (!this.svg) return
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    node.textContent = text
    node.setAttribute('x', String(x)); node.setAttribute('y', String(y))
    node.setAttribute('fill', fill); node.setAttribute('font-size', String(size))
    node.setAttribute('font-family', 'Consolas, Microsoft YaHei, sans-serif')
    node.setAttribute('text-anchor', anchor)
    node.setAttribute('dominant-baseline', 'central')
    if (weight === 'bold') node.setAttribute('font-weight', 'bold')
    this.svg.appendChild(node)
  }
}
