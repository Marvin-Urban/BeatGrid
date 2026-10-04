import type { Instrument, Puzzle } from '../data/puzzles'

export type PlayerGrid = Record<Instrument, boolean[]>
export const instruments: Instrument[] = ['kick', 'snare', 'hat']

export function createEmptyGrid(steps: number): PlayerGrid {
  return {
    kick: Array<boolean>(steps).fill(false),
    snare: Array<boolean>(steps).fill(false),
    hat: Array<boolean>(steps).fill(false),
  }
}

// Temporary prototype score: every hit AND every empty cell counts equally.
export function scoreGrid(grid: PlayerGrid, puzzle: Puzzle) {
  let correct = 0
  for (const instrument of instruments) {
    for (let step = 0; step < puzzle.steps; step++) {
      if (grid[instrument][step] === puzzle[instrument].includes(step)) correct++
    }
  }
  const total = instruments.length * puzzle.steps
  return { correct, total, percentage: (correct / total) * 100 }
}
