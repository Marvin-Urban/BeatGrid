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

test('scoring and player patterns use only active instruments', () => {
  const easy = puzzlesForDifficulty('easy')[0]
  const grid = createEmptyGrid(16)
  grid.hat.fill(true)
  const score = scoreGrid(grid, easy)
  assert.equal(score.total, 32)
  assert.equal(score.correct, 26)
  assert.equal(patternFromGrid(grid, easy).hat.length, 0)

  for (const instrument of easy.activeInstruments) {
    for (const step of easy[instrument] ?? []) grid[instrument][step] = true
  }
  assert.deepEqual(scoreGrid(grid, easy), { correct: 32, total: 32, percentage: 100 })
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
