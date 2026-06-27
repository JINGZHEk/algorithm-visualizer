import { describe, expect, it } from 'vitest'
import { HuffmanStrategy } from '../core/algorithmEngine'
import { generateHuffmanSteps, huffmanTestCases } from './huffman'

describe('Huffman algorithm', () => {
  it('generates valid prefix codes', () => {
    const steps = generateHuffmanSteps(huffmanTestCases[0].input)
    const last = steps.at(-1)
    const data = last!.data as { codes: Record<string, string> }
    const codes = data.codes

    // All characters should have codes
    expect(Object.keys(codes)).toHaveLength(huffmanTestCases[0].input.length)

    // Codes should not be empty
    for (const code of Object.values(codes)) {
      expect(code.length).toBeGreaterThan(0)
    }

    // No code should be a prefix of another (prefix-free property)
    const codeList = Object.values(codes)
    for (let i = 0; i < codeList.length; i++) {
      for (let j = 0; j < codeList.length; j++) {
        if (i !== j) {
          expect(codeList[j].startsWith(codeList[i])).toBe(false)
        }
      }
    }
  })

  it('handles extreme frequency skew', () => {
    const tc = huffmanTestCases[1]
    const steps = generateHuffmanSteps(tc.input)
    const last = steps.at(-1)
    const data = last!.data as { codes: Record<string, string>; tree: { freq: number } }
    // High-frequency char 'A' should have shorter code
    const codes = data.codes
    expect(codes['A'].length).toBeLessThanOrEqual(codes['C'].length)
    // Root frequency should equal sum
    expect(data.tree.freq).toBe(103)
  })

  it('generates correct total frequency for all test cases', () => {
    for (const tc of huffmanTestCases) {
      const steps = generateHuffmanSteps(tc.input)
      const last = steps.at(-1)
      const data = last!.data as { tree: { freq: number } | null }
      expect(data.tree).toBeDefined()
      if (data.tree) {
        const totalFreq = tc.input.reduce((sum, item) => sum + item.freq, 0)
        expect(data.tree.freq).toBe(totalFreq)
      }
    }
  })

  it('validates input correctly', () => {
    const strategy = new HuffmanStrategy()
    expect(strategy.validate([]).ok).toBe(false)
    expect(strategy.validate([{ char: 'A', freq: 5 }]).ok).toBe(false)
    expect(strategy.validate([{ char: 'A', freq: 5 }, { char: 'B', freq: 3 }]).ok).toBe(true)
  })
})
