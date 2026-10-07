import assert from 'node:assert/strict'
import { test } from 'node:test'

let moduleId = 0
async function setup({ failFetch = false, failResume = false } = {}) {
  const contexts = []
  const requests = []
  let fail = failFetch
  class Context extends EventTarget {
    state = 'suspended'
    currentTime = 10
    sampleRate = 44100
    destination = {}
    sources = []
    decoded = 0
    resumes = 0
    constructor() { super(); contexts.push(this) }
    async resume() {
      this.resumes++
      if (failResume) throw new Error('Device unavailable')
      this.state = 'running'
    }
    async decodeAudioData() { this.decoded++; return { duration: 0.32, getChannelData: () => new Float32Array([1, 0.5]) } }
    createBuffer(channels, frames, rate) { const data = new Float32Array(frames); return { duration: frames / rate, getChannelData: () => data } }
    createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} } }
    createBufferSource() {
      const source = {
        loop: false, buffer: null, onended: null, starts: [], stops: [],
        connect() {}, disconnect() {},
        start(time) { this.starts.push(time) },
        stop(time) { this.stops.push(time) },
      }
      this.sources.push(source)
      return source
    }
  }
  globalThis.AudioContext = Context
  globalThis.fetch = async url => {
    requests.push(String(url))
    if (fail) return { ok: false }
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }
  }
  const engine = await import(`../src/audio/audioEngine.ts?test=${moduleId++}`)
  return { engine, contexts, requests, allowFetch: () => { fail = false } }
}
const target = { kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] }
const empty = { kick: [], snare: [], hat: [] }
const flush = () => new Promise(resolve => setImmediate(resolve))
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
function end(context) { context.sources.findLast(source => source.loop).onended() }

test('target uses audio-clock sixteenths; repeated requests cannot overlap; buffers/context are reused', async () => {
  const { engine, contexts, requests } = await setup()
  const playing = engine.playPattern(target, 120, 16)
  await flush()
  const ctx = contexts[0]
  assert.equal(ctx.resumes, 1)
  assert.equal(ctx.sources.length, 15)
  const expected = Object.values(target).flat().map(step => 10.05 + step * 0.125)
  assert.deepEqual(ctx.sources.slice(0, -1).map(source => source.starts[0]), expected)
  assert.ok(Math.abs(ctx.sources.at(-1).stops[0] - 12.12) < 1e-9) // hat tail in this mock extends the bar
  await engine.playPattern(target, 120, 16)
  assert.equal(ctx.sources.length, 15)
  end(ctx)
  await playing
  const replay = engine.playPattern(target, 120, 16)
  await flush()
  assert.equal(contexts.length, 1)
  assert.equal(requests.length, 3)
  assert.equal(ctx.decoded, 3)
  end(ctx)
  await replay
})

test('empty and dense previews complete; Reset stops every scheduled source', async () => {
  const { engine, contexts } = await setup()
  const silence = engine.playPattern(empty, 120, 16)
  await flush()
  const ctx = contexts[0]
  assert.equal(ctx.sources.length, 1)
  assert.equal(ctx.sources[0].stops[0], 12.05)
  end(ctx)
  await silence
  const all = Array.from({ length: 16 }, (_, i) => i)
  const dense = engine.playPattern({ kick: all, snare: all, hat: all }, 120, 16)
  await flush()
  assert.equal(ctx.sources.length, 50)
  engine.stopPlayback()
  await dense
  assert.ok(ctx.sources.every(source => source.stops.length > 0))
})

test('Reset during loading cancels stale playback and permits a fresh request', async () => {
  const { engine, contexts } = await setup()
  const first = engine.playPattern(target, 120, 16)
  engine.stopPlayback()
  const second = engine.playPattern({ ...empty, kick: [0] }, 120, 16)
  await flush()
  assert.equal(contexts[0].sources.length, 2)
  end(contexts[0])
  await Promise.all([first, second])
})

test('sample loading errors are readable and retry succeeds', async () => {
  const { engine, contexts, allowFetch } = await setup({ failFetch: true })
  await assert.rejects(engine.playPattern(target, 120, 16), /samples could not load/)
  allowFetch()
  const retry = engine.playPattern(target, 120, 16)
  await flush()
  end(contexts[0])
  await retry
})

test('resume failures reject; interruptions stop audio and permit resume on next gesture', async () => {
  const failed = await setup({ failResume: true })
  await assert.rejects(failed.engine.playPattern(target, 120, 16), /Device unavailable/)
  const { engine, contexts } = await setup()
  const playing = engine.playPattern(target, 120, 16)
  await flush()
  const ctx = contexts[0]
  const rejection = assert.rejects(playing, /interrupted/)
  ctx.state = 'suspended'
  ctx.dispatchEvent(new Event('statechange'))
  await rejection
  assert.ok(ctx.sources.every(source => source.stops.length > 0))
  const retry = engine.playPattern(empty, 120, 16)
  await flush()
  assert.equal(ctx.resumes, 2)
  end(ctx)
  await retry
})


test('native target loop is exactly one bar, remains active, and stops on cancellation', async () => {
  const { engine, contexts, requests } = await setup()
  const playing = engine.playPattern(target, 120, 16, true)
  await flush()
  const ctx = contexts[0]
  const loop = ctx.sources[0]
  assert.equal(loop.loop, true)
  assert.equal(loop.buffer.duration, 2)
  assert.equal(loop.stops.length, 0)
  const data = loop.buffer.getChannelData(0)
  assert.equal(data[0], 2) // kick + hat
  assert.equal(data[22050], 3) // kick + snare + hat at beat 2
  assert.equal(data[11025], 1) // hat at step 3
  engine.stopPlayback()
  await playing
  assert.ok(ctx.sources.every(source => source.stops.length > 0))
  assert.equal(requests.length, 3)
})

test('whole-kit selection loads each kit once and reuses its decoded buffers', async () => {
  const { engine, contexts, requests } = await setup()
  assert.deepEqual(engine.drumKits, ['current', 'modern'])
  const ctxSources = []

  for (const kit of engine.drumKits) {
    engine.setDrumKit(kit)
    const before = contexts[0]?.sources.length ?? 0
    const playing = engine.playPattern(empty, 120, 16)
    await flush()
    const ctx = contexts[0]
    ctxSources.push(ctx.sources.length - before)
    end(ctx)
    await playing
  }

  assert.deepEqual(ctxSources, [1, 1])
  assert.equal(requests.length, 6)
  for (const kit of engine.drumKits.slice(1)) {
    assert.equal(requests.filter(url => url.includes(`/kits/${kit}/`)).length, 3)
  }

  engine.setDrumKit('current')
  const replay = engine.playPattern(empty, 120, 16)
  await flush()
  end(contexts[0])
  await replay
  assert.equal(requests.length, 6)
})

test('a running player loop swaps patterns on the next bar without restarting its transport', async () => {
  const { engine, contexts } = await setup()
  const playing = engine.playPattern(target, 120, 16, true, undefined, false, undefined, true)
  await flush()
  const ctx = contexts[0]
  const original = ctx.sources[0]
  const originalStart = original.starts[0]

  ctx.currentTime = 10.7
  engine.updatePlayingPattern({ ...empty, kick: [4] })
  const replacement = ctx.sources.at(-1)
  assert.equal(original.starts.length, 1)
  assert.equal(replacement.starts[0], 12.05)
  assert.equal(original.stops.at(-1), 12.05)

  ctx.currentTime = 11.1
  engine.updatePlayingPattern({ ...empty, snare: [8] })
  const latest = ctx.sources.at(-1)
  assert.equal(replacement.stops.at(-1), 12.05)
  assert.equal(latest.starts[0], 12.05)
  assert.equal(originalStart, 10.05)

  engine.stopPlayback()
  await playing
})

test('dynamic target playback moves between one-shot and looping at exact bar boundaries without new sources', async () => {
  const { engine, contexts } = await setup()
  let count = 0
  const playing = engine.playPattern(target, 120, 16, false, delta => { count += delta }, true)
  await flush()
  const ctx = contexts[0]
  const sources = [...ctx.sources]
  assert.equal(sources.length, 2) // one baked bar plus its silent completion marker
  assert.ok(sources.every(source => source.loop))
  assert.ok(sources.every(source => Math.abs(source.stops.at(-1) - 12.05) < 1e-9))

  ctx.currentTime = 11
  engine.setPatternLooping(true)
  assert.equal(ctx.sources.length, 2)
  assert.ok(sources.every(source => source.stops.at(-1) > 1000))

  ctx.currentTime = 12.6
  engine.setPatternLooping(false)
  assert.equal(ctx.sources.length, 2)
  assert.ok(sources.every(source => Math.abs(source.stops.at(-1) - 14.05) < 1e-9))

  ctx.currentTime = 14.05
  end(ctx)
  await playing
  assert.equal(count, 2)
})

test('a loop preference change during sample loading is applied before the first bar ends', async () => {
  const { engine, contexts } = await setup()
  const playing = engine.playPattern(target, 120, 16, false, undefined, true)
  engine.setPatternLooping(true)
  await flush()
  const ctx = contexts[0]
  assert.equal(ctx.sources.length, 2)
  assert.ok(ctx.sources.every(source => source.stops.length === 0))
  engine.stopPlayback()
  await playing
})

test('beat callbacks follow the audio clock and stop with playback', async () => {
  const { engine, contexts } = await setup()
  const beats = []
  const playing = engine.playPattern(target, 120, 16, true, undefined, false, beat => beats.push(beat))
  await flush()
  const ctx = contexts[0]
  for (const time of [10.051, 10.551, 11.051, 11.551]) {
    ctx.currentTime = time
    await wait(40)
  }
  assert.deepEqual(beats, [1, 2, 3, 4])
  engine.stopPlayback()
  await playing
  ctx.currentTime = 12.051
  await wait(40)
  assert.deepEqual(beats, [1, 2, 3, 4])
})

test('each audition schedules exactly one independent sample and reuses cached buffers', async () => {
  const { engine, contexts, requests } = await setup()
  for (const instrument of ['kick', 'snare', 'hat']) {
    const playing = engine.auditionInstrument(instrument)
    await flush()
    const ctx = contexts[0]
    const hit = ctx.sources.at(-1)
    assert.equal(hit.loop, false)
    assert.equal(hit.starts.length, 1)
    hit.onended()
    await playing
  }
  assert.equal(contexts[0].decoded, 3)
  assert.equal(requests.length, 3)
})

test('auditions do not stop a running pattern loop', async () => {
  const { engine, contexts } = await setup()
  const loop = engine.playPattern(target, 120, 16, true)
  await flush()
  const loopSource = contexts[0].sources[0]
  const audition = engine.auditionInstrument('kick')
  await flush()
  const hit = contexts[0].sources.at(-1)
  assert.equal(loopSource.stops.length, 0)
  assert.equal(hit.starts.length, 1)
  hit.onended()
  await audition
  assert.equal(loopSource.stops.length, 0)
  engine.stopPlayback()
  await loop
})

test('target count uses complete audio-clock bars and flushes all loop repetitions on stop', async () => {
  const { engine, contexts } = await setup()
  let count = 0
  const playing = engine.playPattern(target, 120, 16, true, delta => { count += delta })
  await flush()
  assert.equal(count, 0)
  contexts[0].currentTime = 16.55 // 3 complete bars plus half a second
  engine.stopPlayback()
  await playing
  assert.equal(count, 3)
  engine.stopPlayback()
  assert.equal(count, 3) // no duplicate completion when stopping twice
})

test('rapid loop replacement leaves one scheduler and counts each completed bar once', async () => {
  const { engine, contexts } = await setup()
  let count = 0
  const done = delta => { count += delta }
  const first = engine.playPattern(target, 120, 16, true, done)
  await flush()
  const ctx = contexts[0]
  const firstSources = [...ctx.sources]
  ctx.currentTime = 12.05
  engine.stopPlayback()
  await first
  assert.equal(count, 1)
  assert.ok(firstSources.every(source => source.stops.length === 1))

  const second = engine.playPattern(target, 120, 16, true, done)
  await flush()
  const sourceCount = ctx.sources.length
  await engine.playPattern(target, 120, 16, true, done)
  assert.equal(ctx.sources.length, sourceCount)
  ctx.currentTime = 14.2
  engine.stopPlayback()
  await second
  assert.equal(count, 2)
})

test('rapid auditions cancel the previous one-shot without touching pattern state', async () => {
  const { engine, contexts } = await setup()
  const first = engine.auditionInstrument('kick')
  await flush()
  const firstHit = contexts[0].sources.at(-1)
  const second = engine.auditionInstrument('snare')
  await flush()
  const secondHit = contexts[0].sources.at(-1)
  assert.equal(firstHit.stops.length, 1)
  assert.notEqual(firstHit, secondHit)
  secondHit.onended()
  await Promise.all([first, second])
})

test('normal playback counts once; partial, failed and cancelled-loading playback never count', async () => {
  const { engine, contexts } = await setup()
  let count = 0
  const done = delta => { count += delta }
  const partial = engine.playPattern(target, 120, 16, false, done)
  await flush()
  contexts[0].currentTime = 11
  engine.stopPlayback()
  await partial
  assert.equal(count, 0)
  const full = engine.playPattern(target, 120, 16, false, done)
  await flush()
  contexts[0].currentTime = 15
  end(contexts[0])
  await full
  assert.equal(count, 1)
  const pending = engine.playPattern(target, 120, 16, true, done)
  engine.stopPlayback()
  await pending
  assert.equal(count, 1)
  const failing = await setup({ failFetch: true })
  await assert.rejects(failing.engine.playPattern(target, 120, 16, false, done))
  assert.equal(count, 1)
})
