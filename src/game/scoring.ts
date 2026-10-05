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

export type InstrumentScore = {
  correct: number
  missed: number
  extra: number
  targetHits: number
  score: number
}

// Correctly empty cells have no value. Each active row earns its score from
// target hits only; a zero-hit active row deterministically scores 0 because
// there are no target hits to earn accuracy from.
export function scoreGrid(grid: PlayerGrid, puzzle: Puzzle) {
  let correct = 0
  let missed = 0
  let extra = 0
  let total = 0
  const instrumentScores: Partial<Record<Instrument, InstrumentScore>> = {}

  for (const instrument of puzzle.activeInstruments) {
    const targets = new Set(puzzleHits(puzzle, instrument).filter(step =>
      Number.isInteger(step) && step >= 0 && step < puzzle.steps))
    let instrumentCorrect = 0
    let instrumentMissed = 0
    let instrumentExtra = 0

    for (let step = 0; step < puzzle.steps; step++) {
      const placed = Boolean(grid[instrument]?.[step])
      const target = targets.has(step)
      if (placed && target) instrumentCorrect++
      else if (!placed && target) instrumentMissed++
      else if (placed) instrumentExtra++
    }

    const targetHits = targets.size
    const score = targetHits === 0
      ? 0
      : Math.max(0, 1 - ((instrumentMissed + instrumentExtra) / targetHits))
    instrumentScores[instrument] = {
      correct: instrumentCorrect,
      missed: instrumentMissed,
      extra: instrumentExtra,
      targetHits,
      score,
    }
    correct += instrumentCorrect
    missed += instrumentMissed
    extra += instrumentExtra
    total += targetHits
  }

  const scores = puzzle.activeInstruments.map(instrument => instrumentScores[instrument]?.score ?? 0)
  const percentage = scores.length === 0
    ? 0
    : (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100
  return { correct, missed, extra, total, percentage, instrumentScores }
}
