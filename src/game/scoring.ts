import { puzzleHits, type Instrument, type Puzzle } from '../data/puzzles.ts'

export type PlayerGrid = Record<Instrument, boolean[]>

export function createEmptyGrid(steps: number): PlayerGrid {
  return {
    kick: Array<boolean>(steps).fill(false),
    snare: Array<boolean>(steps).fill(false),
    hat: Array<boolean>(steps).fill(false),
  }
}

export function patternFromGrid(grid: PlayerGrid, puzzle: Puzzle) {
  return {
    kick: puzzle.activeInstruments.includes('kick') ? grid.kick.flatMap((active, step) => active ? [step] : []) : [],
    snare: puzzle.activeInstruments.includes('snare') ? grid.snare.flatMap((active, step) => active ? [step] : []) : [],
    hat: puzzle.activeInstruments.includes('hat') ? grid.hat.flatMap((active, step) => active ? [step] : []) : [],
  }
}

// Prototype cell accuracy. Only active challenge rows count toward the total.
export function scoreGrid(grid: PlayerGrid, puzzle: Puzzle) {
  let correct = 0
  for (const instrument of puzzle.activeInstruments) {
    for (let step = 0; step < puzzle.steps; step++) {
      if (grid[instrument][step] === puzzleHits(puzzle, instrument).includes(step)) correct++
    }
  }
  const total = puzzle.activeInstruments.length * puzzle.steps
  return { correct, total, percentage: (correct / total) * 100 }
}
