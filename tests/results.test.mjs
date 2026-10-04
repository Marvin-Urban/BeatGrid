import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateMemoryBonus, normalizeSongGuess, matchesSongGuess, cellOutcome } from '../src/game/results.ts'

test('memory reward boundaries, including zero and invalid listens', () => {
  assert.deepEqual(Array.from({length: 10}, (_, n) => calculateMemoryBonus(n)), [0, 10, 8, 6, 4, 4, 2, 2, 0, 0])
  for (const value of [-1, 1.5, NaN, Infinity]) assert.equal(calculateMemoryBonus(value), 0)
})

test('song matching handles case, whitespace, punctuation and aliases without empty matches', () => {
  const song = { songTitle: 'A Test Song!', acceptedSongAnswers: ['Test Song'] }
  assert.equal(normalizeSongGuess('  A TEST—Song! '), 'atestsong')
  assert.equal(matchesSongGuess(' a test-song ', song), true)
  assert.equal(matchesSongGuess('TEST SONG.', song), true)
  assert.equal(matchesSongGuess('another song', song), false)
  assert.equal(matchesSongGuess('?! ', song), false)
  assert.equal(matchesSongGuess('', song), false)
})

test('reveal distinguishes all four cell states', () => {
  assert.equal(cellOutcome(true, true), 'correct')
  assert.equal(cellOutcome(false, true), 'missed')
  assert.equal(cellOutcome(true, false), 'extra')
  assert.equal(cellOutcome(false, false), 'empty')
})
