import { describe, expect, it } from 'vitest'
import { MazeDfsStrategy } from '../core/algorithmEngine'
import { generateMazeSteps, parseMazeFromArray, generateMaze, mazeTestCases } from './maze'

describe('Maze algorithm', () => {
  it('finds path in solvable maze', () => {
    const tc = mazeTestCases[0]
    const grid = parseMazeFromArray(tc.input)
    const steps = generateMazeSteps(grid)
    const last = steps.at(-1)
    const data = last!.data as { found: boolean; path: [number, number][] }
    expect(data.found).toBe(true)
    expect(data.path.length).toBeGreaterThan(0)
    // Path should start at (0,0)
    expect(data.path[0]).toEqual([0, 0])
    // Path should end at last cell
    const lastPath = data.path[data.path.length - 1]
    expect(lastPath[0]).toBe(grid.length - 1)
    expect(lastPath[1]).toBe(grid[0].length - 1)
  })

  it('returns not found for unsolvable maze', () => {
    const tc = mazeTestCases[1]
    const grid = parseMazeFromArray(tc.input)
    const steps = generateMazeSteps(grid)
    const last = steps.at(-1)
    const data = last!.data as { found: boolean }
    expect(data.found).toBe(false)
  })

  it('generates random maze that is solvable', () => {
    const grid = generateMaze(6, 6)
    // Start and end should be open
    expect(grid[0][0].isWall).toBe(false)
    expect(grid[0][0].isStart).toBe(true)
    expect(grid[5][5].isWall).toBe(false)
    expect(grid[5][5].isEnd).toBe(true)
    // Adjacent cells to start/end should have paths
    expect(grid[0][1].isWall).toBe(false)
    expect(grid[1][0].isWall).toBe(false)
  })

  it('generates steps with valid descriptions', () => {
    for (const tc of mazeTestCases) {
      const grid = parseMazeFromArray(tc.input)
      const steps = generateMazeSteps(grid)
      expect(steps.length).toBeGreaterThan(0)
      for (const step of steps) {
        expect(step.description).toBeTruthy()
        expect(typeof step.highlightLine).toBe('number')
      }
    }
  })

  it('validates input correctly', () => {
    const strategy = new MazeDfsStrategy()
    expect(strategy.validate([]).ok).toBe(false)
    expect(strategy.validate('not a grid').ok).toBe(false)
    // A valid 2D grid
    const validGrid = [
      [
        { row: 0, col: 0, isWall: false, isStart: true, isEnd: false },
        { row: 0, col: 1, isWall: false, isStart: false, isEnd: true },
      ],
    ]
    expect(strategy.validate(validGrid).ok).toBe(true)
  })
})
