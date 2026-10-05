import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const audioUrl = new URL('../src/assets/audio/', import.meta.url)
const kits = ['current', 'modern', 'warm', 'electronic', 'dry']
const instruments = ['kick', 'snare', 'hat']
const baselineHashes = {
  kick: '06a2ec3ed073b6e57fd109fde4f081426bd7d3158b0a4a246be3ba8f26d360fe',
  snare: 'a21b6a70185e461f307e4dc28c8076bf9b994342ca2640c711f2822242bf9e0b',
  hat: 'f800a5fe609fc2418d87b8d1c6e60525c989ccd4cb905f564fcdecb7673ff110',
}

function sampleBuffer(kit, instrument) {
  const relative = kit === 'current' ? `${instrument}.wav` : `kits/${kit}/${instrument}.wav`
  return readFileSync(new URL(relative, audioUrl))
}

function hash(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function rms(buffer) {
  let sum = 0
  const samples = (buffer.length - 44) / 2
  for (let offset = 44; offset < buffer.length; offset += 2) {
    const value = buffer.readInt16LE(offset) / 32768
    sum += value * value
  }
  return Math.sqrt(sum / samples)
}

test('the Current kit remains byte-for-byte identical to the original baseline', () => {
  for (const instrument of instruments) {
    assert.equal(hash(sampleBuffer('current', instrument)), baselineHashes[instrument])
  }
})

test('all five local kits contain valid, audible, intentionally distinct PCM assets', () => {
  for (const instrument of instruments) {
    const hashes = new Set()
    for (const kit of kits) {
      const buffer = sampleBuffer(kit, instrument)
      assert.equal(buffer.toString('ascii', 0, 4), 'RIFF')
      assert.equal(buffer.toString('ascii', 8, 12), 'WAVE')
      assert.equal(buffer.readUInt32LE(24), 44100)
      assert.equal(buffer.readUInt16LE(34), 16)
      assert.ok(rms(buffer) > 0.005, `${kit} ${instrument} should be audible`)
      hashes.add(hash(buffer))
    }
    assert.equal(hashes.size, kits.length, `${instrument} should differ across every kit`)
  }
})
