import type { AlgorithmStep } from '../../types'
import type { RendererMountOptions, VisualRenderer } from '../types'

/**
 * D3/SVG 排序渲染器 —— 增强版
 *
 * 相比 Canvas 2D 版本，特有：
 * - 渐变填充柱状图（每个柱子独立渐变，顶部高光）
 * - SVG drop-shadow + glow 滤镜（交换/比较时发光）
 * - CSS transition 平滑过渡（高度、颜色变化）
 * - 粒子爆炸特效（交换时带 SVG animateMotion）
 * - 背景网格图案
 * - 可选中/可搜索的 SVG 文本标签
 * - 状态标签（比较中/交换中/已排序 的浮动指示器）
 */
export class D3SortingRenderer implements VisualRenderer<AlgorithmStep<number[]>> {
  readonly backend = 'd3'
  private container: HTMLElement | null = null
  private svg: SVGSVGElement | null = null
  private defs: SVGDefsElement | null = null

  mount(options: RendererMountOptions): void {
    this.container = options.container
    options.canvas?.style.setProperty('display', 'none')
    options.container.querySelectorAll('svg.visual-renderer').forEach((n) => n.remove())

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add('visual-renderer', 'd3-sorting-renderer')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.style.overflow = 'hidden'
    options.container.appendChild(svg)
    this.svg = svg

    // Setup SVG defs with filters and gradients
    this.setupDefs()
  }

  private setupDefs(): void {
    if (!this.svg) return
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    this.defs = defs

    // === Glow Filters ===
    // Compare glow (yellow/amber)
    const glowCompare = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    glowCompare.setAttribute('id', 'glow-compare')
    glowCompare.setAttribute('x', '-50%'); glowCompare.setAttribute('y', '-50%')
    glowCompare.setAttribute('width', '200%'); glowCompare.setAttribute('height', '200%')
    ;[
      ['feGaussianBlur', { stdDeviation: '4', result: 'blur' }],
      ['feFlood', { 'flood-color': '#fbbf24', 'flood-opacity': '0.6', result: 'color' }],
      ['feComposite', { in: 'color', in2: 'blur', operator: 'in', result: 'glow' }],
      ['feMerge', null],
    ].forEach(([tag, attrs]) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag as string)
      if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)))
      if (tag === 'feMerge') {
        ['glow', 'SourceGraphic'].forEach((name) => {
          const mn = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
          mn.setAttribute('in', name)
          el.appendChild(mn)
        })
      }
      glowCompare.appendChild(el)
    })
    defs.appendChild(glowCompare)

    // Swap glow (rose/red)
    const glowSwap = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    glowSwap.setAttribute('id', 'glow-swap')
    glowSwap.setAttribute('x', '-50%'); glowSwap.setAttribute('y', '-50%')
    glowSwap.setAttribute('width', '200%'); glowSwap.setAttribute('height', '200%')
    ;[
      ['feGaussianBlur', { stdDeviation: '5', result: 'blur' }],
      ['feFlood', { 'flood-color': '#fb7185', 'flood-opacity': '0.7', result: 'color' }],
      ['feComposite', { in: 'color', in2: 'blur', operator: 'in', result: 'glow' }],
      ['feMerge', null],
    ].forEach(([tag, attrs]) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag as string)
      if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)))
      if (tag === 'feMerge') {
        ['glow', 'SourceGraphic'].forEach((name) => {
          const mn = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
          mn.setAttribute('in', name)
          el.appendChild(mn)
        })
      }
      glowSwap.appendChild(el)
    })
    defs.appendChild(glowSwap)

    // Sorted glow (green/emerald)
    const glowSorted = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    glowSorted.setAttribute('id', 'glow-sorted')
    glowSorted.setAttribute('x', '-50%'); glowSorted.setAttribute('y', '-50%')
    glowSorted.setAttribute('width', '200%'); glowSorted.setAttribute('height', '200%')
    ;[
      ['feGaussianBlur', { stdDeviation: '3', result: 'blur' }],
      ['feFlood', { 'flood-color': '#34d399', 'flood-opacity': '0.5', result: 'color' }],
      ['feComposite', { in: 'color', in2: 'blur', operator: 'in', result: 'glow' }],
      ['feMerge', null],
    ].forEach(([tag, attrs]) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag as string)
      if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)))
      if (tag === 'feMerge') {
        ['glow', 'SourceGraphic'].forEach((name) => {
          const mn = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
          mn.setAttribute('in', name)
          el.appendChild(mn)
        })
      }
      glowSorted.appendChild(el)
    })
    defs.appendChild(glowSorted)

    // Drop shadow for depth
    const dropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    dropShadow.setAttribute('id', 'drop-shadow')
    dropShadow.setAttribute('x', '-20%'); dropShadow.setAttribute('y', '-20%')
    dropShadow.setAttribute('width', '150%'); dropShadow.setAttribute('height', '150%')
    ;[
      ['feDropShadow', { dx: '0', dy: '4', stdDeviation: '6', 'flood-color': '#000000', 'flood-opacity': '0.35' }],
    ].forEach(([tag, attrs]) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag as string)
      if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)))
      dropShadow.appendChild(el)
    })
    defs.appendChild(dropShadow)

    // === Gradients ===
    const barGradients = [
      { id: 'grad-default', top: '#2dd4bf', bottom: '#0d9488' },
      { id: 'grad-compare', top: '#fbbf24', bottom: '#d97706' },
      { id: 'grad-swap', top: '#fb7185', bottom: '#be123c' },
      { id: 'grad-sorted', top: '#34d399', bottom: '#059669' },
      { id: 'grad-highlight', top: '#60a5fa', bottom: '#2563eb' },
    ]
    for (const g of barGradients) {
      const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
      grad.setAttribute('id', g.id)
      grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0')
      grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1')
      ;[
        { offset: '0%', color: g.top, opacity: '1' },
        { offset: '100%', color: g.bottom, opacity: '0.9' },
      ].forEach((stop) => {
        const s = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
        s.setAttribute('offset', stop.offset)
        s.setAttribute('stop-color', stop.color)
        s.setAttribute('stop-opacity', stop.opacity)
        grad.appendChild(s)
      })
      defs.appendChild(grad)
    }

    // Highlight bar: top shine
    const shineGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
    shineGrad.setAttribute('id', 'grad-shine')
    shineGrad.setAttribute('x1', '0'); shineGrad.setAttribute('y1', '0')
    shineGrad.setAttribute('x2', '0'); shineGrad.setAttribute('y2', '1')
    ;[
      { offset: '0%', color: '#ffffff', opacity: '0.25' },
      { offset: '30%', color: '#ffffff', opacity: '0.05' },
      { offset: '100%', color: '#000000', opacity: '0.15' },
    ].forEach((stop) => {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
      s.setAttribute('offset', stop.offset)
      s.setAttribute('stop-color', stop.color)
      s.setAttribute('stop-opacity', stop.opacity)
      shineGrad.appendChild(s)
    })
    defs.appendChild(shineGrad)

    // === Background Grid Pattern ===
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
    pattern.setAttribute('id', 'grid-bg')
    pattern.setAttribute('width', '40'); pattern.setAttribute('height', '40')
    pattern.setAttribute('patternUnits', 'userSpaceOnUse')
    const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    gridLine.setAttribute('d', 'M 40 0 L 0 0 0 40')
    gridLine.setAttribute('fill', 'none')
    gridLine.setAttribute('stroke', 'rgba(255,255,255,0.04)')
    gridLine.setAttribute('stroke-width', '1')
    pattern.appendChild(gridLine)
    defs.appendChild(pattern)

    this.svg.appendChild(defs)
  }

  resize(): void {
    this.render(null)
  }

  render(step: AlgorithmStep<number[]> | null): void {
    if (!this.container || !this.svg) return
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    this.svg.replaceChildren()

    // Re-append defs after clearing
    if (this.defs) this.svg.appendChild(this.defs)

    // Background with grid pattern
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('width', String(width))
    bg.setAttribute('height', String(height))
    bg.setAttribute('fill', 'url(#grid-bg)')
    // Base color behind grid
    const bgBase = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgBase.setAttribute('width', String(width))
    bgBase.setAttribute('height', String(height))
    bgBase.setAttribute('fill', '#0c1120')
    this.svg.appendChild(bgBase)
    this.svg.appendChild(bg)

    // Subtle radial gradient at top
    const radialDef = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient')
    radialDef.setAttribute('id', 'bg-radial')
    radialDef.setAttribute('cx', '50%'); radialDef.setAttribute('cy', '0%')
    radialDef.setAttribute('r', '100%')
    ;[
      { offset: '0%', color: '#2dd4bf', opacity: '0.06' },
      { offset: '100%', color: '#0c1120', opacity: '0' },
    ].forEach((s) => {
      const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
      stop.setAttribute('offset', s.offset)
      stop.setAttribute('stop-color', s.color)
      stop.setAttribute('stop-opacity', s.opacity)
      radialDef.appendChild(stop)
    })
    this.defs?.appendChild(radialDef)

    const bgGrad = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgGrad.setAttribute('width', String(width))
    bgGrad.setAttribute('height', String(height))
    bgGrad.setAttribute('fill', 'url(#bg-radial)')
    this.svg.appendChild(bgGrad)

    if (!step) {
      this.drawText('等待算法执行...', width / 2, height / 2, '#a9b2d6', 16, 'middle')
      this.drawHint(width, height)
      return
    }

    const data = step.data
    const n = data.length
    const padding = 44
    const gap = 8
    const barWidth = Math.min(64, (width - padding * 2) / n - gap)
    const totalWidth = n * (barWidth + gap) - gap
    const startX = (width - totalWidth) / 2
    const maxVal = Math.max(...data.map((item) => Math.abs(item)), 1)
    const barAreaHeight = Math.max(80, height - padding * 3)

    // === Legend ===
    this.drawLegend()
    // === Step counter badge ===
    this.drawStepBadge(width)

    // Draw each bar
    for (let i = 0; i < n; i++) {
      const value = data[i]
      const barHeight = (Math.abs(value) / maxVal) * barAreaHeight
      const x = startX + i * (barWidth + gap)
      const y = height - padding - barHeight

      const [gradId, filterId] = this.resolveStyle(i, step)

      // === Bar shadow (slightly larger, offset) ===
      const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      shadow.setAttribute('x', String(x + 1))
      shadow.setAttribute('y', String(y + 3))
      shadow.setAttribute('width', String(barWidth))
      shadow.setAttribute('height', String(barHeight))
      shadow.setAttribute('rx', '7')
      shadow.setAttribute('fill', 'rgba(0,0,0,0.25)')
      shadow.setAttribute('filter', 'url(#drop-shadow)')
      shadow.classList.add('elastic-bar')
      this.svg.appendChild(shadow)

      // === Main bar (with gradient) ===
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', String(x))
      rect.setAttribute('y', String(y))
      rect.setAttribute('width', String(barWidth))
      rect.setAttribute('height', String(barHeight))
      rect.setAttribute('rx', '7')
      rect.setAttribute('fill', `url(#${gradId})`)
      if (filterId) rect.setAttribute('filter', `url(#${filterId})`)
      rect.classList.add('elastic-bar')

      // CSS transition for smooth changes
      rect.style.transition = 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
      this.svg.appendChild(rect)

      // === Top shine overlay ===
      const shine = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      shine.setAttribute('x', String(x))
      shine.setAttribute('y', String(y))
      shine.setAttribute('width', String(barWidth))
      shine.setAttribute('height', String(Math.min(barHeight, 20)))
      shine.setAttribute('rx', '7')
      shine.setAttribute('fill', 'url(#grad-shine)')
      shine.style.pointerEvents = 'none'
      this.svg.appendChild(shine)

      // === Value label ===
      const isActive = step.swapping?.includes(i) || step.comparing?.includes(i)
      const labelY = isActive ? y - 14 : y - 8
      this.drawText(String(value), x + barWidth / 2, labelY, '#ffffff',
        isActive ? 13 : Math.max(10, Math.min(12, barWidth - 2)),
        'middle', 'bold')

      // === Index label ===
      this.drawText(`[${i}]`, x + barWidth / 2, height - padding + 16, '#6b76a3', 9, 'middle')

      // === State indicator dot ===
      if (step.comparing?.includes(i) || step.swapping?.includes(i)) {
        const dotFill = step.swapping?.includes(i) ? '#fb7185' : '#fbbf24'
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        dot.setAttribute('cx', String(x + barWidth / 2))
        dot.setAttribute('cy', String(y - 26))
        dot.setAttribute('r', '4')
        dot.setAttribute('fill', dotFill)
        dot.innerHTML = '<animate attributeName="r" values="4;6;4" dur="0.8s" repeatCount="indefinite"/>'
        this.svg.appendChild(dot)
      }

      // === Swap particle burst ===
      if (step.swapping?.includes(i)) {
        this.drawParticleBurst(x + barWidth / 2, y + barHeight * 0.3, barHeight)
      }
    }
  }

  private resolveStyle(index: number, step: AlgorithmStep<number[]>): [string, string | null] {
    if (step.sorted?.includes(index)) return ['grad-sorted', 'glow-sorted']
    if (step.swapping?.includes(index)) return ['grad-swap', 'glow-swap']
    if (step.comparing?.includes(index)) return ['grad-compare', 'glow-compare']
    if (step.highlights?.includes(index)) return ['grad-highlight', 'glow-compare']
    return ['grad-default', null]
  }

  private drawParticleBurst(cx: number, cy: number, barHeight: number): void {
    if (!this.svg) return
    const colors = ['#fbbf24', '#fb7185', '#f59e0b', '#ffffff']
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.3
      const distance = 12 + Math.random() * 28 + barHeight * 0.15
      const tx = Math.cos(angle) * distance
      const ty = Math.sin(angle) * distance - 8

      const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      particle.setAttribute('cx', String(cx))
      particle.setAttribute('cy', String(cy))
      particle.setAttribute('r', String(1.5 + Math.random() * 2.5))
      particle.setAttribute('fill', colors[i % colors.length])
      particle.setAttribute('opacity', '0.9')
      particle.innerHTML =
        `<animate attributeName="cx" from="${cx}" to="${cx + tx}" dur="0.55s" fill="freeze" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>` +
        `<animate attributeName="cy" from="${cy}" to="${cy + ty}" dur="0.55s" fill="freeze" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>` +
        `<animate attributeName="opacity" from="0.9" to="0" dur="0.55s" fill="freeze"/>` +
        `<animate attributeName="r" from="${1.5 + Math.random() * 2.5}" to="0.5" dur="0.55s" fill="freeze"/>`
      this.svg.appendChild(particle)
    }
  }

  private drawLegend(): void {
    if (!this.svg) return
    const items = [
      { grad: 'grad-default', label: '未排序' },
      { grad: 'grad-compare', label: '比较中' },
      { grad: 'grad-swap', label: '交换中' },
      { grad: 'grad-sorted', label: '已排序' },
    ]

    let x = 20; const y = 20
    for (const item of items) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', String(x))
      rect.setAttribute('y', String(y))
      rect.setAttribute('width', '14')
      rect.setAttribute('height', '14')
      rect.setAttribute('rx', '4')
      rect.setAttribute('fill', `url(#${item.grad})`)
      this.svg.appendChild(rect)

      this.drawText(item.label, x + 40, y + 11, '#c7d2fe', 11, 'start')

      x += 80
    }
  }

  private drawStepBadge(width: number): void {
    if (!this.svg) return
    // Badge showing "SVG/D3 Rendered" in top right
    const badge = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    badge.setAttribute('x', String(width - 155))
    badge.setAttribute('y', '14')
    badge.setAttribute('width', '140')
    badge.setAttribute('height', '24')
    badge.setAttribute('rx', '12')
    badge.setAttribute('fill', 'rgba(45,212,191,0.12)')
    badge.setAttribute('stroke', 'rgba(45,212,191,0.3)')
    badge.setAttribute('stroke-width', '1')
    this.svg.appendChild(badge)

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dot.setAttribute('cx', String(width - 138))
    dot.setAttribute('cy', '26')
    dot.setAttribute('r', '4')
    dot.setAttribute('fill', '#2dd4bf')
    dot.innerHTML = '<animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/>'
    this.svg.appendChild(dot)

    this.drawText('SVG / D3 Enhanced', width - 78, 26, '#2dd4bf', 9.5, 'middle')
  }

  private drawHint(width: number, height: number): void {
    if (!this.svg) return
    this.drawText('输入数据并点击"开始可视化"', width / 2, height / 2 + 24, '#6b76a3', 13, 'middle')
    this.drawText('🎨 D3/SVG 渲染模式已就绪', width / 2, height / 2 - 12, '#2dd4bf', 14, 'middle')
  }

  destroy(): void {
    this.svg?.remove()
    this.svg = null
    this.defs = null
    this.container = null
  }

  private drawText(
    text: string, x: number, y: number, fill: string, size: number,
    anchor: 'start' | 'middle' | 'end' = 'middle', weight = 'normal',
  ): void {
    if (!this.svg) return
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    node.textContent = text
    node.setAttribute('x', String(x))
    node.setAttribute('y', String(y))
    node.setAttribute('fill', fill)
    node.setAttribute('font-size', String(size))
    node.setAttribute('font-family', 'Consolas, Microsoft YaHei, sans-serif')
    node.setAttribute('text-anchor', anchor)
    node.setAttribute('dominant-baseline', 'central')
    if (weight === 'bold') node.setAttribute('font-weight', 'bold')
    this.svg.appendChild(node)
  }
}
