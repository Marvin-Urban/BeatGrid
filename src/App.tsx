import { useEffect, useRef, useState } from 'react'
import {
  choosePuzzle,
  difficulties,
  puzzleHits,
  type Difficulty,
  type Instrument,
  type Puzzle,
} from './data/puzzles'
import { createEmptyGrid, patternFromGrid, scoreGrid, type PlayerGrid } from './game/scoring'
import { cellOutcome } from './game/results'
import { readPersonalBest, updatePersonalBest } from './game/personalRecords'
import {
  auditionInstrument,
  drumKits,
  playPattern,
  setDrumKit as setAudioDrumKit,
  setPatternLooping,
  stopPlayback,
  type AudioPattern,
  type DrumKit,
  type PlaybackBeat,
} from './audio/audioEngine'
import beatGridLogo from './assets/beatgrid-logo.png'
import './App.css'

type GamePhase = 'select' | 'memorise' | 'recreate' | 'reveal'
type Playback = 'targetOnce' | 'targetLoop' | 'playerLoop'
type PulseMode = 'four-beat' | 'half-time'
const labels: Record<Instrument, string> = { kick: 'Kick', snare: 'Snare', hat: 'Hi-Hat' }
const outcomeLabels = { correct: 'Correct hit', missed: 'Missed hit', extra: 'Extra hit', empty: 'Correctly empty' }
const outcomeSymbols = { correct: '●', missed: '○', extra: '×', empty: '' }
const difficultyCopy: Record<Difficulty, string> = {
  easy: 'Easy', normal: 'Normal', hard: 'Hard', insane: 'Insane',
}
const phaseLabels: Partial<Record<GamePhase, string>> = {
  memorise: '01 / MEMORISE', recreate: '02 / RECREATE', reveal: '03 / REVEAL',
}
const devKitStorageKey = 'beatgrid.devKit'
const devPulseStorageKey = 'beatgrid.devPulse'
const devKitLabels: Record<DrumKit, string> = {
  current: 'Current', modern: 'Modern', warm: 'Warm', electronic: 'Electronic', dry: 'Dry',
}

function readDevKit(): DrumKit {
  try {
    const stored = window.localStorage.getItem(devKitStorageKey)
    return drumKits.find(kit => kit === stored) ?? 'current'
  } catch {
    return 'current'
  }
}

function readDevPulse(): PulseMode {
  try {
    return window.localStorage.getItem(devPulseStorageKey) === 'half-time' ? 'half-time' : 'four-beat'
  } catch {
    return 'four-beat'
  }
}

function Brand() {
  return <span className="brand"><img className="brand-logo" src={beatGridLogo} alt="BeatGrid" /></span>
}

function DevKitSelector({ selected, onSelect }: { selected: DrumKit, onSelect: (kit: DrumKit) => void }) {
  return <aside className="dev-kit" aria-label="Temporary developer drum-kit audition">
    <span className="dev-kit-label">DEV KIT</span>
    <div className="dev-kit-options" role="group" aria-label="Drum kit">
      {drumKits.map(kit => <button key={kit} type="button" aria-pressed={selected === kit}
        onClick={() => onSelect(kit)}>{devKitLabels[kit]}</button>)}
    </div>
  </aside>
}

function DevPulseSelector({ selected, onSelect }: { selected: PulseMode, onSelect: (mode: PulseMode) => void }) {
  return <aside className="dev-kit dev-pulse" aria-label="Temporary developer beat-flash style">
    <span className="dev-kit-label">DEV PULSE</span>
    <div className="dev-kit-options" role="group" aria-label="Beat flash style">
      <button type="button" aria-pressed={selected === 'four-beat'} onClick={() => onSelect('four-beat')}>4-BEAT</button>
      <button type="button" aria-pressed={selected === 'half-time'} onClick={() => onSelect('half-time')}>2-BEAT</button>
    </div>
  </aside>
}

function DevTools({ drumKit, onKitSelect, pulseMode, onPulseSelect }: {
  drumKit: DrumKit
  onKitSelect: (kit: DrumKit) => void
  pulseMode: PulseMode
  onPulseSelect: (mode: PulseMode) => void
}) {
  return <div className="dev-tools">
    <DevKitSelector selected={drumKit} onSelect={onKitSelect} />
    <DevPulseSelector selected={pulseMode} onSelect={onPulseSelect} />
  </div>
}

function listenLabel(value: number) {
  return value === 1 ? '1 listen' : `${value} listens`
}

function SpeakerIcon() {
  return <svg className="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></svg>
}

function PlayIcon() {
  return <svg className="control-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z" /></svg>
}

function StopIcon() {
  return <svg className="control-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
}

function LoopIcon() {
  return <svg className="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M17 2l3 3-3 3" /><path d="M3 11V9a4 4 0 0 1 4-4h13" /><path d="m7 22-3-3 3-3" /><path d="M21 13v2a4 4 0 0 1-4 4H4" /></svg>
}

function ArrowIcon() {
  return <svg className="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}

function ChevronIcon() {
  return <svg className="chip-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
}

function targetPattern(puzzle: Puzzle): AudioPattern {
  return {
    kick: puzzle.activeInstruments.includes('kick') ? puzzleHits(puzzle, 'kick') : [],
    snare: puzzle.activeInstruments.includes('snare') ? puzzleHits(puzzle, 'snare') : [],
    hat: puzzle.activeInstruments.includes('hat') ? puzzleHits(puzzle, 'hat') : [],
  }
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('select')
  const phaseRef = useRef<GamePhase>('select')
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [grid, setGrid] = useState<PlayerGrid>(() => createEmptyGrid(16))
  const [playback, setPlayback] = useState<Playback | null>(null)
  const playbackRef = useRef<Playback | null>(null)
  const [targetLoopEnabled, setTargetLoopEnabled] = useState(false)
  const targetLoopEnabledRef = useRef(false)
  const [audioError, setAudioError] = useState('')
  const [panelBeat, setPanelBeat] = useState<PlaybackBeat | 'half' | null>(null)
  const [difficultyMenuOpen, setDifficultyMenuOpen] = useState(false)
  const [drumKit, setDrumKit] = useState<DrumKit>(readDevKit)
  const [pulseMode, setPulseMode] = useState<PulseMode>(readDevPulse)
  const pulseModeRef = useRef<PulseMode>(pulseMode)
  const playbackRequest = useRef(0)
  const auditionRequest = useRef(0)
  const lastPuzzleIds = useRef<Partial<Record<Difficulty, string>>>({})
  const [listenCount, setListenCount] = useState(0)
  const [result, setResult] = useState<ReturnType<typeof scoreGrid> | null>(null)
  const [personalBest, setPersonalBest] = useState<number | null>(null)
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false)
  const phaseHeading = useRef<HTMLHeadingElement>(null)
  const difficultyMenu = useRef<HTMLDivElement>(null)
  const difficultyButton = useRef<HTMLButtonElement>(null)

  useEffect(() => () => {
    playbackRequest.current++
    auditionRequest.current++
    stopPlayback()
  }, [])
  useEffect(() => {
    void import('./backend/resultsService')
      .then(service => service.initializePlayerSession())
      .catch(error => console.warn('BeatGrid could not load remote persistence.', error))
  }, [])
  useEffect(() => {
    if (phase !== 'select' && phase !== 'memorise') phaseHeading.current?.focus()
  }, [phase])
  useEffect(() => setAudioDrumKit(drumKit), [drumKit])
  useEffect(() => {
    if (!difficultyMenuOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!difficultyMenu.current?.contains(event.target as Node)) setDifficultyMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setDifficultyMenuOpen(false)
      difficultyButton.current?.focus()
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [difficultyMenuOpen])

  function stop() {
    auditionRequest.current++
    stopPlayback()
    playbackRequest.current++
    playbackRef.current = null
    setPlayback(null)
    setPanelBeat(null)
    setAudioError('')
  }

  function setLoopPreference(enabled: boolean) {
    targetLoopEnabledRef.current = enabled
    setTargetLoopEnabled(enabled)
  }

  function selectDevKit(kit: DrumKit) {
    if (kit === drumKit) return
    const activePlayback = playbackRef.current
    const activePuzzle = puzzle
    const activeGrid = grid
    stop()
    setAudioDrumKit(kit)
    setDrumKit(kit)
    try {
      window.localStorage.setItem(devKitStorageKey, kit)
    } catch {
      // The temporary selector still works for this session when storage is unavailable.
    }
    if (!activePuzzle) return
    if ((activePlayback === 'targetOnce' || activePlayback === 'targetLoop') && phaseRef.current === 'memorise') {
      const loop = activePlayback === 'targetLoop'
      void startPattern(activePlayback, targetPattern(activePuzzle), loop, activePuzzle, true)
    } else if (activePlayback === 'playerLoop' && phaseRef.current === 'recreate') {
      void startPattern('playerLoop', patternFromGrid(activeGrid, activePuzzle), true, activePuzzle)
    }
  }

  function selectPulseMode(mode: PulseMode) {
    pulseModeRef.current = mode
    setPulseMode(mode)
    setPanelBeat(null)
    try {
      window.localStorage.setItem(devPulseStorageKey, mode)
    } catch {
      // The temporary selector still works for this session when storage is unavailable.
    }
  }

  function transition(next: GamePhase) {
    stop()
    if (next !== 'memorise') setLoopPreference(false)
    phaseRef.current = next
    setPhase(next)
  }

  function beginPuzzle(difficulty: Difficulty) {
    stop()
    setDifficultyMenuOpen(false)
    const next = choosePuzzle(difficulty, lastPuzzleIds.current[difficulty])
    lastPuzzleIds.current[difficulty] = next.id
    setPuzzle(next)
    setGrid(createEmptyGrid(next.steps))
    setListenCount(0)
    setLoopPreference(false)
    setResult(null)
    setPersonalBest(readPersonalBest(next.id, window.localStorage))
    setIsNewPersonalBest(false)
    phaseRef.current = 'memorise'
    setPhase('memorise')
  }

  async function startPattern(mode: Playback, pattern: AudioPattern, loop: boolean, selectedPuzzle: Puzzle, allowLoopChanges = false) {
    stop()
    const request = playbackRequest.current
    playbackRef.current = mode
    setPlayback(mode)
    try {
      const countsTarget = mode === 'targetOnce' || mode === 'targetLoop'
      await playPattern(pattern, selectedPuzzle.bpm, selectedPuzzle.steps, loop, countsTarget ? delta => {
        if (request === playbackRequest.current && phaseRef.current === 'memorise') {
          setListenCount(count => count + delta)
        }
      } : undefined, allowLoopChanges, beat => {
        if (request !== playbackRequest.current) return
        if (pulseModeRef.current === 'four-beat') setPanelBeat(beat)
        else setPanelBeat(beat === 1 ? 1 : beat === 3 ? 'half' : null)
      })
    } catch (error) {
      if (request === playbackRequest.current) {
        setAudioError(error instanceof Error ? error.message : 'Audio could not play. Please try again.')
      }
    } finally {
      if (request === playbackRequest.current) {
        playbackRef.current = null
        setPlayback(null)
        setPanelBeat(null)
      }
    }
  }

  function playTarget() {
    if (!puzzle || phaseRef.current !== 'memorise') return
    if (playbackRef.current === 'targetOnce' || playbackRef.current === 'targetLoop') return
    const loop = targetLoopEnabledRef.current
    void startPattern(loop ? 'targetLoop' : 'targetOnce', targetPattern(puzzle), loop, puzzle, true)
  }

  function toggleTargetLoop() {
    if (phaseRef.current !== 'memorise') return
    const enabled = !targetLoopEnabledRef.current
    setLoopPreference(enabled)
    if (playbackRef.current === 'targetOnce' || playbackRef.current === 'targetLoop') {
      setPatternLooping(enabled)
      const mode = enabled ? 'targetLoop' : 'targetOnce'
      playbackRef.current = mode
      setPlayback(mode)
    }
  }

  function playPlayerGrid(nextGrid: PlayerGrid = grid) {
    if (!puzzle || phaseRef.current !== 'recreate') return
    void startPattern('playerLoop', patternFromGrid(nextGrid, puzzle), true, puzzle)
  }

  async function audition(instrument: Instrument) {
    if (!puzzle || !puzzle.activeInstruments.includes(instrument)) return
    if (phaseRef.current !== 'memorise' && phaseRef.current !== 'recreate') return
    const request = ++auditionRequest.current
    try {
      await auditionInstrument(instrument)
    } catch (error) {
      if (request === auditionRequest.current && (phaseRef.current === 'memorise' || phaseRef.current === 'recreate')) {
        setAudioError(error instanceof Error ? error.message : 'That sound could not play. Please try again.')
      }
    }
  }

  function toggle(instrument: Instrument, step: number) {
    if (!puzzle || phaseRef.current !== 'recreate' || !puzzle.activeInstruments.includes(instrument)) return
    const turningOn = !grid[instrument][step]
    const nextGrid = {
      ...grid,
      [instrument]: grid[instrument].map((active, index) => index === step ? !active : active),
    }
    const loopWasPlaying = playbackRef.current === 'playerLoop'
    setGrid(nextGrid)
    if (loopWasPlaying) playPlayerGrid(nextGrid)
    if (turningOn) void audition(instrument)
  }

  function resetGrid() {
    if (!puzzle || phaseRef.current !== 'recreate') return
    stop()
    setGrid(createEmptyGrid(puzzle.steps))
  }

  function reveal() {
    if (phaseRef.current !== 'recreate' || !puzzle) return
    const nextResult = scoreGrid(grid, puzzle)
    const record = updatePersonalBest(puzzle.id, listenCount, nextResult.percentage, window.localStorage)
    setResult(nextResult)
    setPersonalBest(record.best)
    setIsNewPersonalBest(record.isNew)
    void import('./backend/resultsService')
      .then(service => service.saveAttempt({
        puzzleId: puzzle.id,
        difficulty: puzzle.difficulty,
        accuracy: nextResult.percentage,
        targetListens: listenCount,
        isPerfect: nextResult.percentage === 100,
      }))
      .catch(error => console.warn('BeatGrid could not load remote persistence.', error))
    transition('reveal')
  }

  function returnToDifficulties() {
    stop()
    setPuzzle(null)
    setGrid(createEmptyGrid(16))
    setListenCount(0)
    setLoopPreference(false)
    setResult(null)
    setPersonalBest(null)
    setIsNewPersonalBest(false)
    setDifficultyMenuOpen(false)
    phaseRef.current = 'select'
    setPhase('select')
  }

  if (phase === 'select' || !puzzle) {
    return <main>
      <header className="page-header">
        <Brand />
        <span className="badge">PUZZLE LAB</span>
      </header>
      <section className="intro difficulty-intro">
        <p className="eyebrow">CHOOSE YOUR CHALLENGE</p>
        <h1>Select difficulty</h1>
      </section>
      <section className="difficulty-picker" aria-label="Difficulty">
        <div className="difficulty-options">
          {difficulties.map(difficulty => <button key={difficulty} className={'difficulty-card difficulty-' + difficulty} onClick={() => beginPuzzle(difficulty)}>
            <span className="difficulty-name">{difficultyCopy[difficulty]}</span>
          </button>)}
        </div>
      </section>
      <DevTools drumKit={drumKit} onKitSelect={selectDevKit} pulseMode={pulseMode} onPulseSelect={selectPulseMode} />
      <footer>MEMORISE. RECREATE. COMPARE.</footer>
    </main>
  }

  const steps = Array.from({ length: puzzle.steps }, (_, index) => index)
  const memorising = phase === 'memorise'
  const recreating = phase === 'recreate'
  const revealed = phase === 'reveal'
  const audioNote = playback === 'targetLoop' ? 'Target looping. Every completed bar counts as a listen.'
    : playback === 'targetOnce' ? 'Playing the target once…'
    : playback === 'playerLoop' ? 'Your beat is looping. Grid edits restart it with the updated pattern.'
    : 'Speaker buttons and new cells audition one sound without stopping your loop.'
  const heading = memorising ? 'Let the beat sink in.' : recreating ? 'Make it from memory.' : 'Your round, revealed.'

  return <main>
    <header className="page-header">
      <Brand />
      <div className="round-meta" ref={difficultyMenu}>
        <button ref={difficultyButton} type="button" className={'difficulty-chip difficulty-trigger ' + puzzle.difficulty}
          aria-haspopup="menu" aria-expanded={difficultyMenuOpen} onClick={() => setDifficultyMenuOpen(open => !open)}>
          <span>{difficultyCopy[puzzle.difficulty]}</span><ChevronIcon />
        </button>
        {difficultyMenuOpen && <div className="difficulty-menu" role="menu" aria-label="Choose difficulty">
          {difficulties.map(difficulty => <button key={difficulty} type="button" role="menuitemradio"
            aria-checked={difficulty === puzzle.difficulty} className={difficulty === puzzle.difficulty ? 'selected' : ''}
            onClick={() => difficulty === puzzle.difficulty ? setDifficultyMenuOpen(false) : beginPuzzle(difficulty)}>
            <span>{difficultyCopy[difficulty]}</span><span className={'difficulty-dot ' + difficulty} aria-hidden="true" />
          </button>)}
        </div>}
      </div>
    </header>
    <section className="intro">
      <p className="eyebrow">A LITTLE RHYTHM. A LITTLE PUZZLE.</p>
      <h1 ref={phaseHeading} tabIndex={-1}>{heading}</h1>
    </section>
    <section className={'game phase-' + phase + ' rows-' + puzzle.activeInstruments.length + (panelBeat ? ' panel-beat-' + panelBeat : '')} aria-label="BeatGrid puzzle">
      <div className="game-heading">
        <div><p className="eyebrow">{phaseLabels[phase]}</p><h2>{revealed ? 'Your rhythm results' : memorising ? 'Listen. Learn the sounds. Remember.' : 'Your memory. Your pattern.'}</h2></div>
        <div className="tempo"><strong>{puzzle.bpm}</strong> BPM <span> / </span> 1 BAR</div>
      </div>
      <p className="listen-count" aria-live="polite">Target listens: <strong>{listenCount}</strong> <span>·</span> Difficulty: <strong>{difficultyCopy[puzzle.difficulty]}</strong></p>

      {result && <div className="round-results" aria-label="Round results" aria-live="polite">
        <div className="accuracy"><span>Rhythm accuracy</span><strong>{result.percentage.toFixed(1)}%</strong><small>{result.correct} correct · {result.missed} missed · {result.extra} extra</small></div>
        <div><span>Target listens</span><strong>{listenCount}</strong></div>
        <div className={'personal-best' + (isNewPersonalBest ? ' new-record' : '')}><span>Personal best</span><strong>{personalBest === null ? '—' : listenLabel(personalBest)}</strong>{isNewPersonalBest && <small>New best</small>}</div>
        <div><span>Difficulty</span><strong className="result-difficulty">{difficultyCopy[puzzle.difficulty]}</strong></div>
      </div>}

      <div className="grid-scroll">
        <div className={'sequencer ' + (revealed ? 'revealed' : '')}>
          <div className="grid-line step-labels" aria-hidden="true"><span />{steps.map(step => <span key={step} className={step === 0 ? 'downbeat-label' : step % 4 === 0 ? 'beat-start' : ''}>{step + 1}</span>)}</div>
          {puzzle.activeInstruments.map(instrument => <div key={instrument} className={'grid-line instrument-row ' + instrument} role="group" aria-label={labels[instrument]}>
            <div className="row-label">
              {(memorising || recreating) && <button className="audition" aria-label={'Hear ' + labels[instrument]} onClick={() => void audition(instrument)}><SpeakerIcon /></button>}
              <span>{labels[instrument]}</span>
            </div>
            {steps.map(step => {
              const outcome = revealed ? cellOutcome(grid[instrument][step], puzzleHits(puzzle, instrument).includes(step)) : null
              return <button key={step} type="button" disabled={!recreating}
                className={'cell ' + (step > 0 && step % 4 === 0 ? 'beat-divider ' : '') + (outcome ? 'outcome-' + outcome : grid[instrument][step] ? 'active' : '')}
                aria-label={labels[instrument] + ', step ' + (step + 1) + (outcome ? ': ' + outcomeLabels[outcome] : '')}
                aria-pressed={grid[instrument][step]} onClick={() => toggle(instrument, step)}
              ><span aria-hidden="true">{outcome ? outcomeSymbols[outcome] : grid[instrument][step] ? '●' : ''}</span></button>
            })}
          </div>)}
        </div>
      </div>
      {revealed && <div className="grid-legend"><span className="legend-correct">● Correct</span><span className="legend-missed">○ Missed</span><span className="legend-extra">× Extra</span></div>}

      {(memorising || recreating) && <>
        <div className={'controls ' + (memorising ? 'memorise-controls' : 'recreate-controls')}>
          {memorising ? <>
            <div className="audio-controls">
              <button className="primary-listen" data-playing={playback === 'targetOnce' || playback === 'targetLoop'} onClick={playTarget}><PlayIcon /><span>{playback === 'targetLoop' ? 'Looping…' : playback === 'targetOnce' ? 'Listening…' : 'Listen'}</span></button>
              <button className="loop-toggle" aria-pressed={targetLoopEnabled} onClick={toggleTargetLoop}><LoopIcon /><span>Loop Target</span><strong>{targetLoopEnabled ? 'ON' : 'OFF'}</strong></button>
            </div>
            <button className="ready-action" disabled={listenCount < 1} title={listenCount < 1 ? 'Complete one target listen first' : undefined} onClick={() => { if (phaseRef.current === 'memorise') transition('recreate') }}><span>Start Recreating</span><ArrowIcon /></button>
          </> : <>
            <button className="playback-button" aria-pressed={playback === 'playerLoop'} onClick={() => playbackRef.current === 'playerLoop' ? stop() : playPlayerGrid()}>{playback === 'playerLoop' ? <StopIcon /> : <PlayIcon />}<span>{playback === 'playerLoop' ? 'Stop My Beat' : 'Play My Beat'}</span></button>
            <div className="action-controls"><button className="reset" onClick={resetGrid}>Reset</button><button className="check" onClick={reveal}><span>Submit Beat</span><ArrowIcon /></button></div>
          </>}
        </div>
        <p className="sr-only" role="status">{audioNote}</p>
      </>}
      {audioError && <p className="audio-error" role="alert">{audioError}</p>}

      {revealed && <div className="next-actions">
          <button onClick={returnToDifficulties}>Change Difficulty</button>
          <button className="check" onClick={() => beginPuzzle(puzzle.difficulty)}><span>Another {difficultyCopy[puzzle.difficulty]} Puzzle</span><ArrowIcon /></button>
      </div>}
    </section>
    <DevTools drumKit={drumKit} onKitSelect={selectDevKit} pulseMode={pulseMode} onPulseSelect={selectPulseMode} />
    <footer>MEMORISE. RECREATE. COMPARE.</footer>
  </main>
}
