import { describe, expect, it } from 'vitest'
import { BubbleSortStrategy, QuickSortStrategy } from '../core/algorithmEngine'

describe('sorting strategies', () => {
  it('generates sorted result for bubble sort', () => {
    const strategy = new BubbleSortStrategy()
    const steps = strategy.generate([5, 1, 4, 2, 8])
    expect(steps.at(-1)?.data).toEqual([1, 2, 4, 5, 8])
  })

  it('generates sorted result for quick sort with duplicated values', () => {
    const strategy = new QuickSortStrategy()
    const steps = strategy.generate([5, 3, 8, 3, 9, 1, 5, 2])
    expect(steps.at(-1)?.data).toEqual([1, 2, 3, 3, 5, 5, 8, 9])
  })

  it('rejects oversize sorting input', () => {
    const strategy = new BubbleSortStrategy()
    const result = strategy.validate(Array.from({ length: 21 }, (_, index) => index))
    expect(result.ok).toBe(false)
  })
})
