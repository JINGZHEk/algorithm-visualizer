import { describe, expect, it } from 'vitest'
import { DijkstraStrategy } from '../core/algorithmEngine'
import { generateDijkstraSteps, dijkstraTestCases } from './dijkstra'

describe('Dijkstra algorithm', () => {
  it('computes correct shortest distances for connected graph', () => {
    const strategy = new DijkstraStrategy()
    const tc = dijkstraTestCases[0]
    const steps = strategy.generate({ graph: tc.input, source: tc.source })
    const last = steps.at(-1)
    expect(last).toBeDefined()
    const data = last!.data as { dist: number[] }
    // A->A=0, A->B=3 (via A->C->B), A->C=2, A->D=7, A->E=5
    expect(data.dist[0]).toBe(0)   // A
    expect(data.dist[2]).toBe(2)   // A->C direct
    expect(data.dist[4]).toBe(5)   // A->C->E
    expect(data.dist[1]).toBe(3)   // A->C->B
  })

  it('marks isolated node as Infinity', () => {
    const tc = dijkstraTestCases[1]
    const steps = generateDijkstraSteps(tc.input, tc.source)
    const last = steps.at(-1)
    const data = last!.data as { dist: number[]; graph: { nodes: { label: string }[] } }
    // Node F(孤立) is index 5
    const isolatedIdx = data.graph.nodes.findIndex(n => n.label.includes('F'))
    expect(isolatedIdx).toBeGreaterThan(-1)
    expect(data.dist[isolatedIdx]).toBe(Infinity)
  })

  it('finds valid path for equal-weight multi-path graph', () => {
    const tc = dijkstraTestCases[2]
    const steps = generateDijkstraSteps(tc.input, tc.source)
    const last = steps.at(-1)
    const data = last!.data as { dist: number[] }
    // A->D should be 5 (A->B->D = 5  or  A->C->D = 5)
    expect(data.dist[3]).toBe(5)
    expect(data.dist[4]).toBe(6) // A->D->E = 5 + 1 = 6
  })

  it('validates input correctly', () => {
    const strategy = new DijkstraStrategy()
    expect(strategy.validate({}).ok).toBe(false)
    expect(strategy.validate({ graph: { nodes: [], edges: [] }, source: 0 }).ok).toBe(true)
    expect(strategy.validate({ source: 0 }).ok).toBe(false)
  })

  it('generates steps for each test case', () => {
    for (const tc of dijkstraTestCases) {
      const steps = generateDijkstraSteps(tc.input, tc.source)
      expect(steps.length).toBeGreaterThan(0)
      for (const step of steps) {
        expect(step.description).toBeTruthy()
        expect(typeof step.highlightLine).toBe('number')
      }
    }
  })
})
