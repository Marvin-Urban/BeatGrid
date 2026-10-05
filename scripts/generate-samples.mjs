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

for (const kit of ['modern', 'warm', 'electronic', 'dry']) {
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

// WARM: lower fundamentals, rounder bodies, and slower, softer decays.
writeWav('kits/warm/kick', 0.42, t => {
  const phase = 2 * Math.PI * (43 * t + 75 * 0.035 * (1 - Math.exp(-t / 0.035)))
  return (0.58 * Math.sin(phase) + 0.07 * Math.sin(phase * 2)) * Math.exp(-t * 10)
})
let warmSnareSmooth = 0
writeWav('kits/warm/snare', 0.28, t => {
  const n = noise()
  warmSnareSmooth += 0.1 * (n - warmSnareSmooth)
  const body = 0.13 * Math.sin(2 * Math.PI * 155 * t) + 0.06 * Math.sin(2 * Math.PI * 235 * t)
  return (0.25 * warmSnareSmooth + body) * Math.exp(-t * 15)
})
let warmHatLow = 0
writeWav('kits/warm/hat', 0.11, t => {
  const n = noise()
  warmHatLow += 0.28 * (n - warmHatLow)
  return 0.22 * (n - warmHatLow) * Math.exp(-t * 38)
})

// ELECTRONIC: pronounced transients and synthetic pitched/metallic components.
writeWav('kits/electronic/kick', 0.26, t => {
  const phase = 2 * Math.PI * (50 * t + 175 * 0.014 * (1 - Math.exp(-t / 0.014)))
  const transient = 0.1 * noise() * Math.exp(-t * 220)
  return (0.66 * Math.sin(phase) + 0.07 * Math.sin(phase * 2) + transient) * Math.exp(-t * 19)
})
let electronicSnareLow = 0
writeWav('kits/electronic/snare', 0.18, t => {
  const n = noise()
  electronicSnareLow += 0.45 * (n - electronicSnareLow)
  const clap = Math.exp(-t * 34)
    + (t >= 0.018 ? 0.55 * Math.exp(-(t - 0.018) * 55) : 0)
    + (t >= 0.036 ? 0.35 * Math.exp(-(t - 0.036) * 65) : 0)
  return 0.21 * (n - electronicSnareLow) * clap + 0.11 * Math.sin(2 * Math.PI * 245 * t) * Math.exp(-t * 30)
})
writeWav('kits/electronic/hat', 0.07, t => {
  const metallic = Math.sin(2 * Math.PI * 5100 * t)
    + 0.7 * Math.sin(2 * Math.PI * 6830 * t)
    + 0.45 * Math.sin(2 * Math.PI * 8170 * t)
  return (0.105 * metallic + 0.08 * noise()) * Math.exp(-t * 72)
})

// DRY: deliberately restrained, very short sounds for dense grooves.
writeWav('kits/dry/kick', 0.14, t => {
  const phase = 2 * Math.PI * (58 * t + 85 * 0.012 * (1 - Math.exp(-t / 0.012)))
  return 0.61 * Math.sin(phase) * Math.exp(-t * 34)
})
let drySnareLow = 0
writeWav('kits/dry/snare', 0.11, t => {
  const n = noise()
  drySnareLow += 0.3 * (n - drySnareLow)
  return (0.3 * (n - drySnareLow) + 0.1 * Math.sin(2 * Math.PI * 195 * t)) * Math.exp(-t * 52)
})
let dryHatLow = 0
writeWav('kits/dry/hat', 0.035, t => {
  const n = noise()
  dryHatLow += 0.75 * (n - dryHatLow)
  return 0.28 * (n - dryHatLow) * Math.exp(-t * 130)
})

console.log('Generated five BeatGrid drum kits (mono, 44.1 kHz, 16-bit PCM).')
