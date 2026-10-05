import assert from 'node:assert/strict'
import { test } from 'node:test'
import { choosePuzzle, difficulties, puzzles, puzzlesForDifficulty } from '../src/data/puzzles.ts'
import { createEmptyGrid, patternFromGrid, scoreGrid } from '../src/game/scoring.ts'
import { cellOutcome } from '../src/game/results.ts'
import { personalBestKey, readPersonalBest, updatePersonalBest } from '../src/game/personalRecords.ts'
import { toAttemptInsert } from '../src/backend/types.ts'

test('library contains exactly two valid handcrafted puzzles per difficulty', () => {
  assert.deepEqual(difficulties, ['easy', 'normal', 'hard', 'insane'])
  assert.equal(puzzles.length, 8)
  for (const difficulty of difficulties) {
    const pool = puzzlesForDifficulty(difficulty)
    assert.equal(pool.length, 2)
    assert.ok(pool.every(puzzle => puzzle.difficulty === difficulty && puzzle.steps === 16))
  }
  assert.ok(puzzlesForDifficulty('easy').every(puzzle =>
    puzzle.activeInstruments.join(',') === 'kick,snare' && puzzle.hat === undefined))
  assert.ok(puzzlesForDifficulty('normal').every(puzzle =>
    puzzle.activeInstruments.join(',') === 'kick,snare,hat'))
  assert.ok(puzzlesForDifficulty('hard').every(puzzle =>
    puzzle.activeInstruments.join(',') === 'kick,snare,hat'))
  assert.ok(puzzlesForDifficulty('insane').every(puzzle =>
    puzzle.activeInstruments.join(',') === 'kick,snare,hat'))

  const kickSnareSignature = puzzle => `${puzzle.kick.join(',')}|${puzzle.snare.join(',')}`
  assert.deepEqual(
    puzzlesForDifficulty('normal').map(kickSnareSignature).sort(),
    puzzlesForDifficulty('easy').map(kickSnareSignature).sort(),
  )
  assert.deepEqual(puzzlesForDifficulty('hard').map(puzzle => puzzle.id), ['hard-eighth-drive', 'hard-open-pocket'])
  assert.deepEqual(puzzlesForDifficulty('insane').map(puzzle => puzzle.id), ['insane-offset-engine', 'insane-shifting-pocket'])
})

test('selection stays in its pool and avoids an immediate repeat', () => {
  const first = choosePuzzle('easy', undefined, () => 0)
  const second = choosePuzzle('easy', first.id, () => 0)
  assert.equal(first.difficulty, 'easy')
  assert.equal(second.difficulty, 'easy')
  assert.notEqual(first.id, second.id)
})

function perfectGrid(puzzle) {
  const grid = createEmptyGrid(puzzle.steps)
  for (const instrument of puzzle.activeInstruments) {
    for (const step of puzzle[instrument] ?? []) grid[instrument][step] = true
  }
  return grid
}

test('blank attempts score 0 and perfect attempts score 100 across active-row counts', () => {
  const easy = puzzlesForDifficulty('easy')[0]
  const normal = puzzlesForDifficulty('normal')[0]
  assert.equal(scoreGrid(createEmptyGrid(16), easy).percentage, 0)
  assert.equal(scoreGrid(createEmptyGrid(16), normal).percentage, 0)
  assert.equal(scoreGrid(perfectGrid(easy), easy).percentage, 100)
  assert.equal(scoreGrid(perfectGrid(normal), normal).percentage, 100)
})

test('misses and extras penalize only their active instrument, and misplaced hits count as both', () => {
  const easy = puzzlesForDifficulty('easy')[0]

  const missed = perfectGrid(easy)
  missed.kick[0] = false
  const missedScore = scoreGrid(missed, easy)
  assert.equal(missedScore.percentage, 87.5)
  assert.equal(missedScore.instrumentScores.kick.score, 0.75)
  assert.equal(missedScore.instrumentScores.snare.score, 1)
  assert.equal(missedScore.missed, 1)
  assert.equal(missedScore.extra, 0)

  const extra = perfectGrid(easy)
  extra.kick[1] = true
  const extraScore = scoreGrid(extra, easy)
  assert.equal(extraScore.percentage, 87.5)
  assert.equal(extraScore.instrumentScores.kick.score, 0.75)
  assert.equal(extraScore.instrumentScores.snare.score, 1)
  assert.equal(extraScore.missed, 0)
  assert.equal(extraScore.extra, 1)

  const misplaced = perfectGrid(easy)
  misplaced.kick[0] = false
  misplaced.kick[1] = true
  const misplacedScore = scoreGrid(misplaced, easy)
  assert.equal(misplacedScore.percentage, 75)
  assert.equal(misplacedScore.missed, 1)
  assert.equal(misplacedScore.extra, 1)
})

test('inactive rows never affect scoring or playback patterns, and scores clamp at zero', () => {
  const easy = puzzlesForDifficulty('easy')[0]
  const perfect = perfectGrid(easy)
  perfect.hat.fill(true)
  assert.equal(scoreGrid(perfect, easy).percentage, 100)
  assert.equal(patternFromGrid(perfect, easy).hat.length, 0)

  const overloaded = createEmptyGrid(16)
  overloaded.kick.fill(true)
  overloaded.snare.fill(true)
  const score = scoreGrid(overloaded, easy)
  assert.equal(score.percentage, 0)
  assert.equal(score.instrumentScores.kick.score, 0)
  assert.equal(score.instrumentScores.snare.score, 0)
})

test('a zero-target active row scores zero rather than dividing by zero or rewarding silence', () => {
  const puzzle = {
    id: 'edge-zero-row', difficulty: 'easy', bpm: 100, steps: 16,
    activeInstruments: ['kick', 'snare'], kick: [], snare: [4],
  }
  const score = scoreGrid(perfectGrid(puzzle), puzzle)
  assert.equal(score.percentage, 50)
  assert.equal(score.instrumentScores.kick.score, 0)
  assert.equal(score.instrumentScores.kick.targetHits, 0)
})

test('personal best records only improve after a perfect round', () => {
  const values = new Map()
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }

  assert.deepEqual(updatePersonalBest('puzzle-a', 3, 99.9, storage), { best: null, isNew: false })
  assert.equal(values.size, 0)
  assert.deepEqual(updatePersonalBest('puzzle-a', 3, 100, storage), { best: 3, isNew: true })
  assert.equal(values.get('beatgrid.bestListens.puzzle-a'), '3')
  assert.deepEqual(updatePersonalBest('puzzle-a', 5, 100, storage), { best: 3, isNew: false })
  assert.deepEqual(updatePersonalBest('puzzle-a', 2, 100, storage), { best: 2, isNew: true })
  assert.deepEqual(updatePersonalBest('puzzle-a', 1, 98, storage), { best: 2, isNew: false })
  assert.deepEqual(updatePersonalBest('puzzle-b', 4, 100, storage), { best: 4, isNew: true })
  assert.equal(readPersonalBest('puzzle-a', storage), 2)
  assert.equal(readPersonalBest('puzzle-b', storage), 4)
  assert.equal(personalBestKey('puzzle-b'), 'beatgrid.bestListens.puzzle-b')
})

test('personal best storage fails safely for malformed or unavailable data', () => {
  const malformed = { getItem: () => 'not-a-number', setItem: () => {} }
  const unavailable = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
  assert.equal(readPersonalBest('puzzle-a', malformed), null)
  assert.equal(readPersonalBest('puzzle-a', unavailable), null)
  assert.deepEqual(updatePersonalBest('puzzle-a', 1, 100, unavailable), { best: null, isNew: false })
})

test('completed attempts map cleanly to backend rows', () => {
  assert.deepEqual(toAttemptInsert({
    puzzleId: 'easy-steady-four',
    difficulty: 'easy',
    accuracy: 100,
    targetListens: 2,
    isPerfect: true,
  }, 'player-id'), {
    player_id: 'player-id',
    puzzle_id: 'easy-steady-four',
    difficulty: 'easy',
    accuracy: 100,
    target_listens: 2,
    is_perfect: true,
  })
})

test('reveal distinguishes all four cell states', () => {
  assert.equal(cellOutcome(true, true), 'correct')
  assert.equal(cellOutcome(false, true), 'missed')
  assert.equal(cellOutcome(true, false), 'extra')
  assert.equal(cellOutcome(false, false), 'empty')
})
