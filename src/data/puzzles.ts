export type Difficulty = 'easy' | 'normal' | 'hard' | 'insane'
export type Instrument = 'kick' | 'snare' | 'hat'

export type Puzzle = {
  id: string
  difficulty: Difficulty
  bpm: number
  steps: 16
  activeInstruments: readonly Instrument[]
  kick: readonly number[]
  snare: readonly number[]
  hat?: readonly number[]
}

export const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'insane']

// All hit positions are zero-based. These eight grooves are original BeatGrid
// patterns and are not claimed to come from any particular song.
export const puzzles: readonly Puzzle[] = [
  {
    id: 'easy-steady-four', difficulty: 'easy', bpm: 104, steps: 16,
    activeInstruments: ['kick', 'snare'],
    kick: [0, 4, 8, 12], snare: [4, 12],
  },
  {
    id: 'easy-backbeat', difficulty: 'easy', bpm: 112, steps: 16,
    activeInstruments: ['kick', 'snare'],
    kick: [0, 6, 8, 14], snare: [4, 12],
  },
  {
    id: 'normal-steady-hats', difficulty: 'normal', bpm: 104, steps: 16,
    activeInstruments: ['kick', 'snare', 'hat'],
    kick: [0, 4, 8, 12], snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  {
    id: 'normal-backbeat-hats', difficulty: 'normal', bpm: 112, steps: 16,
    activeInstruments: ['kick', 'snare', 'hat'],
    kick: [0, 6, 8, 14], snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  {
    id: 'hard-eighth-drive', difficulty: 'hard', bpm: 110, steps: 16,
    activeInstruments: ['kick', 'snare', 'hat'],
    kick: [0, 6, 8, 11], snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  {
    id: 'hard-open-pocket', difficulty: 'hard', bpm: 118, steps: 16,
    activeInstruments: ['kick', 'snare', 'hat'],
    kick: [0, 3, 8, 10], snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  {
    id: 'insane-offset-engine', difficulty: 'insane', bpm: 116, steps: 16,
    activeInstruments: ['kick', 'snare', 'hat'],
    kick: [0, 3, 7, 10, 14], snare: [4, 9, 12, 15],
    hat: [0, 2, 3, 5, 6, 8, 10, 11, 13, 14],
  },
  {
    id: 'insane-shifting-pocket', difficulty: 'insane', bpm: 120, steps: 16,
    activeInstruments: ['kick', 'snare', 'hat'],
    kick: [0, 2, 7, 9, 11, 14], snare: [4, 6, 12, 15],
    hat: [0, 1, 3, 4, 6, 7, 8, 10, 12, 13, 15],
  },
]

export function puzzlesForDifficulty(difficulty: Difficulty) {
  return puzzles.filter(puzzle => puzzle.difficulty === difficulty)
}

export function puzzleHits(puzzle: Puzzle, instrument: Instrument) {
  return puzzle[instrument] ?? []
}

export function choosePuzzle(
  difficulty: Difficulty,
  previousId?: string,
  random: () => number = Math.random,
) {
  const pool = puzzlesForDifficulty(difficulty)
  const choices = pool.length > 1 ? pool.filter(puzzle => puzzle.id !== previousId) : pool
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]
}
