import type { Instrument } from '../data/puzzles'

export type AudioPattern = Record<Instrument, readonly number[]>
export type PlaybackBeat = 1 | 2 | 3 | 4
export const drumKits = ['current', 'modern'] as const
export type DrumKit = typeof drumKits[number]
const instruments: Instrument[] = ['kick', 'snare', 'hat']
const sampleUrls: Record<DrumKit, Record<Instrument, URL>> = {
  current: {
    kick: new URL('../assets/audio/kick.wav', import.meta.url),
    snare: new URL('../assets/audio/snare.wav', import.meta.url),
    hat: new URL('../assets/audio/hat.wav', import.meta.url),
  },
  modern: {
    kick: new URL('../assets/audio/kits/modern/kick.wav', import.meta.url),
    snare: new URL('../assets/audio/kits/modern/snare.wav', import.meta.url),
    hat: new URL('../assets/audio/kits/modern/hat.wav', import.meta.url),
  },
}

let context: AudioContext | undefined
const sampleCache = new Map<DrumKit, Promise<Record<Instrument, AudioBuffer>>>()
let activeDrumKit: DrumKit = 'current'
let busy = false
let generation = 0
let activeSources: AudioBufferSourceNode[] = []
let auditionSources: AudioBufferSourceNode[] = []
let auditionFinishes = new Map<AudioBufferSourceNode, () => void>()
let auditionGeneration = 0
let finishPlayback: (() => void) | undefined
let reportCompletedBars: (() => void) | undefined
let progressTimer: ReturnType<typeof setInterval> | undefined
let updatePatternLooping: ((enabled: boolean) => void) | undefined
let updateActivePattern: ((pattern: AudioPattern) => void) | undefined
let pendingPatternLooping: boolean | undefined

function getContext() {
  if (!context) {
    if (typeof AudioContext === 'undefined') {
      throw new Error('Web Audio is not supported in this browser. Try a current browser.')
    }
    context = new AudioContext()
  }
  return context
}

function loadSamples(audio: AudioContext, kit: DrumKit) {
  const cached = sampleCache.get(kit)
  if (cached) return cached
  // Cache each kit's promise too, so concurrent requests cannot duplicate loading.
  const loading = Promise.all(instruments.map(async instrument => {
    const response = await fetch(sampleUrls[kit][instrument], { signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error(`Could not load the ${instrument} sample.`)
    const buffer = await audio.decodeAudioData(await response.arrayBuffer())
    return [instrument, buffer] as const
  })).then(entries => Object.fromEntries(entries) as Record<Instrument, AudioBuffer>)
    .catch(() => {
      sampleCache.delete(kit) // A later click may retry a failed load.
      throw new Error('Drum samples could not load. Check your connection and try again.')
    })
  sampleCache.set(kit, loading)
  return loading
}

export function setDrumKit(kit: DrumKit) {
  activeDrumKit = kit
}

function stopAuditions() {
  auditionGeneration++
  for (const source of auditionSources) {
    source.onended = null
    source.stop()
    auditionFinishes.get(source)?.()
  }
  auditionSources = []
  auditionFinishes = new Map()
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
        deadline = setTimeout(() => reject(new Error('Audio could not start. Try the playback control again.')), 8000)
      }),
    ])
  } finally {
    clearTimeout(deadline)
  }
  if (!isRunning()) throw new Error('Audio is paused. Try the playback control again.')
}

export function stopPlayback() {
  reportCompletedBars?.() // Flush the audio clock before cancelling, even in a background tab.
  reportCompletedBars = undefined
  clearInterval(progressTimer)
  progressTimer = undefined
  updatePatternLooping = undefined
  updateActivePattern = undefined
  pendingPatternLooping = undefined
  generation++
  for (const source of activeSources) {
    source.onended = null
    source.stop()
    source.disconnect()
  }
  activeSources = []
  stopAuditions()
  finishPlayback?.()
  finishPlayback = undefined
  busy = false
}

// Changes a dynamic target playback at its next bar boundary. Calls made while
// samples are still loading are retained and applied before playback begins.
export function setPatternLooping(enabled: boolean) {
  if (updatePatternLooping) updatePatternLooping(enabled)
  else if (busy) pendingPatternLooping = enabled
}

export function updatePlayingPattern(pattern: AudioPattern) {
  updateActivePattern?.(pattern)
}

// Resolves after one complete bar (including the last sound's tail), or on Reset.
export async function playPattern(
  pattern: AudioPattern,
  bpm: number,
  steps: number,
  loop = false,
  onCompletedBars?: (count: number) => void,
  allowLoopChanges = false,
  onBeat?: (beat: PlaybackBeat) => void,
  allowPatternChanges = false,
) {
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
    const kit = activeDrumKit
    const [, buffers] = await Promise.all([resumeContext(audio), loadSamples(audio, kit)])
    if (request !== generation) return
    if (audio.state !== 'running') {
      throw new Error('Audio was interrupted while loading. Try the playback control again.')
    }

    const startTime = audio.currentTime + 0.05
    const stepInterval = 60 / bpm / 4
    const beatDuration = stepInterval * 4
    const usesLoopBuffer = loop || allowLoopChanges
    let effectiveLooping = allowLoopChanges ? pendingPatternLooping ?? loop : loop
    pendingPatternLooping = undefined
    let endTime = startTime + steps * stepInterval
    let scheduledStopTime: number | undefined
    let periodicSource: AudioBufferSourceNode | undefined
    output = audio.createGain()
    output.gain.value = 0.55
    output.connect(audio.destination)

    const buildBar = (nextPattern: AudioPattern) => {
      // Bake one periodic bar from cached samples. Native buffer looping keeps
      // every repetition on the audio clock, with no JS timer or restart gap.
      const frames = Math.round(steps * stepInterval * audio!.sampleRate)
      const bar = audio!.createBuffer(1, frames, audio!.sampleRate)
      const mix = bar.getChannelData(0)
      for (const instrument of instruments) {
        const buffer = buffers[instrument]
        const sample = buffer.getChannelData(0)
        for (const step of nextPattern[instrument]) {
          if (!Number.isInteger(step) || step < 0 || step >= steps) continue
          const offset = Math.round(step * stepInterval * audio!.sampleRate)
          for (let i = 0; i < sample.length; i++) {
            // Wrap tails over the boundary rather than truncating the sound.
            mix[(offset + i) % frames] += sample[i]
          }
        }
      }
      return bar
    }

    const createPeriodicSource = (nextPattern: AudioPattern, when: number) => {
      const source = audio!.createBufferSource()
      source.buffer = buildBar(nextPattern)
      source.loop = true
      source.connect(output!)
      activeSources.push(source)
      source.start(when)
      return source
    }

    if (usesLoopBuffer) {
      // Bake one periodic bar from cached samples. Native buffer looping keeps
      // every repetition on the audio clock, with no JS timer or restart gap.
      periodicSource = createPeriodicSource(pattern, startTime)
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

    const barDuration = usesLoopBuffer
      ? Math.round(steps * stepInterval * audio.sampleRate) / audio.sampleRate
      : steps * stepInterval

    if (allowPatternChanges && periodicSource) {
      let currentSource = periodicSource
      let pendingSource: AudioBufferSourceNode | undefined
      let pendingBoundary = 0
      updateActivePattern = nextPattern => {
        if (request !== generation) return
        const elapsed = Math.max(0, audio!.currentTime - startTime)
        const boundary = startTime + (Math.floor((elapsed + 1e-9) / barDuration) + 1) * barDuration
        if (pendingSource) {
          pendingSource.stop(pendingBoundary)
          pendingSource = undefined
        }
        const replacement = createPeriodicSource(nextPattern, boundary)
        replacement.stop(startTime + barDuration * 1_000_000)
        currentSource.stop(boundary)
        pendingSource = replacement
        pendingBoundary = boundary
        currentSource = replacement
      }
    }
    let reportedBeat = -1
    if (onCompletedBars || onBeat) {
      let reported = 0
      reportCompletedBars = () => {
        const elapsed = Math.max(0, audio!.currentTime - startTime)
        const complete = Math.min(usesLoopBuffer ? Infinity : 1, Math.floor((elapsed + 1e-9) / barDuration))
        if (onCompletedBars && complete > reported) {
          const delta = complete - reported
          reported = complete
          onCompletedBars(delta)
        }
      }
      const reportProgress = () => {
        reportCompletedBars?.()
        if (!onBeat || audio!.currentTime + 1e-9 < startTime) return
        const visualStopTime = allowLoopChanges
          ? scheduledStopTime
          : loop ? undefined : startTime + barDuration
        if (visualStopTime !== undefined && audio!.currentTime + 1e-9 >= visualStopTime) return
        const beatIndex = Math.floor((audio!.currentTime - startTime + 1e-9) / beatDuration)
        if (beatIndex > reportedBeat) {
          reportedBeat = beatIndex
          onBeat((beatIndex % 4 + 1) as PlaybackBeat)
        }
      }
      // UI bookkeeping only: it reads the audio clock and never schedules hits.
      progressTimer = setInterval(reportProgress, 25)
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
          reject(new Error('Audio was interrupted. Try the playback control again.'))
        }
      }
      audio!.addEventListener('statechange', onStateChange)
      endMarker.start(startTime)
      if (allowLoopChanges && periodicSource) {
        const dynamicSources = [periodicSource, endMarker]
        const scheduleAtNextBoundary = () => {
          const elapsed = Math.max(0, audio!.currentTime - startTime)
          const nextBar = Math.floor((elapsed + 1e-9) / barDuration) + 1
          scheduledStopTime = startTime + nextBar * barDuration
          for (const source of dynamicSources) source.stop(scheduledStopTime)
        }
        const continueLooping = () => {
          scheduledStopTime = undefined
          // AudioScheduledSourceNode uses the latest stop call. Moving an
          // existing boundary stop far ahead keeps the same source in flight,
          // so there is no restart, overlap, or JavaScript-timer gap.
          const distantStop = startTime + barDuration * 1_000_000
          for (const source of dynamicSources) source.stop(distantStop)
        }
        updatePatternLooping = enabled => {
          if (request !== generation || enabled === effectiveLooping) return
          effectiveLooping = enabled
          if (enabled) continueLooping()
          else scheduleAtNextBoundary()
        }
        if (!effectiveLooping) scheduleAtNextBoundary()
      } else if (!loop) {
        scheduledStopTime = endTime
        endMarker.stop(endTime)
      }
    })
  } finally {
    if (audio && onStateChange) audio.removeEventListener('statechange', onStateChange)
    output?.disconnect()
    if (request === generation) stopPlayback()
  }
}



// Auditions share the context/sample cache but use a separate one-shot lane, so
// editing feedback can sound over a running player loop without stopping it.
export async function auditionInstrument(instrument: Instrument) {
  stopAuditions()
  const request = auditionGeneration
  const audio = getContext()
  const kit = activeDrumKit
  const [, buffers] = await Promise.all([resumeContext(audio), loadSamples(audio, kit)])
  if (request !== auditionGeneration) return
  if (audio.state !== 'running') {
    throw new Error('Audio was interrupted while loading. Try the sound again.')
  }
  const output = audio.createGain()
  output.gain.value = 0.55
  output.connect(audio.destination)
  const source = audio.createBufferSource()
  source.buffer = buffers[instrument]
  source.connect(output)
  auditionSources.push(source)
  await new Promise<void>(resolve => {
    const finish = () => {
      auditionSources = auditionSources.filter(active => active !== source)
      auditionFinishes.delete(source)
      source.disconnect()
      output.disconnect()
      resolve()
    }
    auditionFinishes.set(source, finish)
    source.onended = finish
    source.start(audio.currentTime)
  })
}

