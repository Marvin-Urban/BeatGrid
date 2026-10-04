import type { Puzzle } from '../data/puzzles'

// Secondary reward only; never changes the rhythm accuracy percentage.
const memoryRewards = [
  { maxListens: 1, bonus: 10 },
  { maxListens: 2, bonus: 8 },
  { maxListens: 3, bonus: 6 },
  { maxListens: 5, bonus: 4 },
  { maxListens: 7, bonus: 2 },
]

export function calculateMemoryBonus(listenCount: number) {
  if (!Number.isInteger(listenCount) || listenCount <= 0) return 0
  return memoryRewards.find(tier => listenCount <= tier.maxListens)?.bonus ?? 0
}

export function normalizeSongGuess(value: string) {
  return value.normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

export function matchesSongGuess(guess: string, puzzle: Pick<Puzzle, 'songTitle' | 'acceptedSongAnswers'>) {
  const normalized = normalizeSongGuess(guess)
  return normalized.length > 0 && [puzzle.songTitle, ...(puzzle.acceptedSongAnswers ?? [])]
    .some(answer => normalizeSongGuess(answer) === normalized)
}

export function cellOutcome(placed: boolean, target: boolean) {
  if (placed && target) return 'correct'
  if (!placed && target) return 'missed'
  if (placed && !target) return 'extra'
  return 'empty'
}
