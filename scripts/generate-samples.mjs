// Original, deterministic synthesized one-shots; no third-party recordings.
// Run with: node scripts/generate-samples.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

const sampleRate = 44100
let seed = 246813579
function noise() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return (seed / 4294967296) * 2 - 1
}
function writeWav(name, duration, synth) {
  const frames = Math.round(duration * sampleRate)
  const wav = Buffer.alloc(44 + frames * 2)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(wav.length - 8, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(sampleRate, 24)
  wav.writeUInt32LE(sampleRate * 2, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(frames * 2, 40)
  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate
    const fade = Math.min(1, t / 0.001, (duration - t) / 0.012)
    const value = Math.max(-1, Math.min(1, synth(t) * fade))
    wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2)
  }
  writeFileSync(new URL(`../src/assets/audio/${name}.wav`, import.meta.url), wav)
}

for (const kit of ['modern']) {
  mkdirSync(new URL(`../src/assets/audio/kits/${kit}/`, import.meta.url), { recursive: true })
}

// CURRENT: keep the original baseline synthesis and output paths unchanged.
writeWav('kick', 0.32, t => {
  const phase = 2 * Math.PI * (48 * t + 105 * 0.025 * (1 - Math.exp(-t / 0.025)))
  return 0.65 * Math.sin(phase) * Math.exp(-t * 16)
})
let snareLow = 0
writeWav('snare', 0.20, t => {
  const n = noise()
  snareLow += 0.2 * (n - snareLow)
  return (0.32 * (n - snareLow) + 0.16 * Math.sin(2 * Math.PI * 180 * t)) * Math.exp(-t * 25)
})
let hatLow = 0
writeWav('hat', 0.075, t => {
  const n = noise()
  hatLow += 0.65 * (n - hatLow)
  return 0.3 * (n - hatLow) * Math.exp(-t * 55)
})

// MODERN: compact envelopes, firm pitch drops, and bright controlled noise.
writeWav('kits/modern/kick', 0.20, t => {
  const phase = 2 * Math.PI * (55 * t + 135 * 0.018 * (1 - Math.exp(-t / 0.018)))
  const click = 0.07 * noise() * Math.exp(-t * 180)
  return (0.62 * Math.sin(phase) + click) * Math.exp(-t * 24)
})
let modernSnareLow = 0
writeWav('kits/modern/snare', 0.14, t => {
  const n = noise()
  modernSnareLow += 0.32 * (n - modernSnareLow)
  return (0.36 * (n - modernSnareLow) + 0.13 * Math.sin(2 * Math.PI * 215 * t)) * Math.exp(-t * 36)
})
let modernHatLow = 0
writeWav('kits/modern/hat', 0.05, t => {
  const n = noise()
  modernHatLow += 0.72 * (n - modernHatLow)
  return 0.29 * (n - modernHatLow) * Math.exp(-t * 88)
})

console.log('Generated two BeatGrid drum kits (mono, 44.1 kHz, 16-bit PCM).')
