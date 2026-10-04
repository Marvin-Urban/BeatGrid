import type { Instrument } from '../data/puzzles'

export type AudioPattern = Record<Instrument, readonly number[]>
const instruments: Instrument[] = ['kick', 'snare', 'hat']
const sampleUrls: Record<Instrument, URL> = {
  kick: new URL('../assets/audio/kick.wav', import.meta.url),
  snare: new URL('../assets/audio/snare.wav', import.meta.url),
  hat: new URL('../assets/audio/hat.wav', import.meta.url),
}

let context: AudioContext | undefined
let samples: Promise<Record<Instrument, AudioBuffer>> | undefined
let busy = false
let generation = 0
let activeSources: AudioBufferSourceNode[] = []
let finishPlayback: (() => void) | undefined
let reportCompletedBars: (() => void) | undefined
let progressTimer: ReturnType<typeof setInterval> | undefined

function getContext() {
  if (!context) {
    if (typeof AudioContext === 'undefined') {
      throw new Error('Web Audio is not supported in this browser. Try a current browser.')
    }
    context = new AudioContext()
  }
  return context
}

function loadSamples(audio: AudioContext) {
  // Cache the promise too, so concurrent requests cannot duplicate loading.
  samples ??= Promise.all(instruments.map(async instrument => {
    const response = await fetch(sampleUrls[instrument], { signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error(`Could not load the ${instrument} sample.`)
    const buffer = await audio.decodeAudioData(await response.arrayBuffer())
    return [instrument, buffer] as const
  })).then(entries => Object.fromEntries(entries) as Record<Instrument, AudioBuffer>)
    .catch(() => {
      samples = undefined // A later click may retry a failed load.
      throw new Error('Drum samples could not load. Check your connection and try again.')
    })
  return samples
}

async function resumeContext(audio: AudioContext) {
  const isRunning = () => audio.state === 'running'
  if (isRunning()) return
  // This deadline only reports an unlock failure; it never schedules drum hits.
  let deadline: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      audio.resume(),
      new Promise<never>((_, reject) => {
        deadline = setTimeout(() => reject(new Error('Audio could not start. Click Listen or Preview to try again.')), 8000)
      }),
    ])
  } finally {
    clearTimeout(deadline)
  }
  if (!isRunning()) throw new Error('Audio is paused. Click Listen or Preview to try again.')
}

export function stopPlayback() {
  reportCompletedBars?.() // Flush the audio clock before cancelling, even in a background tab.
  reportCompletedBars = undefined
  clearInterval(progressTimer)
  progressTimer = undefined
  generation++
  for (const source of activeSources) {
    source.onended = null
    source.stop()
    source.disconnect()
  }
  activeSources = []
  finishPlayback?.()
  finishPlayback = undefined
  busy = false
}

// Resolves after one complete bar (including the last sound's tail), or on Reset.
export async function playPattern(pattern: AudioPattern, bpm: number, steps: number, loop = false, onCompletedBars?: (count: number) => void) {
  if (busy) return
  if (!Number.isFinite(bpm) || bpm <= 0 || !Number.isInteger(steps) || steps <= 0) {
    throw new Error('This puzzle has invalid playback timing.')
  }
  busy = true
  const request = ++generation
  let output: GainNode | undefined
  let audio: AudioContext | undefined
  let onStateChange: (() => void) | undefined
  try {
    // Context creation and resume happen before the first await, in the click gesture.
    audio = getContext()
    const [, buffers] = await Promise.all([resumeContext(audio), loadSamples(audio)])
    if (request !== generation) return
    if (audio.state !== 'running') {
      throw new Error('Audio was interrupted while loading. Click Listen or Preview to try again.')
    }

    const startTime = audio.currentTime + 0.05
    const stepInterval = 60 / bpm / 4
    let endTime = startTime + steps * stepInterval
    output = audio.createGain()
    output.gain.value = 0.55
    output.connect(audio.destination)

    if (loop) {
      // Bake one periodic bar from cached samples. Native buffer looping keeps
      // every repetition on the audio clock, with no JS timer or restart gap.
      const frames = Math.round(steps * stepInterval * audio.sampleRate)
      const bar = audio.createBuffer(1, frames, audio.sampleRate)
      const mix = bar.getChannelData(0)
      for (const instrument of instruments) {
        const buffer = buffers[instrument]
        const sample = buffer.getChannelData(0)
        for (const step of pattern[instrument]) {
          if (!Number.isInteger(step) || step < 0 || step >= steps) continue
          const offset = Math.round(step * stepInterval * audio.sampleRate)
          for (let i = 0; i < sample.length; i++) {
            // Wrap tails over the boundary rather than truncating the sound.
            mix[(offset + i) % frames] += sample[i]
          }
        }
      }
      const source = audio.createBufferSource()
      source.buffer = bar
      source.loop = true
      source.connect(output)
      activeSources.push(source)
      source.start(startTime)
    } else for (const instrument of instruments) {
      for (const step of pattern[instrument]) {
        if (!Number.isInteger(step) || step < 0 || step >= steps) continue
        const source = audio.createBufferSource()
        source.buffer = buffers[instrument]
        source.connect(output)
        activeSources.push(source)
        const when = startTime + step * stepInterval
        source.start(when)
        endTime = Math.max(endTime, when + buffers[instrument].duration)
      }
    }

    if (onCompletedBars) {
      const barDuration = loop
        ? Math.round(steps * stepInterval * audio.sampleRate) / audio.sampleRate
        : steps * stepInterval
      let reported = 0
      reportCompletedBars = () => {
        const elapsed = Math.max(0, audio!.currentTime - startTime)
        const complete = Math.min(loop ? Infinity : 1, Math.floor((elapsed + 1e-9) / barDuration))
        if (complete > reported) {
          const delta = complete - reported
          reported = complete
          onCompletedBars(delta)
        }
      }
      // UI bookkeeping only: reads the audio clock; never starts or schedules hits.
      progressTimer = setInterval(reportCompletedBars, 50)
    }

    // A silent source marks completion on the audio clock, even for an empty grid.
    const endMarker = audio.createBufferSource()
    endMarker.buffer = audio.createBuffer(1, 1, audio.sampleRate)
    endMarker.loop = true
    endMarker.connect(output)
    activeSources.push(endMarker)
    await new Promise<void>((resolve, reject) => {
      finishPlayback = resolve
      endMarker.onended = () => resolve()
      onStateChange = () => {
        if (audio!.state !== 'running') {
          reject(new Error('Audio was interrupted. Click Listen or Preview to try again.'))
        }
      }
      audio!.addEventListener('statechange', onStateChange)
      endMarker.start(startTime)
      if (!loop) endMarker.stop(endTime)
    })
  } finally {
    if (audio && onStateChange) audio.removeEventListener('statechange', onStateChange)
    output?.disconnect()
    if (request === generation) stopPlayback()
  }
}



// Auditions share the existing cache and cancellation path, and contain one hit only.
export function auditionInstrument(instrument: Instrument) {
  const pattern: AudioPattern = { kick: [], snare: [], hat: [] }
  pattern[instrument] = [0]
  return playPattern(pattern, 240, 1)
}

