import type { AlgorithmType } from '../types'
import type { RendererFactoryOptions, VisualRenderer } from './types'
import { SortingCanvasRenderer } from './canvas/SortingCanvasRenderer'
import { GraphCanvasRenderer } from './canvas/GraphCanvasRenderer'
import { TreeCanvasRenderer } from './canvas/TreeCanvasRenderer'
import { MazeCanvasRenderer } from './canvas/MazeCanvasRenderer'
import { D3SortingRenderer } from './d3/D3Renderer'
import { D3GraphRenderer } from './d3/D3GraphRenderer'
import { D3TreeRenderer } from './d3/D3TreeRenderer'
import { D3MazeRenderer } from './d3/D3MazeRenderer'

function resolveAlgorithmType(options: RendererFactoryOptions): AlgorithmType | 'sorting' {
  const algo = options.algorithm
  if (algo === 'sorting' || algo === 'bubble' || algo === 'quick') {
    return 'sorting'
  }
  return algo
}

export function createRenderer(options: RendererFactoryOptions): VisualRenderer {
  const algo = resolveAlgorithmType(options)

  if (algo === 'sorting') {
    return options.backend === 'd3'
      ? new D3SortingRenderer() as VisualRenderer
      : new SortingCanvasRenderer() as VisualRenderer
  }

  if (algo === 'dijkstra') {
    return options.backend === 'd3'
      ? new D3GraphRenderer() as VisualRenderer
      : new GraphCanvasRenderer() as VisualRenderer
  }

  if (algo === 'huffman') {
    return options.backend === 'd3'
      ? new D3TreeRenderer() as VisualRenderer
      : new TreeCanvasRenderer() as VisualRenderer
  }

  if (algo === 'maze') {
    return options.backend === 'd3'
      ? new D3MazeRenderer() as VisualRenderer
      : new MazeCanvasRenderer() as VisualRenderer
  }

  // Fallback
  return new SortingCanvasRenderer() as VisualRenderer
}

export { SortingCanvasRenderer, GraphCanvasRenderer, TreeCanvasRenderer, MazeCanvasRenderer }
export { D3SortingRenderer, D3GraphRenderer, D3TreeRenderer, D3MazeRenderer }
