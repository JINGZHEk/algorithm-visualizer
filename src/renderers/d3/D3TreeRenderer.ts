import type { AlgorithmStep } from '../../types'
import type { RendererMountOptions, VisualRenderer } from '../types'

interface HuffmanNode {
  id: number; char: string; freq: number
  left: HuffmanNode | null; right: HuffmanNode | null
}
interface HuffmanStepData {
  nodes?: HuffmanNode[]; tree?: HuffmanNode | null
  queue?: { char: string; freq: number }[]
}

function isHuffmanStep(data: unknown): data is HuffmanStepData {
  const d = data as HuffmanStepData | undefined
  return d !== undefined && (d.nodes !== undefined || d.tree !== undefined)
}

/**
 * D3/SVG 哈夫曼树渲染器 —— 增强版
 *
 * 相比 Canvas 2D，特有：
 * - 贝塞尔曲线（二次）连接父子节点，模拟有机树枝
 * - 径向渐变节点（球体效果），叶子节点使用绿色调渐变
 * - SVG 阴影滤镜增加立体感
 * - 节点合并时有放大动画
 * - 叶子节点脉冲动画
 * - 0/1 分支标签在曲线上
 */
export class D3TreeRenderer implements VisualRenderer<AlgorithmStep<HuffmanStepData>> {
  readonly backend = 'd3'
  private container: HTMLElement | null = null
  private svg: SVGSVGElement | null = null

  mount(options: RendererMountOptions): void {
    this.container = options.container
    options.canvas?.style.setProperty('display', 'none')
    options.container.querySelectorAll('svg.visual-renderer').forEach((n) => n.remove())

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add('visual-renderer', 'd3-tree-renderer')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.style.overflow = 'hidden'
    options.container.appendChild(svg)
    this.svg = svg
  }

  private setupDefs(): SVGDefsElement {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')

    // Node gradients
    const nodeGrads = [
      { id: 'leaf-grad', center: '#34d399', edge: '#059669' },
      { id: 'inner-grad', center: '#60a5fa', edge: '#1e40af' },
      { id: 'merge-grad', center: '#fbbf24', edge: '#d97706' },
    ]
    for (const g of nodeGrads) {
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

    // Glow for leaf
    const leafGlow = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    leafGlow.setAttribute('id', 'leaf-glow'); leafGlow.setAttribute('x', '-50%'); leafGlow.setAttribute('y', '-50%')
    leafGlow.setAttribute('width', '200%'); leafGlow.setAttribute('height', '200%')
    ;[
      ['feGaussianBlur', { stdDeviation: '3', result: 'blur' }],
      ['feFlood', { 'flood-color': '#34d399', 'flood-opacity': '0.4', result: 'color' }],
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
      leafGlow.appendChild(el)
    })
    defs.appendChild(leafGlow)

    // Drop shadow
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    shadow.setAttribute('id', 'tree-shadow'); shadow.setAttribute('x', '-20%'); shadow.setAttribute('y', '-20%')
    shadow.setAttribute('width', '140%'); shadow.setAttribute('height', '140%')
    const feD = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow')
    feD.setAttribute('dx', '0'); feD.setAttribute('dy', '3'); feD.setAttribute('stdDeviation', '4')
    feD.setAttribute('flood-color', '#000'); feD.setAttribute('flood-opacity', '0.3')
    shadow.appendChild(feD)
    defs.appendChild(shadow)

    return defs
  }

  resize(): void {
    this.render(null)
  }

  render(step: AlgorithmStep<HuffmanStepData> | null): void {
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

    if (!step || !isHuffmanStep(step.data)) {
      this.drawText('等待算法执行...', width / 2, height / 2 + 28, '#6b76a3', 14, 'middle')
      this.drawText('🌳 D3/SVG 树渲染模式已就绪', width / 2, height / 2 - 14, '#34d399', 14, 'middle')
      return
    }

    const data = step.data

    if (data.tree) {
      this.drawTreeSvg(data.tree, width / 2, 50, width / 4.5)
    } else if (data.nodes && data.nodes.length > 0) {
      // Draw floating nodes (queue visualization)
      const nodes = data.nodes
      const spacing = Math.min(80, (width - 40) / nodes.length)
      const startX = (width - (nodes.length - 1) * spacing) / 2
      const y = height / 2

      for (let i = 0; i < nodes.length; i++) {
        const x = startX + i * spacing; const radius = 26
        const isLeaf = !nodes[i].left && !nodes[i].right
        const gradId = isLeaf ? 'leaf-grad' : 'inner-grad'

        // Shadow
        const sh = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        sh.setAttribute('cx', String(x)); sh.setAttribute('cy', String(y + 2))
        sh.setAttribute('r', String(radius)); sh.setAttribute('fill', '#000')
        sh.setAttribute('opacity', '0.25'); sh.setAttribute('filter', 'url(#tree-shadow)')
        this.svg.appendChild(sh)

        // Node
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y))
        c.setAttribute('r', String(radius))
        c.setAttribute('fill', `url(#${gradId})`)
        c.setAttribute('stroke', isLeaf ? '#6ee7b7' : '#93c5fd')
        c.setAttribute('stroke-width', isLeaf ? '2' : '1.5')
        if (isLeaf) c.setAttribute('filter', 'url(#leaf-glow)')
        c.style.transition = 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)'
        this.svg.appendChild(c)

        // Char label
        this.drawText(nodes[i].char, x, y - 5, '#ffffff', 13, 'middle', 'bold')
        // Freq label
        this.drawText(String(nodes[i].freq), x, y + 12, '#94a3b8', 9, 'middle')

        // Floating animation for nodes (simulates priority queue)
        if (nodes.length <= 6) {
          c.innerHTML = '<animateTransform attributeName="transform" type="translate" values="0,0;0,-4;0,0" dur="3s" repeatCount="indefinite"/>'
        }
      }
    }
  }

  private drawTreeSvg(node: HuffmanNode, x: number, y: number, spread: number): void {
    if (!this.svg) return
    const radius = 22
    const childY = y + 70

    if (node.left) {
      const cx = x - spread
      // Bezier curve for organic edge
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const mx = (x + cx) / 2
      const d = `M ${x} ${y + radius} Q ${mx - 10} ${(y + childY) / 2} ${cx} ${childY - radius}`
      path.setAttribute('d', d)
      path.setAttribute('stroke', '#34d399'); path.setAttribute('stroke-width', '2')
      path.setAttribute('fill', 'none'); path.setAttribute('opacity', '0.7')
      path.setAttribute('stroke-linecap', 'round')
      // Animated drawing
      path.innerHTML =
        '<animate attributeName="stroke-dasharray" from="0,200" to="200,0" dur="0.6s" fill="freeze" calcMode="spline" keySplines="0.42 0 0.58 1"/>'
      this.svg.appendChild(path)

      // '0' label on curve
      const lm = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      lm.setAttribute('x', String(mx - 12)); lm.setAttribute('y', String((y + childY) / 2 - 9))
      lm.setAttribute('width', '20'); lm.setAttribute('height', '16')
      lm.setAttribute('rx', '5')
      lm.setAttribute('fill', 'rgba(52,211,153,0.18)')
      lm.setAttribute('stroke', 'rgba(52,211,153,0.35)')
      lm.setAttribute('stroke-width', '1')
      this.svg.appendChild(lm)
      this.drawText('0', mx - 2, (y + childY) / 2, '#34d399', 11, 'middle', 'bold')

      this.drawTreeSvg(node.left, cx, childY, spread / 2)
    }

    if (node.right) {
      const cx = x + spread
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const mx = (x + cx) / 2
      const d = `M ${x} ${y + radius} Q ${mx + 10} ${(y + childY) / 2} ${cx} ${childY - radius}`
      path.setAttribute('d', d)
      path.setAttribute('stroke', '#f56c6c'); path.setAttribute('stroke-width', '2')
      path.setAttribute('fill', 'none'); path.setAttribute('opacity', '0.7')
      path.setAttribute('stroke-linecap', 'round')
      path.innerHTML =
        '<animate attributeName="stroke-dasharray" from="0,200" to="200,0" dur="0.6s" fill="freeze" calcMode="spline" keySplines="0.42 0 0.58 1"/>'
      this.svg.appendChild(path)

      const rm = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rm.setAttribute('x', String(mx - 8)); rm.setAttribute('y', String((y + childY) / 2 - 9))
      rm.setAttribute('width', '20'); rm.setAttribute('height', '16')
      rm.setAttribute('rx', '5')
      rm.setAttribute('fill', 'rgba(245,108,108,0.18)')
      rm.setAttribute('stroke', 'rgba(245,108,108,0.35)')
      rm.setAttribute('stroke-width', '1')
      this.svg.appendChild(rm)
      this.drawText('1', mx + 2, (y + childY) / 2, '#f56c6c', 11, 'middle', 'bold')

      this.drawTreeSvg(node.right, cx, childY, spread / 2)
    }

    // Draw this node
    const isLeaf = !node.left && !node.right
    const gradId = isLeaf ? 'leaf-grad' : 'inner-grad'

    // Shadow
    const sh = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    sh.setAttribute('cx', String(x)); sh.setAttribute('cy', String(y + 2))
    sh.setAttribute('r', String(radius)); sh.setAttribute('fill', '#000')
    sh.setAttribute('opacity', '0.25'); sh.setAttribute('filter', 'url(#tree-shadow)')
    this.svg.appendChild(sh)

    // Node circle
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y))
    c.setAttribute('r', String(radius))
    c.setAttribute('fill', `url(#${gradId})`)
    c.setAttribute('stroke', isLeaf ? '#6ee7b7' : '#93c5fd')
    c.setAttribute('stroke-width', isLeaf ? '2.5' : '1.5')
    if (isLeaf) c.setAttribute('filter', 'url(#leaf-glow)')
    c.style.transition = 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)'
    this.svg.appendChild(c)

    // Node text
    if (isLeaf) {
      this.drawText(node.char, x, y - 5, '#ffffff', 13, 'middle', 'bold')
      this.drawText(String(node.freq), x, y + 12, '#a7f3d0', 9, 'middle')
    } else {
      this.drawText(String(node.freq), x, y + 1, '#bfdbfe', 12, 'middle', 'bold')
    }
  }

  private drawBadge(width: number): void {
    if (!this.svg) return
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('x', String(width - 140)); bg.setAttribute('y', '14')
    bg.setAttribute('width', '125'); bg.setAttribute('height', '24')
    bg.setAttribute('rx', '12'); bg.setAttribute('fill', 'rgba(52,211,153,0.12)')
    bg.setAttribute('stroke', 'rgba(52,211,153,0.3)'); bg.setAttribute('stroke-width', '1')
    this.svg.appendChild(bg)
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dot.setAttribute('cx', String(width - 123)); dot.setAttribute('cy', '26')
    dot.setAttribute('r', '4'); dot.setAttribute('fill', '#34d399')
    dot.innerHTML = '<animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/>'
    this.svg.appendChild(dot)
    this.drawText('SVG / D3 Tree', width - 65, 26, '#6ee7b7', 9.5, 'middle')
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
