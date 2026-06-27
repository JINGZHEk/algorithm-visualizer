import type { AlgorithmStep } from '../../types'
import type { RendererMountOptions, VisualRenderer } from '../types'

interface GraphNode {
  id: number; label: string; x: number; y: number
}
interface GraphEdge {
  from: number; to: number; weight: number
}
interface DijkstraStepData {
  dist: number[]; visited: boolean[]; current: number
  checking?: number; updated?: number
  edge?: { from: number; to: number; weight: number }
  graph: { nodes: GraphNode[]; edges: GraphEdge[] }
}

function isDijkstraStep(data: unknown): data is DijkstraStepData {
  const d = data as DijkstraStepData | undefined
  return d !== undefined && d.graph !== undefined && d.dist !== undefined
}

/**
 * D3/SVG 图算法渲染器 —— 增强版
 *
 * 相比 Canvas 2D，特有：
 * - SVG 渐变节点（径向渐变模拟 3D 球体）
 * - 边缘动画（stroke-dasharray 动画模拟路径流动）
 * - 节点发光滤镜（当前/检测/确认节点各自独立滤镜）
 * - 距离标签浮动动画（距离更新时闪烁）
 * - 脉冲动画表示当前活跃节点
 * - SVG 文本可选/可搜索
 */
export class D3GraphRenderer implements VisualRenderer<AlgorithmStep<DijkstraStepData>> {
  readonly backend = 'd3'
  private container: HTMLElement | null = null
  private svg: SVGSVGElement | null = null

  mount(options: RendererMountOptions): void {
    this.container = options.container
    options.canvas?.style.setProperty('display', 'none')
    options.container.querySelectorAll('svg.visual-renderer').forEach((n) => n.remove())

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add('visual-renderer', 'd3-graph-renderer')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.style.overflow = 'hidden'
    options.container.appendChild(svg)
    this.svg = svg
  }

  private setupDefs(): SVGDefsElement {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')

    // Radial gradients for spherical node effect
    const nodeGradients = [
      { id: 'node-unvisited', center: '#1e3a5f', edge: '#0f3460' },
      { id: 'node-current', center: '#fcd34d', edge: '#d97706' },
      { id: 'node-checking', center: '#60a5fa', edge: '#1d4ed8' },
      { id: 'node-confirmed', center: '#4ade80', edge: '#15803d' },
    ]
    for (const g of nodeGradients) {
      const grad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient')
      grad.setAttribute('id', g.id); grad.setAttribute('cx', '35%'); grad.setAttribute('cy', '35%')
      ;[
        { offset: '0%', color: g.center }, { offset: '100%', color: g.edge },
      ].forEach((s) => {
        const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
        stop.setAttribute('offset', s.offset); stop.setAttribute('stop-color', s.color)
        grad.appendChild(stop)
      })
      defs.appendChild(grad)
    }

    // Glow filters for each state
    const glows = [
      { id: 'glow-current', color: '#fbbf24', blur: '6', opacity: '0.6' },
      { id: 'glow-checking', color: '#60a5fa', blur: '5', opacity: '0.5' },
      { id: 'glow-confirmed', color: '#34d399', blur: '4', opacity: '0.4' },
    ]
    for (const g of glows) {
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
      filter.setAttribute('id', g.id)
      filter.setAttribute('x', '-60%'); filter.setAttribute('y', '-60%')
      filter.setAttribute('width', '220%'); filter.setAttribute('height', '220%')
      ;[
        ['feGaussianBlur', { stdDeviation: g.blur, result: 'blur' }],
        ['feFlood', { 'flood-color': g.color, 'flood-opacity': g.opacity, result: 'color' }],
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
        filter.appendChild(el)
      })
      defs.appendChild(filter)
    }

    // Drop shadow for nodes
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    shadow.setAttribute('id', 'node-shadow'); shadow.setAttribute('x', '-30%'); shadow.setAttribute('y', '-20%')
    shadow.setAttribute('width', '160%'); shadow.setAttribute('height', '160%')
    const feDrop = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow')
    feDrop.setAttribute('dx', '0'); feDrop.setAttribute('dy', '3')
    feDrop.setAttribute('stdDeviation', '5')
    feDrop.setAttribute('flood-color', '#000'); feDrop.setAttribute('flood-opacity', '0.4')
    shadow.appendChild(feDrop)
    defs.appendChild(shadow)

    // Grid pattern
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
    pattern.setAttribute('id', 'graph-grid'); pattern.setAttribute('width', '50'); pattern.setAttribute('height', '50')
    pattern.setAttribute('patternUnits', 'userSpaceOnUse')
    const pLine = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    pLine.setAttribute('d', 'M 50 0 L 0 0 0 50')
    pLine.setAttribute('fill', 'none'); pLine.setAttribute('stroke', 'rgba(255,255,255,0.03)')
    pLine.setAttribute('stroke-width', '1')
    pattern.appendChild(pLine)
    defs.appendChild(pattern)

    return defs
  }

  resize(): void {
    this.render(null)
  }

  render(step: AlgorithmStep<DijkstraStepData> | null): void {
    if (!this.container || !this.svg) return
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    this.svg.replaceChildren()

    const defs = this.setupDefs()
    this.svg.appendChild(defs)

    // Background layers
    const bgBase = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgBase.setAttribute('width', String(width)); bgBase.setAttribute('height', String(height))
    bgBase.setAttribute('fill', '#0c1120'); this.svg.appendChild(bgBase)
    const bgGrid = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgGrid.setAttribute('width', String(width)); bgGrid.setAttribute('height', String(height))
    bgGrid.setAttribute('fill', 'url(#graph-grid)'); this.svg.appendChild(bgGrid)

    // Mode badge
    this.drawBadge(width)

    if (!step || !isDijkstraStep(step.data)) {
      this.drawText('选择测试用例并点击"开始可视化"', width / 2, height / 2 + 28, '#6b76a3', 14, 'middle')
      this.drawText('🔷 D3/SVG 图渲染模式已就绪', width / 2, height / 2 - 12, '#2dd4bf', 14, 'middle')
      return
    }

    const data = step.data
    const graph = data.graph
    const scaleX = width / 600
    const scaleY = height / 400

    // === Draw Edges ===
    for (const edge of graph.edges) {
      const from = graph.nodes[edge.from]
      const to = graph.nodes[edge.to]
      if (!from || !to) continue

      const x1 = from.x * scaleX; const y1 = from.y * scaleY
      const x2 = to.x * scaleX; const y2 = to.y * scaleY
      const isActive = data.edge &&
        ((data.edge.from === edge.from && data.edge.to === edge.to) ||
         (data.edge.from === edge.to && data.edge.to === edge.from))

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', String(x1)); line.setAttribute('y1', String(y1))
      line.setAttribute('x2', String(x2)); line.setAttribute('y2', String(y2))
      line.setAttribute('stroke', isActive ? '#e6a23c' : 'rgba(42,74,127,0.5)')
      line.setAttribute('stroke-width', isActive ? '3' : '2')
      line.setAttribute('stroke-linecap', 'round')

      // Animated dash on active edge
      if (isActive) {
        line.setAttribute('stroke-dasharray', '8,6')
        line.innerHTML = '<animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1s" repeatCount="indefinite"/>'
      }
      this.svg.appendChild(line)

      // === Edge weight chip ===
      const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2
      const chipW = 26; const chipH = 18
      const chip = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      chip.setAttribute('x', String(mx - chipW / 2)); chip.setAttribute('y', String(my - chipH / 2))
      chip.setAttribute('width', String(chipW)); chip.setAttribute('height', String(chipH))
      chip.setAttribute('rx', '6')
      chip.setAttribute('fill', isActive ? '#e6a23c' : '#16213e')
      chip.setAttribute('stroke', isActive ? '#fbbf24' : '#2a4a7f')
      chip.setAttribute('stroke-width', '1.5')
      this.svg.appendChild(chip)

      this.drawText(String(edge.weight), mx, my, isActive ? '#000' : '#e6a23c', 11, 'middle')
    }

    // === Draw Nodes ===
    for (const node of graph.nodes) {
      const x = node.x * scaleX; const y = node.y * scaleY
      const radius = 26

      // Determine state
      let gradId = 'node-unvisited'
      let glowFilter: string | null = null
      let pulseAnimation = false

      if (data.current === node.id) {
        gradId = 'node-current'; glowFilter = 'url(#glow-current)'; pulseAnimation = true
      } else if (data.checking === node.id || data.updated === node.id) {
        gradId = 'node-checking'; glowFilter = 'url(#glow-checking)'
      } else if (data.visited?.[node.id]) {
        gradId = 'node-confirmed'; glowFilter = 'url(#glow-confirmed)'
      }

      // Shadow circle
      const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      shadow.setAttribute('cx', String(x)); shadow.setAttribute('cy', String(y + 2))
      shadow.setAttribute('r', String(radius))
      shadow.setAttribute('fill', '#000')
      shadow.setAttribute('opacity', '0.3')
      shadow.setAttribute('filter', 'url(#node-shadow)')
      this.svg.appendChild(shadow)

      // Main node circle with radial gradient
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', String(x)); circle.setAttribute('cy', String(y))
      circle.setAttribute('r', String(radius))
      circle.setAttribute('fill', `url(#${gradId})`)
      circle.setAttribute('stroke', pulseAnimation ? '#fef3c7' : 'rgba(255,255,255,0.25)')
      circle.setAttribute('stroke-width', pulseAnimation ? '3' : '1.5')
      if (glowFilter) circle.setAttribute('filter', glowFilter)
      circle.style.transition = 'all 0.3s ease'
      // Pulse animation for current node
      if (pulseAnimation) {
        circle.innerHTML =
          '<animate attributeName="stroke-width" values="3;5;3" dur="1.2s" repeatCount="indefinite"/>' +
          '<animate attributeName="stroke-opacity" values="1;0.5;1" dur="1.2s" repeatCount="indefinite"/>'
      }
      this.svg.appendChild(circle)

      // Highlight ring for current node
      if (pulseAnimation) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        ring.setAttribute('cx', String(x)); ring.setAttribute('cy', String(y))
        ring.setAttribute('r', String(radius))
        ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#fbbf24')
        ring.setAttribute('stroke-width', '2')
        ring.innerHTML =
          '<animate attributeName="r" values="' + radius + ';' + (radius + 8) + ';' + radius + '" dur="2s" repeatCount="indefinite"/>' +
          '<animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>'
        this.svg.appendChild(ring)
      }

      // === Node label ===
      this.drawText(node.label, x, y + 1, pulseAnimation ? '#1a1a1a' : '#ffffff',
        13, 'middle', 'bold')

      // === Distance label below node ===
      if (data.dist) {
        const d = data.dist[node.id]
        const distStr = d === Infinity ? '∞' : String(d)
        const distColor = data.visited?.[node.id] ? '#34d399' : '#60a5fa'

        // Distance badge
        const distW = Math.max(22, distStr.length * 8 + 12)
        const badger = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        badger.setAttribute('x', String(x - distW / 2)); badger.setAttribute('y', String(y + radius + 4))
        badger.setAttribute('width', String(distW)); badger.setAttribute('height', '18')
        badger.setAttribute('rx', '9')
        badger.setAttribute('fill', 'rgba(12,17,32,0.85)')
        badger.setAttribute('stroke', distColor); badger.setAttribute('stroke-width', '1')
        this.svg.appendChild(badger)

        this.drawText(distStr, x, y + radius + 14, distColor, 10, 'middle')

        // Checkmark
        if (data.visited?.[node.id]) {
          this.drawText('✓', x + distW / 2 - 8, y + radius + 14, '#34d399', 9, 'end')
        }

        // Flash on update
        if (data.updated === node.id) {
          badger.innerHTML =
            '<animate attributeName="opacity" values="1;0.4;1;0.4;1" dur="0.6s" fill="freeze"/>'
        }
      }
    }

    // === Legend ===
    this.drawLegend(width, height)
  }

  private drawBadge(width: number): void {
    if (!this.svg) return
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('x', String(width - 145)); bg.setAttribute('y', '14')
    bg.setAttribute('width', '130'); bg.setAttribute('height', '24')
    bg.setAttribute('rx', '12'); bg.setAttribute('fill', 'rgba(59,130,246,0.12)')
    bg.setAttribute('stroke', 'rgba(59,130,246,0.3)'); bg.setAttribute('stroke-width', '1')
    this.svg.appendChild(bg)
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dot.setAttribute('cx', String(width - 128)); dot.setAttribute('cy', '26')
    dot.setAttribute('r', '4'); dot.setAttribute('fill', '#60a5fa')
    dot.innerHTML = '<animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/>'
    this.svg.appendChild(dot)
    this.drawText('SVG / D3 Graph', width - 70, 26, '#93c5fd', 9.5, 'middle')
  }

  private drawLegend(_w: number, h: number): void {
    if (!this.svg) return
    const items = [
      { grad: 'node-unvisited', label: '未访问' },
      { grad: 'node-current', label: '当前节点' },
      { grad: 'node-checking', label: '检测/更新' },
      { grad: 'node-confirmed', label: '已确认' },
    ]
    let x = 16; const y = h - 36
    for (const item of items) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      c.setAttribute('cx', String(x + 10)); c.setAttribute('cy', String(y - 2))
      c.setAttribute('r', '8'); c.setAttribute('fill', `url(#${item.grad})`)
      c.setAttribute('stroke', 'rgba(255,255,255,0.2)'); c.setAttribute('stroke-width', '1')
      this.svg.appendChild(c)
      this.drawText(item.label, x + 22, y, '#c7d2fe', 10, 'start')
      x += 82
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
